use anchor_lang::prelude::*;

use crate::constants::*;

/// Configuração global (PDA ["config"]). Equivale aos parâmetros do
/// `OfertaOrquestrador` + papel de admin.
#[account]
#[derive(InitSpace)]
pub struct Config {
    pub admin: Pubkey,
    /// Mint do MockBRL (PDA ["mbrl"]), autoridade = esta config.
    pub mint_moeda: Pubkey,
    pub protocolo_wallet: Pubkey,
    pub taxa_bps: u16,
    pub teto_por_investidor: u64,
    pub bump: u8,
    pub bump_moeda: u8,
}

/// Emissor autorizado (PDA ["emissor", wallet]).
#[account]
#[derive(InitSpace)]
pub struct Emissor {
    pub wallet: Pubkey,
    pub autorizado: bool,
    /// Oferta ainda aberta deste emissor (no máximo uma, como na EVM).
    pub oferta_aberta: Option<Pubkey>,
    /// Quantas ofertas já criou; é o índice da próxima (seed da oferta).
    pub total_ofertas: u32,
    pub bump: u8,
}

/// Investidor qualificado (PDA ["qualificado", wallet]): sem teto por investidor.
#[account]
#[derive(InitSpace)]
pub struct Qualificado {
    pub wallet: Pubkey,
    pub qualificado: bool,
    pub bump: u8,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, InitSpace, Debug)]
pub enum Estado {
    Aberta,
    EncerradaSucesso,
    EncerradaFalha,
}

/// Oferta de captação (PDA ["oferta", emissor, indice LE]). Junta o que na
/// EVM é ParticipacaoToken (metadados) + OfertaCaptacao (escrow e regras).
#[account]
#[derive(InitSpace)]
pub struct Oferta {
    pub emissor: Pubkey,
    pub indice: u32,
    /// Mint das cotas (PDA ["cota", oferta]), 0 casas, autoridade = oferta.
    pub mint_cota: Pubkey,
    /// Conta de escrow em mBRL (PDA ["cofre", oferta]), autoridade = oferta.
    pub cofre: Pubkey,
    #[max_len(MAX_NOME)]
    pub nome: String,
    #[max_len(MAX_SIMBOLO)]
    pub simbolo: String,
    #[max_len(MAX_EMPRESA)]
    pub empresa: String,
    /// keccak256(CNPJ), igual ao `cnpjRef` da EVM: identifica sem expor o CNPJ.
    pub cnpj_ref: [u8; 32],
    #[max_len(MAX_SERIE)]
    pub serie: String,
    pub meta_minima: u64,
    pub meta_maxima: u64,
    pub preco_por_cota: u64,
    pub abertura: i64,
    pub prazo: i64,
    pub teto_por_investidor: u64,
    pub taxa_bps: u16,
    pub protocolo_wallet: Pubkey,
    pub estado: Estado,
    pub pausada: bool,
    pub total_arrecadado: u64,
    pub total_investidores: u32,
    pub recursos_liberados: bool,
    pub bump: u8,
    pub bump_mint_cota: u8,
    pub bump_cofre: u8,
}

/// Posição de um investidor numa oferta (PDA ["posicao", oferta, investidor]).
#[account]
#[derive(InitSpace)]
pub struct Posicao {
    pub oferta: Pubkey,
    pub investidor: Pubkey,
    pub aportado: u64,
    pub cotas_resgatadas: bool,
    pub reembolsado: bool,
    pub bump: u8,
}

// ── eventos (mesmos nomes dos eventos do Solidity) ────────────────────────────

#[event]
pub struct EmissorDefinido {
    pub wallet: Pubkey,
    pub autorizado: bool,
}

#[event]
pub struct QualificacaoAlterada {
    pub wallet: Pubkey,
    pub qualificado: bool,
}

#[event]
pub struct OfertaCriada {
    pub oferta: Pubkey,
    pub emissor: Pubkey,
    pub mint_cota: Pubkey,
    pub empresa: String,
    pub cnpj_ref: [u8; 32],
    pub serie: String,
    pub meta_minima: u64,
    pub meta_maxima: u64,
    pub preco_por_cota: u64,
    pub prazo: i64,
    pub taxa_bps: u16,
}

#[event]
pub struct Aporte {
    pub oferta: Pubkey,
    pub investidor: Pubkey,
    pub valor: u64,
    pub total_arrecadado: u64,
}

#[event]
pub struct OfertaEncerrada {
    pub oferta: Pubkey,
    pub sucesso: bool,
    pub total_arrecadado: u64,
}

#[event]
pub struct OfertaCancelada {
    pub oferta: Pubkey,
}

#[event]
pub struct OfertaPausadaAlterada {
    pub oferta: Pubkey,
    pub pausada: bool,
}

#[event]
pub struct CotasResgatadas {
    pub oferta: Pubkey,
    pub investidor: Pubkey,
    pub cotas: u64,
}

#[event]
pub struct RecursosLiberados {
    pub oferta: Pubkey,
    pub emissor: Pubkey,
    pub valor_emissor: u64,
    pub protocolo_wallet: Pubkey,
    pub taxa: u64,
}

#[event]
pub struct Reembolso {
    pub oferta: Pubkey,
    pub investidor: Pubkey,
    pub valor: u64,
}
