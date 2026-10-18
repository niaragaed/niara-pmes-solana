# niara-pmes-solana

Solana program for **Niara-PMEs**: fundraising for small and medium-sized
Brazilian companies modeled on CVM Resolution 88 (equity crowdfunding), with the
investors' money held in an on-chain escrow until the offer closes.

It is the Solana port of the fundraising flow in
[niaragaed/niara-contracts-PMEs](https://github.com/niaragaed/niara-contracts-PMEs)
(Ethereum Sepolia): `OfertaOrquestrador` + `OfertaCaptacao` + `ParticipacaoToken`
+ `MockBRL`, with the same rules. The site is
[niara-pmes.vercel.app](https://niara-pmes.vercel.app), and the Niara-Register ledger
mirrors the events of both chains.

> Test currency (MockBRL) and fictitious demo companies only. Prototype, **no external
> audit**. Not an offer of securities.

## How it works

| | |
|---|---|
| Program ID (devnet) | `FKefGFhUmgXBM1xCtSFBWpoNnp3wuPJs6Yddpsp67J2y` |
| Framework | Anchor 1.2.1, anchor-spl (SPL Token), Agave 4.x |
| Test currency | MockBRL, SPL mint PDA `["mbrl"]`, 6 decimals, open faucet (≤ 1,000,000 mBRL per call) |
| Shares | one SPL mint per offer, PDA `["cota", offer]`, 0 decimals (1 unit = 1 share) |

Accounts (all PDAs):

- `Config ["config"]`: admin, MockBRL mint, protocol wallet, fee (bps) and per-investor cap applied to new offers.
- `Emissor ["emissor", wallet]`: an authorized issuer, its open offer (at most one) and its offer count.
- `Qualificado ["qualificado", wallet]`: a qualified investor, who has no per-investor cap.
- `Oferta ["oferta", issuer, index]`: terms, state and totals. Fee, cap and protocol wallet are frozen at creation.
- `Posicao ["posicao", offer, investor]`: how much the investor put in, and whether they redeemed or were refunded.
- Escrow: a token account PDA `["cofre", offer]`, whose authority is the offer itself.

Lifecycle, identical to the EVM version:

1. `criar_oferta` is signed by an authorized issuer and creates the offer, the share mint and the escrow in one
   instruction. It enforces the CVM 88 limits:
   - max raise of R$ 15M;
   - deadline of at most 180 days;
   - the max target at most 125% of the min target (25% additional lot);
   - the share price divides the max target;
   - one open offer per issuer.
2. `aportar(valor)` is an investment in MockBRL, which goes into the escrow. It must be a multiple of the share
   price and cannot push the total past the max target. Retail investors are capped by the per-investor cap.
3. `encerrar` is permissionless. It runs after the deadline, or earlier if the max target was hit exactly. The offer
   succeeds if the total is at least the min target, and fails otherwise.
4. On success:
   - `resgatar_cotas` mints `invested / price` shares to the investor, then **freezes** the share account, which
     makes the shares non-transferable (the EVM `DenyAllTransferPolicy`).
   - `liberar_para_emissor` (permissionless, once) pays the issuer the total minus the protocol fee (1%, rounded down).
5. On failure or cancellation, `reembolsar` returns exactly what each investor put in.

Admin-only instructions:
- `inicializar` can only be signed by the program's **upgrade authority**.
- `definir_emissor`, `definir_qualificado`, `pausar_oferta` (pause blocks new investments only) and `cancelar_oferta`.

Events use the same names as the Solidity events: `OfertaCriada`, `Aporte`, `OfertaEncerrada`, `OfertaCancelada`,
`CotasResgatadas`, `RecursosLiberados`, `Reembolso`, `EmissorDefinido`, `QualificacaoAlterada`,
`OfertaPausadaAlterada`.

### Differences from the EVM version (on purpose)

- **Governance is simpler.** The EVM uses AccessControl roles with a timelock. Here a single admin (the upgrade
  authority) acts immediately. It is more centralized, which is acceptable on devnet, and is on the list before
  mainnet (multisig + timelock).
- **The admin can cancel and pause self-service offers.** In the EVM deployment no wallet could, because only the
  orchestrator contract held the gateway role.
- **No secondary market yet.** `LiquidacaoSecundaria` and `RestrictedTransferPolicy` are not ported; shares stay
  frozen.
- **Shares have 0 decimals instead of 18.** This removes the `(invested / price) * 1e18` scaling step.
- **The annual per-investor and per-issuer CVM 88 limits across platforms** stay off-chain, as in the EVM version.

## Run the tests

```bash
anchor build
solana-test-validator -r --upgradeable-program FKefGFhUmgXBM1xCtSFBWpoNnp3wuPJs6Yddpsp67J2y \
  target/deploy/niara_pmes_solana.so $(solana-keygen pubkey ~/.config/solana/id.json) &
anchor test --skip-local-validator --skip-deploy --skip-build
```

The suite has 12 tests:
- Only the upgrade authority can initialize.
- Faucet limits.
- The CVM 88 limits (10 failing cases).
- One open offer per issuer.
- Price multiple, retail cap, qualified investor and max target.
- Pause.
- Early close only at the max target.
- Shares equal invested / price, are frozen and redeemed only once.
- 1% fee split on release, only once.
- Below-minimum failure with exact refund, and investing after the deadline rejected.
- Admin-only cancellation.
- Foreign source account or escrow rejected.

## Deploy to devnet

```bash
solana config set --url devnet
solana program deploy target/deploy/niara_pmes_solana.so \
  --program-id target/deploy/niara_pmes_solana-keypair.json \
  --keypair ~/.config/solana/niara-deployer.json
```

The program is about 400 KB. A first deploy needs about **6 SOL** for a moment: rent for the program plus a
temporary buffer, which is refunded afterwards.

Then configure it with the same wallet:

```bash
npm install
export ANCHOR_PROVIDER_URL=https://api.devnet.solana.com
export ANCHOR_WALLET=~/.config/solana/niara-deployer.json
npx ts-node -P tsconfig.json scripts/admin.ts setup               # fee 1%, cap 20,000 mBRL
npx ts-node -P tsconfig.json scripts/admin.ts authorize <WALLET>  # issuer's Phantom wallet
npx ts-node -P tsconfig.json scripts/admin.ts demo                # 3 fictitious demo offers
npx ts-node -P tsconfig.json scripts/admin.ts list
```

`target/deploy/niara_pmes_solana-keypair.json` (the program address) and `.demo-emissores/` are kept out of git.

## Development history (disclosure)

The EVM contracts this program ports, and the Niara-PMEs site with its Sepolia integration, were built between July
and September 2026. This Solana program and the site's Solana integration were written in October 2026, during the
Crypto World's Fair hackathon.
