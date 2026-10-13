//! Program constants. The CVM Resolution 88 limits are the same as in
//! `OfertaOrquestrador.sol` (niaragaed/niara-contracts-PMEs).
//!
//! Seeds and identifiers stay in Portuguese: the seeds derive the addresses of
//! accounts already on devnet. Glossary: moeda = currency, emissor = issuer,
//! qualificado = qualified investor, oferta = offering, cota = share,
//! cofre = vault (escrow), posicao = position, teto = cap, prazo = deadline,
//! lote adicional = additional lot, taxa = fee, empresa = company, serie = series.

// PDA seeds.
pub const CONFIG_SEED: &[u8] = b"config";
pub const MOEDA_SEED: &[u8] = b"mbrl";
pub const EMISSOR_SEED: &[u8] = b"emissor";
pub const QUALIFICADO_SEED: &[u8] = b"qualificado";
pub const OFERTA_SEED: &[u8] = b"oferta";
pub const COTA_SEED: &[u8] = b"cota";
pub const COFRE_SEED: &[u8] = b"cofre";
pub const POSICAO_SEED: &[u8] = b"posicao";

/// MockBRL on Solana: 6 decimals (SPL stablecoin standard). 1 mBRL = 1_000_000.
/// On Sepolia MockBRL has 18 decimals; the client handles the conversion.
pub const DECIMAIS_MOEDA: u8 = 6;
pub const UNIDADE_MOEDA: u64 = 1_000_000;

/// Shares have no decimals: 1 token unit = 1 share. This avoids the scaling bug
/// `(invested / price) * 1e18` that the EVM version has to handle.
pub const DECIMAIS_COTA: u8 = 0;

/// CVM Res. 88: cap of R$ 15 million per offering (in mBRL, 6 decimals).
pub const TETO_OFERTA: u64 = 15_000_000 * UNIDADE_MOEDA;
/// CVM Res. 88: maximum fundraising period of 180 days.
pub const PRAZO_MAXIMO: i64 = 180 * 24 * 60 * 60;
/// CVM Res. 88: additional lot of up to 25% over the minimum target.
pub const LOTE_ADICIONAL_NUMERADOR: u128 = 125;
pub const LOTE_ADICIONAL_DENOMINADOR: u128 = 100;

/// Maximum protocol fee: 1% (100 bps), as on EVM.
pub const TAXA_BPS_MAXIMA: u16 = 100;
pub const BPS_DENOMINADOR: u128 = 10_000;

/// Demo faucet: at most 1 million mBRL per call.
pub const FAUCET_MAXIMO: u64 = 1_000_000 * UNIDADE_MOEDA;

// Metadata limits (UTF-8 bytes).
pub const MAX_NOME: usize = 64;
pub const MAX_SIMBOLO: usize = 10;
pub const MAX_EMPRESA: usize = 64;
pub const MAX_SERIE: usize = 16;
