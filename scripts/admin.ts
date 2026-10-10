/**
 * Administração do niara-pmes-solana pela linha de comando (carteira do admin =
 * autoridade de upgrade do programa).
 *
 *   ANCHOR_PROVIDER_URL=https://api.devnet.solana.com \
 *   ANCHOR_WALLET=~/.config/solana/niara-deployer.json \
 *   npx ts-node -P tsconfig.json scripts/admin.ts <comando> [args]
 *
 * Comandos:
 *   setup [protocoloWallet]   inicializa (taxa 1%, teto 20.000 mBRL) — idempotente
 *   autorizar <wallet>        autoriza uma carteira como emissora
 *   desautorizar <wallet>
 *   qualificar <wallet>       investidor qualificado (sem teto por investidor)
 *   desqualificar <wallet>
 *   demo                      cria as ofertas de demonstração (empresas fictícias)
 *   pausar <oferta> | despausar <oferta> | cancelar <oferta>
 *   listar                    lista as ofertas do programa
 */
import * as anchor from "@anchor-lang/core";
import { BN, Program } from "@anchor-lang/core";
import { createHash } from "crypto";
import * as fs from "fs";
import * as path from "path";
import { NiaraPmesSolana } from "../idl/niara_pmes_solana";

const { PublicKey, Keypair, SystemProgram, Transaction, LAMPORTS_PER_SOL } =
  anchor.web3;
type PK = anchor.web3.PublicKey;

const provider = anchor.AnchorProvider.env();
anchor.setProvider(provider);
const idl = JSON.parse(
  fs.readFileSync(path.join(__dirname, "../idl/niara_pmes_solana.json"), "utf8")
);
const program = new Program<NiaraPmesSolana>(idl, provider);
const admin = provider.wallet.publicKey;

const MBRL = new BN(1_000_000);
const mbrl = (n: number) => new BN(n).mul(MBRL);
const BPF_UPGRADEABLE = new PublicKey(
  "BPFLoaderUpgradeab1e11111111111111111111111"
);

const pda = (...seeds: Buffer[]) =>
  PublicKey.findProgramAddressSync(seeds, program.programId)[0];
const configPda = pda(Buffer.from("config"));
const mintMoeda = pda(Buffer.from("mbrl"));
const emissorPda = (w: PK) => pda(Buffer.from("emissor"), w.toBuffer());
const ofertaPda = (w: PK, i: number) => {
  const idx = Buffer.alloc(4);
  idx.writeUInt32LE(i);
  return pda(Buffer.from("oferta"), w.toBuffer(), idx);
};

/**
 * Empresas FICTÍCIAS de demonstração (mesma regra do site: nenhuma empresa,
 * CNPJ ou valor é real). Metas pequenas para dar para demonstrar o ciclo
 * inteiro com o faucet: 100 mBRL de mínima, 120 de máxima, 10 por cota.
 */
const DEMOS = [
  {
    slug: "mercearia-ponto-verde",
    empresa: "Mercearia Ponto Verde (fictícia)",
    simbolo: "MPVERDE",
  },
  {
    slug: "oficina-torque",
    empresa: "Oficina Mecânica Torque (fictícia)",
    simbolo: "OTORQUE",
  },
  {
    slug: "floricultura-jardim-sul",
    empresa: "Floricultura Jardim Sul (fictícia)",
    simbolo: "FJSUL",
  },
];
const PASTA_DEMO = path.join(__dirname, "../.demo-emissores");

async function setup(protocolo?: string) {
  if (await program.account.config.fetchNullable(configPda)) {
    console.log("config já inicializada:", configPda.toBase58());
    return;
  }
  const dadosPrograma = PublicKey.findProgramAddressSync(
    [program.programId.toBuffer()],
    BPF_UPGRADEABLE
  )[0];
  const sig = await program.methods
    .inicializar(
      protocolo ? new PublicKey(protocolo) : admin,
      100,
      mbrl(20_000)
    )
    .accountsPartial({ admin, dadosPrograma })
    .rpc();
  console.log("inicializado:", sig);
  console.log(
    "config:",
    configPda.toBase58(),
    " mint mBRL:",
    mintMoeda.toBase58()
  );
}

async function definirEmissor(wallet: string, autorizado: boolean) {
  const sig = await program.methods
    .definirEmissor(new PublicKey(wallet), autorizado)
    .accountsPartial({ admin })
    .rpc();
  console.log(`${autorizado ? "autorizado" : "desautorizado"} ${wallet}:`, sig);
}

async function definirQualificado(wallet: string, qualificado: boolean) {
  const sig = await program.methods
    .definirQualificado(new PublicKey(wallet), qualificado)
    .accountsPartial({ admin })
    .rpc();
  console.log(
    `${qualificado ? "qualificado" : "desqualificado"} ${wallet}:`,
    sig
  );
}

function emissorDemo(slug: string) {
  fs.mkdirSync(PASTA_DEMO, { recursive: true });
  const arquivo = path.join(PASTA_DEMO, `${slug}.json`);
  if (fs.existsSync(arquivo)) {
    return Keypair.fromSecretKey(
      Uint8Array.from(JSON.parse(fs.readFileSync(arquivo, "utf8")))
    );
  }
  const kp = Keypair.generate();
  fs.writeFileSync(arquivo, JSON.stringify(Array.from(kp.secretKey)));
  return kp;
}

async function demo() {
  const agora = Math.floor(Date.now() / 1000);
  for (const d of DEMOS) {
    const kp = emissorDemo(d.slug);
    const saldo = await provider.connection.getBalance(kp.publicKey);
    if (saldo < 0.03 * LAMPORTS_PER_SOL) {
      const tx = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: admin,
          toPubkey: kp.publicKey,
          lamports: 0.05 * LAMPORTS_PER_SOL,
        })
      );
      await provider.sendAndConfirm(tx);
    }
    const conta = await program.account.emissor.fetchNullable(
      emissorPda(kp.publicKey)
    );
    if (!conta?.autorizado) await definirEmissor(kp.publicKey.toBase58(), true);
    const atual = await program.account.emissor.fetchNullable(
      emissorPda(kp.publicKey)
    );
    if (atual?.ofertaAberta) {
      console.log(
        `${d.empresa}: já tem oferta aberta ${atual.ofertaAberta.toBase58()}`
      );
      continue;
    }
    const oferta = ofertaPda(kp.publicKey, atual?.totalOfertas ?? 0);
    const cnpjRef = Array.from(
      createHash("sha256").update(`demo:${d.slug}`).digest()
    );
    const sig = await program.methods
      .criarOferta({
        nome: `Cotas ${d.empresa.replace(" (fictícia)", "")}`.slice(0, 64),
        simbolo: d.simbolo,
        empresa: d.empresa,
        cnpjRef,
        serie: "Serie A",
        metaMinima: mbrl(100),
        metaMaxima: mbrl(120),
        precoPorCota: mbrl(10),
        prazo: new BN(agora + 30 * 86400),
      })
      .accountsPartial({ emissorWallet: kp.publicKey, oferta, mintMoeda })
      .signers([kp])
      .rpc();
    console.log(`${d.empresa}: oferta ${oferta.toBase58()} — ${sig}`);
  }
}

async function adminOferta(
  acao: "pausar" | "despausar" | "cancelar",
  oferta: string
) {
  const o = new PublicKey(oferta);
  const m =
    acao === "cancelar"
      ? program.methods.cancelarOferta()
      : program.methods.pausarOferta(acao === "pausar");
  console.log(`${acao}:`, await m.accountsPartial({ admin, oferta: o }).rpc());
}

async function listar() {
  const ofertas = await program.account.oferta.all();
  for (const { publicKey, account: o } of ofertas) {
    const estado = Object.keys(o.estado)[0];
    console.log(
      `${publicKey.toBase58()}  ${o.empresa}  ${estado}${
        o.pausada ? " (pausada)" : ""
      }  ` +
        `${o.totalArrecadado.div(MBRL)}/${o.metaMinima.div(
          MBRL
        )}-${o.metaMaxima.div(MBRL)} mBRL  ` +
        `emissor ${o.emissor.toBase58()}`
    );
  }
  if (ofertas.length === 0) console.log("nenhuma oferta");
}

async function main() {
  const [cmd, arg] = process.argv.slice(2);
  switch (cmd) {
    case "setup":
      return setup(arg);
    case "autorizar":
      return definirEmissor(arg, true);
    case "desautorizar":
      return definirEmissor(arg, false);
    case "qualificar":
      return definirQualificado(arg, true);
    case "desqualificar":
      return definirQualificado(arg, false);
    case "demo":
      return demo();
    case "pausar":
    case "despausar":
    case "cancelar":
      return adminOferta(cmd, arg);
    case "listar":
      return listar();
    default:
      console.log(
        "uso: admin.ts setup|autorizar|desautorizar|qualificar|desqualificar|demo|pausar|despausar|cancelar|listar"
      );
      process.exit(1);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
