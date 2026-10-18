/**
 * Command-line administration of niara-pmes-solana (admin wallet = the
 * program's upgrade authority).
 *
 *   ANCHOR_PROVIDER_URL=https://api.devnet.solana.com \
 *   ANCHOR_WALLET=~/.config/solana/niara-deployer.json \
 *   npx ts-node -P tsconfig.json scripts/admin.ts <command> [args]
 *
 * Commands:
 *   setup [protocolWallet]   initializes (1% fee, 20,000 mBRL cap); idempotent
 *   authorize <wallet>       authorizes a wallet as an issuer
 *   deauthorize <wallet>
 *   qualify <wallet>         qualified investor (no per-investor cap)
 *   disqualify <wallet>
 *   demo                     creates the demo offerings (fictitious companies)
 *   pause <offering> | unpause <offering> | cancel <offering>
 *   list                     lists the program's offerings
 *
 * Program methods, account fields and seeds keep their Portuguese names
 * because they belong to the program deployed on devnet.
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
const currencyMint = pda(Buffer.from("mbrl"));
const issuerPda = (w: PK) => pda(Buffer.from("emissor"), w.toBuffer());
const offeringPda = (w: PK, i: number) => {
  const idx = Buffer.alloc(4);
  idx.writeUInt32LE(i);
  return pda(Buffer.from("oferta"), w.toBuffer(), idx);
};

/**
 * FICTITIOUS demo companies (same rule as the site: no company, CNPJ or amount
 * is real). Small targets so the whole cycle can be demonstrated with the
 * faucet: 100 mBRL minimum, 120 maximum, 10 per share. Company names and
 * symbols are on-chain display data for Brazilian users, so they stay in Portuguese.
 */
const DEMOS = [
  {
    slug: "mercearia-ponto-verde",
    company: "Mercearia Ponto Verde (fictícia)",
    symbol: "MPVERDE",
  },
  {
    slug: "oficina-torque",
    company: "Oficina Mecânica Torque (fictícia)",
    symbol: "OTORQUE",
  },
  {
    slug: "floricultura-jardim-sul",
    company: "Floricultura Jardim Sul (fictícia)",
    symbol: "FJSUL",
  },
];
// Folder name kept as is: it holds the demo issuers' existing keypairs.
const DEMO_DIR = path.join(__dirname, "../.demo-emissores");

async function setup(protocolWallet?: string) {
  if (await program.account.config.fetchNullable(configPda)) {
    console.log("config already initialized:", configPda.toBase58());
    return;
  }
  const programData = PublicKey.findProgramAddressSync(
    [program.programId.toBuffer()],
    BPF_UPGRADEABLE
  )[0];
  const sig = await program.methods
    .inicializar(
      protocolWallet ? new PublicKey(protocolWallet) : admin,
      100,
      mbrl(20_000)
    )
    .accountsPartial({ admin, dadosPrograma: programData })
    .rpc();
  console.log("initialized:", sig);
  console.log(
    "config:",
    configPda.toBase58(),
    " mint mBRL:",
    currencyMint.toBase58()
  );
}

async function setIssuer(wallet: string, authorized: boolean) {
  const sig = await program.methods
    .definirEmissor(new PublicKey(wallet), authorized)
    .accountsPartial({ admin })
    .rpc();
  console.log(`${authorized ? "authorized" : "deauthorized"} ${wallet}:`, sig);
}

async function setQualified(wallet: string, qualified: boolean) {
  const sig = await program.methods
    .definirQualificado(new PublicKey(wallet), qualified)
    .accountsPartial({ admin })
    .rpc();
  console.log(
    `${qualified ? "qualified" : "disqualified"} ${wallet}:`,
    sig
  );
}

function demoIssuer(slug: string) {
  fs.mkdirSync(DEMO_DIR, { recursive: true });
  const file = path.join(DEMO_DIR, `${slug}.json`);
  if (fs.existsSync(file)) {
    return Keypair.fromSecretKey(
      Uint8Array.from(JSON.parse(fs.readFileSync(file, "utf8")))
    );
  }
  const kp = Keypair.generate();
  fs.writeFileSync(file, JSON.stringify(Array.from(kp.secretKey)));
  return kp;
}

async function demo() {
  const now = Math.floor(Date.now() / 1000);
  for (const d of DEMOS) {
    const kp = demoIssuer(d.slug);
    const balance = await provider.connection.getBalance(kp.publicKey);
    if (balance < 0.03 * LAMPORTS_PER_SOL) {
      const tx = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: admin,
          toPubkey: kp.publicKey,
          lamports: 0.05 * LAMPORTS_PER_SOL,
        })
      );
      await provider.sendAndConfirm(tx);
    }
    const account = await program.account.emissor.fetchNullable(
      issuerPda(kp.publicKey)
    );
    if (!account?.autorizado) await setIssuer(kp.publicKey.toBase58(), true);
    const current = await program.account.emissor.fetchNullable(
      issuerPda(kp.publicKey)
    );
    if (current?.ofertaAberta) {
      console.log(
        `${d.company}: already has an open offering ${current.ofertaAberta.toBase58()}`
      );
      continue;
    }
    const offering = offeringPda(kp.publicKey, current?.totalOfertas ?? 0);
    const cnpjRef = Array.from(
      createHash("sha256").update(`demo:${d.slug}`).digest()
    );
    const sig = await program.methods
      .criarOferta({
        nome: `Cotas ${d.company.replace(" (fictícia)", "")}`.slice(0, 64),
        simbolo: d.symbol,
        empresa: d.company,
        cnpjRef,
        serie: "Serie A",
        metaMinima: mbrl(100),
        metaMaxima: mbrl(120),
        precoPorCota: mbrl(10),
        prazo: new BN(now + 30 * 86400),
      })
      .accountsPartial({
        emissorWallet: kp.publicKey,
        oferta: offering,
        mintMoeda: currencyMint,
      })
      .signers([kp])
      .rpc();
    console.log(`${d.company}: offering ${offering.toBase58()} (${sig})`);
  }
}

async function adminOffering(
  action: "pause" | "unpause" | "cancel",
  offering: string
) {
  const o = new PublicKey(offering);
  const m =
    action === "cancel"
      ? program.methods.cancelarOferta()
      : program.methods.pausarOferta(action === "pause");
  console.log(`${action}:`, await m.accountsPartial({ admin, oferta: o }).rpc());
}

async function list() {
  const offerings = await program.account.oferta.all();
  for (const { publicKey, account: o } of offerings) {
    const state = Object.keys(o.estado)[0];
    console.log(
      `${publicKey.toBase58()}  ${o.empresa}  ${state}${
        o.pausada ? " (paused)" : ""
      }  ` +
        `${o.totalArrecadado.div(MBRL)}/${o.metaMinima.div(
          MBRL
        )}-${o.metaMaxima.div(MBRL)} mBRL  ` +
        `issuer ${o.emissor.toBase58()}`
    );
  }
  if (offerings.length === 0) console.log("no offerings");
}

async function main() {
  const [cmd, arg] = process.argv.slice(2);
  switch (cmd) {
    case "setup":
      return setup(arg);
    case "authorize":
      return setIssuer(arg, true);
    case "deauthorize":
      return setIssuer(arg, false);
    case "qualify":
      return setQualified(arg, true);
    case "disqualify":
      return setQualified(arg, false);
    case "demo":
      return demo();
    case "pause":
    case "unpause":
    case "cancel":
      return adminOffering(cmd, arg);
    case "list":
      return list();
    default:
      console.log(
        "usage: admin.ts setup|authorize|deauthorize|qualify|disqualify|demo|pause|unpause|cancel|list"
      );
      process.exit(1);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
