use anchor_lang::prelude::*;

use crate::constants::*;

/// Global configuration (PDA ["config"]). Equivalent to the parameters of
/// `OfertaOrquestrador` plus the admin role.
#[account]
#[derive(InitSpace)]
pub struct Config {
    pub admin: Pubkey,
    /// MockBRL mint (PDA ["mbrl"]); authority = this config.
    pub mint_moeda: Pubkey,
    pub protocolo_wallet: Pubkey,
    pub taxa_bps: u16,
    pub teto_por_investidor: u64,
    pub bump: u8,
    pub bump_moeda: u8,
}

/// Authorized issuer (PDA ["emissor", wallet]).
#[account]
#[derive(InitSpace)]
pub struct Emissor {
    pub wallet: Pubkey,
    pub autorizado: bool,
    /// This issuer's still-open offering (at most one, as on EVM).
    pub oferta_aberta: Option<Pubkey>,
    /// How many offerings it has created; also the index of the next one (offering seed).
    pub total_ofertas: u32,
    pub bump: u8,
}

/// Qualified investor (PDA ["qualificado", wallet]): no per-investor cap.
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

/// Fundraising offering (PDA ["oferta", issuer, index LE]). Combines what on
/// EVM is ParticipacaoToken (metadata) + OfertaCaptacao (escrow and rules).
#[account]
#[derive(InitSpace)]
pub struct Oferta {
    pub emissor: Pubkey,
    pub indice: u32,
    /// Share mint (PDA ["cota", offering]), 0 decimals; authority = the offering.
    pub mint_cota: Pubkey,
    /// Escrow account in mBRL (PDA ["cofre", offering]); authority = the offering.
    pub cofre: Pubkey,
    #[max_len(MAX_NOME)]
    pub nome: String,
    #[max_len(MAX_SIMBOLO)]
    pub simbolo: String,
    #[max_len(MAX_EMPRESA)]
    pub empresa: String,
    /// keccak256(CNPJ), same as `cnpjRef` on EVM: identifies the company without exposing its CNPJ.
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

/// An investor's position in an offering (PDA ["posicao", offering, investor]).
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

// ── events (same names as the Solidity events) ───────────────────────────────

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
