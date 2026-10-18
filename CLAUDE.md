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

## No AI attribution (hard rule)

Nothing in this repository credits an AI tool, anywhere:

- no `Co-Authored-By: Claude` or `Claude-Session:` trailers, and no "Generated with Claude Code"
  line, in commit messages;
- no AI tool as a commit author or committer: commits use the project identity
  (`git config user.name`/`user.email` = `Niara <niaragaed@gmail.com>`, set in every clone and
  environment before the first commit — some environments default to `Claude <noreply@anthropic.com>`);
- no "Generated with/by Claude Code" footer in pull request descriptions, comments, issues or files.

It's enforced in two layers: the versioned `.claude/settings.json` turns Claude Code's commit
and PR attribution off (`"attribution": {"commit": "", "pr": ""}`), and the `No AI attribution`
GitHub Actions check (`.github/workflows/no-ai-attribution.yml`) fails on any commit or pull
request description that carries it. Some hosted environments append a footer to PR
descriptions by themselves; if the check flags one, delete that line in the GitHub UI. The rule
applies to every Niara repository, including new ones: copy both files when creating a repo.

