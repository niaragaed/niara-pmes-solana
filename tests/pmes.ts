import * as anchor from "@anchor-lang/core";
import { Program, BN } from "@anchor-lang/core";
import {
  getAssociatedTokenAddressSync,
  getAccount,
  createTransferInstruction,
} from "@solana/spl-token";
import { assert } from "chai";
import { NiaraPmesSolana } from "../target/types/niara_pmes_solana";

// Program methods, account names, fields, seeds and error names stay in
// Portuguese: they belong to the program deployed on devnet (see lib.rs).

const { PublicKey, Keypair, LAMPORTS_PER_SOL, Transaction } = anchor.web3;
type PK = anchor.web3.PublicKey;

const MBRL = 1_000_000; // 6 decimals
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
  const protocol = Keypair.generate();

  const pda = (...seeds: (Buffer | Uint8Array)[]) =>
    PublicKey.findProgramAddressSync(seeds, program.programId)[0];
  const configPda = pda(Buffer.from("config"));
  const currencyMint = pda(Buffer.from("mbrl"));
  const issuerPda = (w: PK) => pda(Buffer.from("emissor"), w.toBuffer());
  const offeringPda = (w: PK, i: number) => {
    const idx = Buffer.alloc(4);
    idx.writeUInt32LE(i);
    return pda(Buffer.from("oferta"), w.toBuffer(), idx);
  };
  const positionPda = (o: PK, inv: PK) =>
    pda(Buffer.from("posicao"), o.toBuffer(), inv.toBuffer());
  const ata = (mint: PK, owner: PK) =>
    getAssociatedTokenAddressSync(mint, owner, true);
  const balance = async (account: PK) =>
    Number((await getAccount(conn, account)).amount);

  async function wallet(sol = 2) {
    const kp = Keypair.generate();
    const sig = await conn.requestAirdrop(kp.publicKey, sol * LAMPORTS_PER_SOL);
    await conn.confirmTransaction(sig, "confirmed");
    return kp;
  }

  async function expectError(promise: Promise<unknown>, fragment: string) {
    try {
      await promise;
    } catch (e) {
      const text = String(e) + JSON.stringify((e as any).logs ?? []);
      assert.include(text, fragment, text.slice(0, 1500));
      return;
    }
    assert.fail(`should have failed with ${fragment}`);
  }

  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
  const now = async () => {
    const slot = await conn.getSlot("confirmed");
    return (await conn.getBlockTime(slot))!;
  };

  async function faucet(kp: anchor.web3.Keypair, amount: BN) {
    await program.methods
      .faucetMbrl(amount)
      .accountsPartial({ usuario: kp.publicKey, mintMoeda: currencyMint })
      .signers([kp])
      .rpc();
  }

  // Offering parameters (the field names are the program's own).
  function params(over: Partial<Record<string, any>> = {}, deadline = 0) {
    return {
      nome: "Cotas Padaria Silva",
      simbolo: "PSILVA",
      empresa: "Padaria Silva (demonstracao)",
      cnpjRef: Array(32).fill(7),
      serie: "Serie A",
      metaMinima: mbrl(1000),
      metaMaxima: mbrl(1200),
      precoPorCota: mbrl(10),
      prazo: new BN(deadline),
      ...over,
    };
  }

  async function createOffering(issuer: anchor.web3.Keypair, p: any) {
    const account = await program.account.emissor.fetchNullable(
      issuerPda(issuer.publicKey)
    );
    const offering = offeringPda(issuer.publicKey, account?.totalOfertas ?? 0);
    await program.methods
      .criarOferta(p)
      .accountsPartial({
        emissorWallet: issuer.publicKey,
        oferta: offering,
        mintMoeda: currencyMint,
      })
      .signers([issuer])
      .rpc();
    return offering;
  }

  async function invest(inv: anchor.web3.Keypair, offering: PK, amount: BN) {
    const o = await program.account.oferta.fetch(offering);
    await program.methods
      .aportar(amount)
      .accountsPartial({
        investidor: inv.publicKey,
        oferta: offering,
        origem: ata(currencyMint, inv.publicKey),
        cofre: o.cofre,
        mintMoeda: currencyMint,
      })
      .signers([inv])
      .rpc();
  }

  async function close(offering: PK) {
    await program.methods.encerrar().accountsPartial({ oferta: offering }).rpc();
  }

  let issuer: anchor.web3.Keypair;

  // ── initialization ─────────────────────────────────────────────────────────
  it("only the upgrade authority can initialize; fee capped at 1%", async () => {
    const programData = PublicKey.findProgramAddressSync(
      [program.programId.toBuffer()],
      BPF_UPGRADEABLE
    )[0];
    const intruder = await wallet();
    await expectError(
      program.methods
        .inicializar(protocol.publicKey, 100, mbrl(200))
        .accountsPartial({ admin: intruder.publicKey, dadosPrograma: programData })
        .signers([intruder])
        .rpc(),
      "NaoAutorizado"
    );
    await expectError(
      program.methods
        .inicializar(protocol.publicKey, 101, mbrl(200))
        .accountsPartial({ admin: admin.publicKey, dadosPrograma: programData })
        .rpc(),
      "TaxaAcimaDoMaximo"
    );
    await program.methods
      .inicializar(protocol.publicKey, 100, mbrl(200))
      .accountsPartial({ admin: admin.publicKey, dadosPrograma: programData })
      .rpc();
    const c = await program.account.config.fetch(configPda);
    assert.isTrue(c.admin.equals(admin.publicKey));
    assert.isTrue(c.mintMoeda.equals(currencyMint));
    assert.equal(c.taxaBps, 100);
    assert.equal(c.tetoPorInvestidor.toString(), mbrl(200).toString());
  });

  it("mBRL faucet is open, with a per-call cap", async () => {
    const u = await wallet();
    await faucet(u, mbrl(500));
    assert.equal(await balance(ata(currencyMint, u.publicKey)), 500 * MBRL);
    await expectError(faucet(u, new BN(0)), "FaucetInvalido");
    await expectError(faucet(u, mbrl(1_000_001)), "FaucetInvalido");
  });

  // ── creation ───────────────────────────────────────────────────────────────
  it("creating an offering requires an authorized issuer and applies the CVM Res. 88 limits", async () => {
    issuer = await wallet(5);
    const t = await now();
    // not authorized (the Emissor account doesn't even exist)
    await expectError(
      createOffering(issuer, params({}, t + 3600)),
      "AccountNotInitialized"
    );

    await program.methods
      .definirEmissor(issuer.publicKey, false)
      .accountsPartial({ admin: admin.publicKey })
      .rpc();
    await expectError(
      createOffering(issuer, params({}, t + 3600)),
      "EmissorNaoAutorizado"
    );

    const intruder = await wallet();
    await expectError(
      program.methods
        .definirEmissor(intruder.publicKey, true)
        .accountsPartial({ admin: intruder.publicKey })
        .signers([intruder])
        .rpc(),
      "NaoAutorizado"
    );
    await program.methods
      .definirEmissor(issuer.publicKey, true)
      .accountsPartial({ admin: admin.publicKey })
      .rpc();

    const cases: [any, string][] = [
      [params({}, t + 181 * 86400), "PrazoExcedeLimite"],
      [params({}, t - 10), "PrazoExcedeLimite"],
      [params({ precoPorCota: new BN(0) }, t + 3600), "PrecoInvalido"],
      [params({ metaMinima: mbrl(1300) }, t + 3600), "MetasInvalidas"],
      [params({ metaMinima: new BN(0) }, t + 3600), "MetasInvalidas"],
      [
        params(
          { metaMinima: mbrl(14_000_000), metaMaxima: mbrl(15_000_010) },
          t + 3600
        ),
        "MetaMaximaExcedeTeto",
      ],
      [params({ metaMaxima: mbrl(1260) }, t + 3600), "LoteAdicionalExcedeLimite"],
      [params({ precoPorCota: mbrl(7) }, t + 3600), "PrecoNaoDivideMetaMaxima"],
      [params({ simbolo: "SIMBOLOLONGO" }, t + 3600), "MetadadosInvalidos"],
      [params({ empresa: "   " }, t + 3600), "MetadadosInvalidos"],
    ];
    for (const [p, error] of cases)
      await expectError(createOffering(issuer, p), error);
  });

  // ── success path ───────────────────────────────────────────────────────────
  let successOffering: PK;
  let inv1: anchor.web3.Keypair;
  let inv2: anchor.web3.Keypair;

  it("creates the offering with escrow, share mint and frozen parameters", async () => {
    const t = await now();
    successOffering = await createOffering(issuer, params({}, t + 3600));
    const o = await program.account.oferta.fetch(successOffering);
    assert.deepEqual(o.estado, { aberta: {} });
    assert.equal(o.indice, 0);
    assert.equal(o.taxaBps, 100);
    assert.equal(o.tetoPorInvestidor.toString(), mbrl(200).toString());
    assert.isTrue(o.protocoloWallet.equals(protocol.publicKey));
    assert.equal(o.empresa, "Padaria Silva (demonstracao)");
    const e = await program.account.emissor.fetch(issuerPda(issuer.publicKey));
    assert.isTrue(e.ofertaAberta!.equals(successOffering));
    assert.equal(e.totalOfertas, 1);

    // one open offering per issuer
    await expectError(
      createOffering(issuer, params({}, t + 3600)),
      "OfertaAnteriorAindaAberta"
    );
  });

  it("investment: multiple of the price, retail cap, qualified without cap, maximum target", async () => {
    inv1 = await wallet();
    inv2 = await wallet();
    await faucet(inv1, mbrl(5000));
    await faucet(inv2, mbrl(5000));

    await expectError(
      invest(inv1, successOffering, mbrl(15)),
      "AporteNaoMultiploDoPreco"
    );
    await expectError(
      invest(inv1, successOffering, new BN(0)),
      "AporteNaoMultiploDoPreco"
    );
    await invest(inv1, successOffering, mbrl(150));
    await invest(inv1, successOffering, mbrl(50)); // reaches the 200 cap
    await expectError(
      invest(inv1, successOffering, mbrl(10)),
      "ExcedeTetoInvestidor"
    );

    await program.methods
      .definirQualificado(inv2.publicKey, true)
      .accountsPartial({ admin: admin.publicKey })
      .rpc();
    await invest(inv2, successOffering, mbrl(900)); // qualified: no cap
    await expectError(
      invest(inv2, successOffering, mbrl(110)),
      "ExcedeMetaMaxima"
    );

    const o = await program.account.oferta.fetch(successOffering);
    assert.equal(o.totalArrecadado.toString(), mbrl(1100).toString());
    assert.equal(o.totalInvestidores, 2);
    assert.equal(await balance(o.cofre), 1100 * MBRL);
    const p1 = await program.account.posicao.fetch(
      positionPda(successOffering, inv1.publicKey)
    );
    assert.equal(p1.aportado.toString(), mbrl(200).toString());
  });

  it("admin pause blocks investment; closing before the deadline requires the maximum target", async () => {
    await program.methods
      .pausarOferta(true)
      .accountsPartial({ admin: admin.publicKey, oferta: successOffering })
      .rpc();
    await expectError(invest(inv2, successOffering, mbrl(100)), "OfertaPausada");
    await program.methods
      .pausarOferta(false)
      .accountsPartial({ admin: admin.publicKey, oferta: successOffering })
      .rpc();

    await expectError(close(successOffering), "EncerramentoPrematuro");
    await invest(inv2, successOffering, mbrl(100)); // closes exactly at the maximum target
    await close(successOffering);
    const o = await program.account.oferta.fetch(successOffering);
    assert.deepEqual(o.estado, { encerradaSucesso: {} });
    const e = await program.account.emissor.fetch(issuerPda(issuer.publicKey));
    assert.isNull(e.ofertaAberta);
    await expectError(close(successOffering), "OfertaNaoAberta");
    await expectError(invest(inv2, successOffering, mbrl(10)), "OfertaNaoAberta");
  });

  it("redemption: shares = invested / price, once, and non-transferable", async () => {
    const o = await program.account.oferta.fetch(successOffering);
    const redeem = (inv: anchor.web3.Keypair) =>
      program.methods
        .resgatarCotas()
        .accountsPartial({
          investidor: inv.publicKey,
          oferta: successOffering,
          mintCota: o.mintCota,
        })
        .signers([inv])
        .rpc();
    await redeem(inv1);
    await redeem(inv2);
    const shareAccount1 = ata(o.mintCota, inv1.publicKey);
    assert.equal(await balance(shareAccount1), 20);
    assert.equal(await balance(ata(o.mintCota, inv2.publicKey)), 100);
    assert.isTrue((await getAccount(conn, shareAccount1)).isFrozen);
    await expectError(redeem(inv1), "CotasJaResgatadas");

    // a direct SPL Token transfer fails: the account is frozen
    const destination = ata(o.mintCota, inv2.publicKey);
    const tx = new Transaction().add(
      createTransferInstruction(shareAccount1, destination, inv1.publicKey, 1)
    );
    await expectError(provider.sendAndConfirm(tx, [inv1]), "0x11"); // AccountFrozen

    // someone who didn't invest can't redeem
    const bystander = await wallet();
    await expectError(
      program.methods
        .resgatarCotas()
        .accountsPartial({
          investidor: bystander.publicKey,
          oferta: successOffering,
          mintCota: o.mintCota,
        })
        .signers([bystander])
        .rpc(),
      "AccountNotInitialized"
    );
  });

  it("release: issuer gets total − 1%, protocol gets the fee, only once", async () => {
    const o = await program.account.oferta.fetch(successOffering);
    const release = () =>
      program.methods
        .liberarParaEmissor()
        .accountsPartial({
          pagador: admin.publicKey,
          oferta: successOffering,
          cofre: o.cofre,
          mintMoeda: currencyMint,
          emissorWallet: issuer.publicKey,
          protocoloWallet: protocol.publicKey,
        })
        .rpc();
    await release();
    assert.equal(await balance(ata(currencyMint, issuer.publicKey)), 1188 * MBRL);
    assert.equal(await balance(ata(currencyMint, protocol.publicKey)), 12 * MBRL);
    assert.equal(await balance(o.cofre), 0);
    await expectError(release(), "RecursosJaLiberados");
    assert.isTrue(
      (await program.account.oferta.fetch(successOffering)).recursosLiberados
    );
  });

  it("a successful offering does not allow refunds", async () => {
    const o = await program.account.oferta.fetch(successOffering);
    await expectError(
      program.methods
        .reembolsar()
        .accountsPartial({
          investidor: inv1.publicKey,
          oferta: successOffering,
          cofre: o.cofre,
          mintMoeda: currencyMint,
        })
        .signers([inv1])
        .rpc(),
      "OfertaNaoFalhou"
    );
  });

  // ── failure path ───────────────────────────────────────────────────────────
  it("below the minimum target at the deadline: fails, late investment is rejected, exact refund", async () => {
    const t = await now();
    const offering = await createOffering(
      issuer,
      params({ serie: "Serie B" }, t + 6)
    );
    assert.isTrue(offering.equals(offeringPda(issuer.publicKey, 1)));
    await invest(inv1, offering, mbrl(100));
    await expectError(close(offering), "EncerramentoPrematuro");

    await sleep(8000);
    await expectError(invest(inv1, offering, mbrl(10)), "PrazoExpirado");
    await close(offering);
    const o = await program.account.oferta.fetch(offering);
    assert.deepEqual(o.estado, { encerradaFalha: {} });

    const before = await balance(ata(currencyMint, inv1.publicKey));
    const refund = () =>
      program.methods
        .reembolsar()
        .accountsPartial({
          investidor: inv1.publicKey,
          oferta: offering,
          cofre: o.cofre,
          mintMoeda: currencyMint,
        })
        .signers([inv1])
        .rpc();
    await refund();
    assert.equal(
      (await balance(ata(currencyMint, inv1.publicKey))) - before,
      100 * MBRL
    );
    await expectError(refund(), "JaReembolsado");
    await expectError(
      program.methods
        .resgatarCotas()
        .accountsPartial({
          investidor: inv1.publicKey,
          oferta: offering,
          mintCota: o.mintCota,
        })
        .signers([inv1])
        .rpc(),
      "OfertaNaoSucedida"
    );
    await expectError(
      program.methods
        .liberarParaEmissor()
        .accountsPartial({
          pagador: admin.publicKey,
          oferta: offering,
          cofre: o.cofre,
          mintMoeda: currencyMint,
          emissorWallet: issuer.publicKey,
          protocoloWallet: protocol.publicKey,
        })
        .rpc(),
      "OfertaNaoSucedida"
    );
  });

  it("only the admin can cancel, even above the minimum, and it frees the issuer for a new offering", async () => {
    const t = await now();
    const offering = await createOffering(
      issuer,
      params({ serie: "Serie C" }, t + 3600)
    );
    await invest(inv2, offering, mbrl(1000)); // above the minimum target

    const intruder = await wallet();
    await expectError(
      program.methods
        .cancelarOferta()
        .accountsPartial({ admin: intruder.publicKey, oferta: offering })
        .signers([intruder])
        .rpc(),
      "NaoAutorizado"
    );
    await program.methods
      .cancelarOferta()
      .accountsPartial({ admin: admin.publicKey, oferta: offering })
      .rpc();
    const o = await program.account.oferta.fetch(offering);
    assert.deepEqual(o.estado, { encerradaFalha: {} });

    await program.methods
      .reembolsar()
      .accountsPartial({
        investidor: inv2.publicKey,
        oferta: offering,
        cofre: o.cofre,
        mintMoeda: currencyMint,
      })
      .signers([inv2])
      .rpc();
    assert.equal(await balance(o.cofre), 0);

    const e = await program.account.emissor.fetch(issuerPda(issuer.publicKey));
    assert.isNull(e.ofertaAberta);
    assert.equal(e.totalOfertas, 3);
  });

  it("investment rejects someone else's source account and another offering's vault", async () => {
    const t = await now();
    const offering = await createOffering(
      issuer,
      params({ serie: "Serie D" }, t + 3600)
    );
    const o = await program.account.oferta.fetch(offering);
    const other = await program.account.oferta.fetch(successOffering);
    await expectError(
      program.methods
        .aportar(mbrl(10))
        .accountsPartial({
          investidor: inv1.publicKey,
          oferta: offering,
          origem: ata(currencyMint, inv2.publicKey),
          cofre: o.cofre,
          mintMoeda: currencyMint,
        })
        .signers([inv1])
        .rpc(),
      "ConstraintTokenOwner"
    );
    await expectError(
      program.methods
        .aportar(mbrl(10))
        .accountsPartial({
          investidor: inv1.publicKey,
          oferta: offering,
          origem: ata(currencyMint, inv1.publicKey),
          cofre: other.cofre,
          mintMoeda: currencyMint,
        })
        .signers([inv1])
        .rpc(),
      "ConstraintAddress"
    );
  });
});
