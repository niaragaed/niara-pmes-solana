//! Constantes do programa. Os limites da Res. CVM 88 são os mesmos do
//! `OfertaOrquestrador.sol` (niaragaed/niara-contracts-PMEs).

// Seeds dos PDAs.
pub const CONFIG_SEED: &[u8] = b"config";
pub const MOEDA_SEED: &[u8] = b"mbrl";
pub const EMISSOR_SEED: &[u8] = b"emissor";
pub const QUALIFICADO_SEED: &[u8] = b"qualificado";
pub const OFERTA_SEED: &[u8] = b"oferta";
pub const COTA_SEED: &[u8] = b"cota";
pub const COFRE_SEED: &[u8] = b"cofre";
pub const POSICAO_SEED: &[u8] = b"posicao";

/// MockBRL na Solana: 6 casas (padrão de stablecoin SPL). 1 mBRL = 1_000_000.
/// Na Sepolia o MockBRL tem 18 casas; a conversão fica no cliente.
pub const DECIMAIS_MOEDA: u8 = 6;
pub const UNIDADE_MOEDA: u64 = 1_000_000;

/// Cota sem casas decimais: 1 unidade do token = 1 cota. Evita o bug de escala
/// `(aportado / preco) * 1e18` que a versão EVM precisa tratar.
pub const DECIMAIS_COTA: u8 = 0;

/// Res. CVM 88: teto de R$ 15 milhões por oferta (em mBRL, 6 casas).
pub const TETO_OFERTA: u64 = 15_000_000 * UNIDADE_MOEDA;
/// Res. CVM 88: prazo máximo de captação de 180 dias.
pub const PRAZO_MAXIMO: i64 = 180 * 24 * 60 * 60;
/// Res. CVM 88: lote adicional de até 25% sobre a meta mínima.
pub const LOTE_ADICIONAL_NUMERADOR: u128 = 125;
pub const LOTE_ADICIONAL_DENOMINADOR: u128 = 100;

/// Taxa máxima do protocolo: 1% (100 bps), como na EVM.
pub const TAXA_BPS_MAXIMA: u16 = 100;
pub const BPS_DENOMINADOR: u128 = 10_000;

/// Faucet de demonstração: no máximo 1 milhão de mBRL por chamada.
pub const FAUCET_MAXIMO: u64 = 1_000_000 * UNIDADE_MOEDA;

// Limites de metadados (bytes UTF-8).
pub const MAX_NOME: usize = 64;
pub const MAX_SIMBOLO: usize = 10;
pub const MAX_EMPRESA: usize = 64;
pub const MAX_SERIE: usize = 16;
