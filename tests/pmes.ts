import * as anchor from "@anchor-lang/core";
import { Program, BN } from "@anchor-lang/core";
import {
  getAssociatedTokenAddressSync,
  getAccount,
  createTransferInstruction,
} from "@solana/spl-token";
import { assert } from "chai";
import { NiaraPmesSolana } from "../target/types/niara_pmes_solana";

const { PublicKey, Keypair, LAMPORTS_PER_SOL, Transaction } = anchor.web3;
type PK = anchor.web3.PublicKey;

const MBRL = 1_000_000; // 6 casas
const mbrl = (n: number) => new BN(n).mul(new BN(MBRL));
const BPF_UPGRADEABLE = new PublicKey(
  "BPFLoaderUpgradeab1e11111111111111111111111"
);

describe("niara-pmes (Solana)", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const program = anchor.workspace.niaraPmesSolana as Program<NiaraPmesSolana>;
  const conn = provider.connection;
  const admin = provider.wallet as anchor.Wallet;
  const protocolo = Keypair.generate();

  const pda = (...seeds: (Buffer | Uint8Array)[]) =>
    PublicKey.findProgramAddressSync(seeds, program.programId)[0];
  const configPda = pda(Buffer.from("config"));
  const mintMoeda = pda(Buffer.from("mbrl"));
  const emissorPda = (w: PK) => pda(Buffer.from("emissor"), w.toBuffer());
  const ofertaPda = (w: PK, i: number) => {
    const idx = Buffer.alloc(4);
    idx.writeUInt32LE(i);
    return pda(Buffer.from("oferta"), w.toBuffer(), idx);
  };
  const posicaoPda = (o: PK, inv: PK) =>
    pda(Buffer.from("posicao"), o.toBuffer(), inv.toBuffer());
  const ata = (mint: PK, dono: PK) =>
    getAssociatedTokenAddressSync(mint, dono, true);
  const saldo = async (conta: PK) =>
    Number((await getAccount(conn, conta)).amount);

  async function carteira(sol = 2) {
    const kp = Keypair.generate();
    const sig = await conn.requestAirdrop(kp.publicKey, sol * LAMPORTS_PER_SOL);
    await conn.confirmTransaction(sig, "confirmed");
    return kp;
  }

  async function esperaErro(promessa: Promise<unknown>, trecho: string) {
    try {
      await promessa;
    } catch (e) {
      const texto = String(e) + JSON.stringify((e as any).logs ?? []);
      assert.include(texto, trecho, texto.slice(0, 1500));
      return;
    }
    assert.fail(`deveria ter falhado com ${trecho}`);
  }

  const dormir = (ms: number) => new Promise((r) => setTimeout(r, ms));
  const agora = async () => {
    const slot = await conn.getSlot("confirmed");
    return (await conn.getBlockTime(slot))!;
  };

  async function faucet(kp: anchor.web3.Keypair, valor: BN) {
    await program.methods
      .faucetMbrl(valor)
      .accountsPartial({ usuario: kp.publicKey, mintMoeda })
      .signers([kp])
      .rpc();
  }

  function parametros(over: Partial<Record<string, any>> = {}, prazo = 0) {
    return {
      nome: "Cotas Padaria Silva",
      simbolo: "PSILVA",
      empresa: "Padaria Silva (demonstracao)",
      cnpjRef: Array(32).fill(7),
      serie: "Serie A",
      metaMinima: mbrl(1000),
      metaMaxima: mbrl(1200),
      precoPorCota: mbrl(10),
      prazo: new BN(prazo),
      ...over,
    };
  }

  async function criarOferta(emissor: anchor.web3.Keypair, p: any) {
    const conta = await program.account.emissor.fetchNullable(
      emissorPda(emissor.publicKey)
    );
    const oferta = ofertaPda(emissor.publicKey, conta?.totalOfertas ?? 0);
    await program.methods
      .criarOferta(p)
      .accountsPartial({ emissorWallet: emissor.publicKey, oferta, mintMoeda })
      .signers([emissor])
      .rpc();
    return oferta;
  }

  async function aportar(inv: anchor.web3.Keypair, oferta: PK, valor: BN) {
    const o = await program.account.oferta.fetch(oferta);
    await program.methods
      .aportar(valor)
      .accountsPartial({
        investidor: inv.publicKey,
        oferta,
        origem: ata(mintMoeda, inv.publicKey),
        cofre: o.cofre,
        mintMoeda,
      })
      .signers([inv])
      .rpc();
  }

  async function encerrar(oferta: PK) {
    await program.methods.encerrar().accountsPartial({ oferta }).rpc();
  }

  let emissor: anchor.web3.Keypair;

  // ── inicialização ──────────────────────────────────────────────────────────
  it("só a autoridade de upgrade inicializa; taxa limitada a 1%", async () => {
    const dadosPrograma = PublicKey.findProgramAddressSync(
      [program.programId.toBuffer()],
      BPF_UPGRADEABLE
    )[0];
    const intruso = await carteira();
    await esperaErro(
      program.methods
        .inicializar(protocolo.publicKey, 100, mbrl(200))
        .accountsPartial({ admin: intruso.publicKey, dadosPrograma })
        .signers([intruso])
        .rpc(),
      "NaoAutorizado"
    );
    await esperaErro(
      program.methods
        .inicializar(protocolo.publicKey, 101, mbrl(200))
        .accountsPartial({ admin: admin.publicKey, dadosPrograma })
        .rpc(),
      "TaxaAcimaDoMaximo"
    );
    await program.methods
      .inicializar(protocolo.publicKey, 100, mbrl(200))
      .accountsPartial({ admin: admin.publicKey, dadosPrograma })
      .rpc();
    const c = await program.account.config.fetch(configPda);
    assert.isTrue(c.admin.equals(admin.publicKey));
    assert.isTrue(c.mintMoeda.equals(mintMoeda));
    assert.equal(c.taxaBps, 100);
    assert.equal(c.tetoPorInvestidor.toString(), mbrl(200).toString());
  });

  it("faucet de mBRL aberto, com teto por chamada", async () => {
    const u = await carteira();
    await faucet(u, mbrl(500));
    assert.equal(await saldo(ata(mintMoeda, u.publicKey)), 500 * MBRL);
    await esperaErro(faucet(u, new BN(0)), "FaucetInvalido");
    await esperaErro(faucet(u, mbrl(1_000_001)), "FaucetInvalido");
  });

  // ── criação ────────────────────────────────────────────────────────────────
  it("criar oferta exige emissor autorizado e aplica os limites da Res. CVM 88", async () => {
    emissor = await carteira(5);
    const t = await agora();
    // sem autorização (conta Emissor nem existe)
    await esperaErro(
      criarOferta(emissor, parametros({}, t + 3600)),
      "AccountNotInitialized"
    );

    await program.methods
      .definirEmissor(emissor.publicKey, false)
      .accountsPartial({ admin: admin.publicKey })
      .rpc();
    await esperaErro(
      criarOferta(emissor, parametros({}, t + 3600)),
      "EmissorNaoAutorizado"
    );

    const intruso = await carteira();
    await esperaErro(
      program.methods
        .definirEmissor(intruso.publicKey, true)
        .accountsPartial({ admin: intruso.publicKey })
        .signers([intruso])
        .rpc(),
      "NaoAutorizado"
    );
    await program.methods
      .definirEmissor(emissor.publicKey, true)
      .accountsPartial({ admin: admin.publicKey })
      .rpc();

    const casos: [any, string][] = [
      [parametros({}, t + 181 * 86400), "PrazoExcedeLimite"],
      [parametros({}, t - 10), "PrazoExcedeLimite"],
      [parametros({ precoPorCota: new BN(0) }, t + 3600), "PrecoInvalido"],
      [parametros({ metaMinima: mbrl(1300) }, t + 3600), "MetasInvalidas"],
      [parametros({ metaMinima: new BN(0) }, t + 3600), "MetasInvalidas"],
      [
        parametros(
          { metaMinima: mbrl(14_000_000), metaMaxima: mbrl(15_000_010) },
          t + 3600
        ),
        "MetaMaximaExcedeTeto",
      ],
      [
        parametros({ metaMaxima: mbrl(1260) }, t + 3600),
        "LoteAdicionalExcedeLimite",
      ],
      [
        parametros({ precoPorCota: mbrl(7) }, t + 3600),
        "PrecoNaoDivideMetaMaxima",
      ],
      [parametros({ simbolo: "SIMBOLOLONGO" }, t + 3600), "MetadadosInvalidos"],
      [parametros({ empresa: "   " }, t + 3600), "MetadadosInvalidos"],
    ];
    for (const [p, erro] of casos)
      await esperaErro(criarOferta(emissor, p), erro);
  });

  // ── caminho de sucesso ─────────────────────────────────────────────────────
  let ofertaSucesso: PK;
  let inv1: anchor.web3.Keypair;
  let inv2: anchor.web3.Keypair;

  it("cria a oferta com escrow, mint de cotas e parâmetros congelados", async () => {
    const t = await agora();
    ofertaSucesso = await criarOferta(emissor, parametros({}, t + 3600));
    const o = await program.account.oferta.fetch(ofertaSucesso);
    assert.deepEqual(o.estado, { aberta: {} });
    assert.equal(o.indice, 0);
    assert.equal(o.taxaBps, 100);
    assert.equal(o.tetoPorInvestidor.toString(), mbrl(200).toString());
    assert.isTrue(o.protocoloWallet.equals(protocolo.publicKey));
    assert.equal(o.empresa, "Padaria Silva (demonstracao)");
    const e = await program.account.emissor.fetch(
      emissorPda(emissor.publicKey)
    );
    assert.isTrue(e.ofertaAberta!.equals(ofertaSucesso));
    assert.equal(e.totalOfertas, 1);

    // uma oferta aberta por emissor
    await esperaErro(
      criarOferta(emissor, parametros({}, t + 3600)),
      "OfertaAnteriorAindaAberta"
    );
  });

  it("aporte: múltiplo do preço, teto do varejo, qualificado sem teto, meta máxima", async () => {
    inv1 = await carteira();
    inv2 = await carteira();
    await faucet(inv1, mbrl(5000));
    await faucet(inv2, mbrl(5000));

    await esperaErro(
      aportar(inv1, ofertaSucesso, mbrl(15)),
      "AporteNaoMultiploDoPreco"
    );
    await esperaErro(
      aportar(inv1, ofertaSucesso, new BN(0)),
      "AporteNaoMultiploDoPreco"
    );
    await aportar(inv1, ofertaSucesso, mbrl(150));
    await aportar(inv1, ofertaSucesso, mbrl(50)); // chega no teto de 200
    await esperaErro(
      aportar(inv1, ofertaSucesso, mbrl(10)),
      "ExcedeTetoInvestidor"
    );

    await program.methods
      .definirQualificado(inv2.publicKey, true)
      .accountsPartial({ admin: admin.publicKey })
      .rpc();
    await aportar(inv2, ofertaSucesso, mbrl(900)); // qualificado: sem teto
    await esperaErro(
      aportar(inv2, ofertaSucesso, mbrl(110)),
      "ExcedeMetaMaxima"
    );

    const o = await program.account.oferta.fetch(ofertaSucesso);
    assert.equal(o.totalArrecadado.toString(), mbrl(1100).toString());
    assert.equal(o.totalInvestidores, 2);
    assert.equal(await saldo(o.cofre), 1100 * MBRL);
    const p1 = await program.account.posicao.fetch(
      posicaoPda(ofertaSucesso, inv1.publicKey)
    );
    assert.equal(p1.aportado.toString(), mbrl(200).toString());
  });

  it("pausa do admin bloqueia aporte; encerrar antes do prazo exige meta máxima", async () => {
    await program.methods
      .pausarOferta(true)
      .accountsPartial({ admin: admin.publicKey, oferta: ofertaSucesso })
      .rpc();
    await esperaErro(aportar(inv2, ofertaSucesso, mbrl(100)), "OfertaPausada");
    await program.methods
      .pausarOferta(false)
      .accountsPartial({ admin: admin.publicKey, oferta: ofertaSucesso })
      .rpc();

    await esperaErro(encerrar(ofertaSucesso), "EncerramentoPrematuro");
    await aportar(inv2, ofertaSucesso, mbrl(100)); // fecha exatamente na meta máxima
    await encerrar(ofertaSucesso);
    const o = await program.account.oferta.fetch(ofertaSucesso);
    assert.deepEqual(o.estado, { encerradaSucesso: {} });
    const e = await program.account.emissor.fetch(
      emissorPda(emissor.publicKey)
    );
    assert.isNull(e.ofertaAberta);
    await esperaErro(encerrar(ofertaSucesso), "OfertaNaoAberta");
    await esperaErro(aportar(inv2, ofertaSucesso, mbrl(10)), "OfertaNaoAberta");
  });

  it("resgate: cotas = aportado / preço, uma vez, e intransferíveis", async () => {
    const o = await program.account.oferta.fetch(ofertaSucesso);
    const resgatar = (inv: anchor.web3.Keypair) =>
      program.methods
        .resgatarCotas()
        .accountsPartial({
          investidor: inv.publicKey,
          oferta: ofertaSucesso,
          mintCota: o.mintCota,
        })
        .signers([inv])
        .rpc();
    await resgatar(inv1);
    await resgatar(inv2);
    const contaCotas1 = ata(o.mintCota, inv1.publicKey);
    assert.equal(await saldo(contaCotas1), 20);
    assert.equal(await saldo(ata(o.mintCota, inv2.publicKey)), 100);
    assert.isTrue((await getAccount(conn, contaCotas1)).isFrozen);
    await esperaErro(resgatar(inv1), "CotasJaResgatadas");

    // transferência direta pelo SPL Token falha: conta congelada
    const destino = ata(o.mintCota, inv2.publicKey);
    const tx = new Transaction().add(
      createTransferInstruction(contaCotas1, destino, inv1.publicKey, 1)
    );
    await esperaErro(provider.sendAndConfirm(tx, [inv1]), "0x11"); // AccountFrozen

    // quem não aportou não resgata
    const curioso = await carteira();
    await esperaErro(
      program.methods
        .resgatarCotas()
        .accountsPartial({
          investidor: curioso.publicKey,
          oferta: ofertaSucesso,
          mintCota: o.mintCota,
        })
        .signers([curioso])
        .rpc(),
      "AccountNotInitialized"
    );
  });

  it("liberação: emissor recebe total − 1%, protocolo recebe a taxa, uma vez só", async () => {
    const o = await program.account.oferta.fetch(ofertaSucesso);
    const liberar = () =>
      program.methods
        .liberarParaEmissor()
        .accountsPartial({
          pagador: admin.publicKey,
          oferta: ofertaSucesso,
          cofre: o.cofre,
          mintMoeda,
          emissorWallet: emissor.publicKey,
          protocoloWallet: protocolo.publicKey,
        })
        .rpc();
    await liberar();
    assert.equal(await saldo(ata(mintMoeda, emissor.publicKey)), 1188 * MBRL);
    assert.equal(await saldo(ata(mintMoeda, protocolo.publicKey)), 12 * MBRL);
    assert.equal(await saldo(o.cofre), 0);
    await esperaErro(liberar(), "RecursosJaLiberados");
    assert.isTrue(
      (await program.account.oferta.fetch(ofertaSucesso)).recursosLiberados
    );
  });

  it("sucesso não permite reembolso", async () => {
    const o = await program.account.oferta.fetch(ofertaSucesso);
    await esperaErro(
      program.methods
        .reembolsar()
        .accountsPartial({
          investidor: inv1.publicKey,
          oferta: ofertaSucesso,
          cofre: o.cofre,
          mintMoeda,
        })
        .signers([inv1])
        .rpc(),
      "OfertaNaoFalhou"
    );
  });

  // ── caminho de falha ───────────────────────────────────────────────────────
  it("abaixo da meta mínima no prazo: falha, aporte após o prazo é recusado, reembolso exato", async () => {
    const t = await agora();
    const oferta = await criarOferta(
      emissor,
      parametros({ serie: "Serie B" }, t + 6)
    );
    assert.isTrue(oferta.equals(ofertaPda(emissor.publicKey, 1)));
    await aportar(inv1, oferta, mbrl(100));
    await esperaErro(encerrar(oferta), "EncerramentoPrematuro");

    await dormir(8000);
    await esperaErro(aportar(inv1, oferta, mbrl(10)), "PrazoExpirado");
    await encerrar(oferta);
    const o = await program.account.oferta.fetch(oferta);
    assert.deepEqual(o.estado, { encerradaFalha: {} });

    const antes = await saldo(ata(mintMoeda, inv1.publicKey));
    const reembolsar = () =>
      program.methods
        .reembolsar()
        .accountsPartial({
          investidor: inv1.publicKey,
          oferta,
          cofre: o.cofre,
          mintMoeda,
        })
        .signers([inv1])
        .rpc();
    await reembolsar();
    assert.equal(
      (await saldo(ata(mintMoeda, inv1.publicKey))) - antes,
      100 * MBRL
    );
    await esperaErro(reembolsar(), "JaReembolsado");
    await esperaErro(
      program.methods
        .resgatarCotas()
        .accountsPartial({
          investidor: inv1.publicKey,
          oferta,
          mintCota: o.mintCota,
        })
        .signers([inv1])
        .rpc(),
      "OfertaNaoSucedida"
    );
    await esperaErro(
      program.methods
        .liberarParaEmissor()
        .accountsPartial({
          pagador: admin.publicKey,
          oferta,
          cofre: o.cofre,
          mintMoeda,
          emissorWallet: emissor.publicKey,
          protocoloWallet: protocolo.publicKey,
        })
        .rpc(),
      "OfertaNaoSucedida"
    );
  });

  it("cancelamento só pelo admin, mesmo acima do piso, e libera nova oferta do emissor", async () => {
    const t = await agora();
    const oferta = await criarOferta(
      emissor,
      parametros({ serie: "Serie C" }, t + 3600)
    );
    await aportar(inv2, oferta, mbrl(1000)); // acima da meta mínima

    const intruso = await carteira();
    await esperaErro(
      program.methods
        .cancelarOferta()
        .accountsPartial({ admin: intruso.publicKey, oferta })
        .signers([intruso])
        .rpc(),
      "NaoAutorizado"
    );
    await program.methods
      .cancelarOferta()
      .accountsPartial({ admin: admin.publicKey, oferta })
      .rpc();
    const o = await program.account.oferta.fetch(oferta);
    assert.deepEqual(o.estado, { encerradaFalha: {} });

    await program.methods
      .reembolsar()
      .accountsPartial({
        investidor: inv2.publicKey,
        oferta,
        cofre: o.cofre,
        mintMoeda,
      })
      .signers([inv2])
      .rpc();
    assert.equal(await saldo(o.cofre), 0);

    const e = await program.account.emissor.fetch(
      emissorPda(emissor.publicKey)
    );
    assert.isNull(e.ofertaAberta);
    assert.equal(e.totalOfertas, 3);
  });

  it("aporte não aceita conta de origem de outra pessoa nem cofre de outra oferta", async () => {
    const t = await agora();
    const oferta = await criarOferta(
      emissor,
      parametros({ serie: "Serie D" }, t + 3600)
    );
    const o = await program.account.oferta.fetch(oferta);
    const outra = await program.account.oferta.fetch(ofertaSucesso);
    await esperaErro(
      program.methods
        .aportar(mbrl(10))
        .accountsPartial({
          investidor: inv1.publicKey,
          oferta,
          origem: ata(mintMoeda, inv2.publicKey),
          cofre: o.cofre,
          mintMoeda,
        })
        .signers([inv1])
        .rpc(),
      "ConstraintTokenOwner"
    );
    await esperaErro(
      program.methods
        .aportar(mbrl(10))
        .accountsPartial({
          investidor: inv1.publicKey,
          oferta,
          origem: ata(mintMoeda, inv1.publicKey),
          cofre: outra.cofre,
          mintMoeda,
        })
        .signers([inv1])
        .rpc(),
      "ConstraintAddress"
    );
  });
});
