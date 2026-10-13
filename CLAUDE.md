# niara-pmes-solana

## Language

English is the default for everything in this repository: code, identifiers,
comments, docs, test names, scripts and commit messages.

Exception: names that define the program deployed on devnet
(`FKefGFhUmgXBM1xCtSFBWpoNnp3wuPJs6Yddpsp67J2y`) stay as they are:
instruction names (`criar_oferta`, `aportar`, `encerrar`, ...), accounts
structs, account types and fields, events, `ErrorCode` variants and their
messages, PDA seeds (`"oferta"`, `"emissor"`, `"cofre"`, ...) and the
constants in `constants.rs`. Renaming them changes discriminators, seeds or
the IDL. The glossary in `lib.rs` and `constants.rs` explains them. New
programs and instructions should use English names from the start.

Also kept: the `.demo-emissores/` folder name (it holds the demo issuers'
existing keypairs) and the Portuguese demo company names, which are on-chain
display data for Brazilian users.

If you change `///` doc comments in `programs/`, regenerate the IDL
(`anchor build`) or update `idl/` by hand so the docs stay in sync.
