//! Niara-PMEs na Solana — captação de PMEs nos moldes da Res. CVM 88.
//!
//! Port do fluxo de captação do niaragaed/niara-contracts-PMEs (Sepolia):
//! `OfertaOrquestrador` + `OfertaCaptacao` + `ParticipacaoToken` + `MockBRL`,
//! com as mesmas regras de aporte, encerramento, resgate, liberação com taxa
//! e reembolso. Moeda de teste (MockBRL), sem valor; protótipo sem auditoria.
pub mod constants;
pub mod error;
pub mod instructions;
pub mod state;

use anchor_lang::prelude::*;

pub use constants::*;
pub use instructions::*;
pub use state::*;

declare_id!("FKefGFhUmgXBM1xCtSFBWpoNnp3wuPJs6Yddpsp67J2y");

#[program]
pub mod niara_pmes_solana {
    use super::*;

    // ── admin ────────────────────────────────────────────────────────────────
    pub fn inicializar(
        ctx: Context<Inicializar>,
        protocolo_wallet: Pubkey,
        taxa_bps: u16,
        teto_por_investidor: u64,
    ) -> Result<()> {
        instructions::admin::handle_inicializar(
            ctx,
            protocolo_wallet,
            taxa_bps,
            teto_por_investidor,
        )
    }

    pub fn atualizar_config(
        ctx: Context<SomenteAdmin>,
        protocolo_wallet: Pubkey,
        taxa_bps: u16,
        teto_por_investidor: u64,
    ) -> Result<()> {
        instructions::admin::handle_atualizar_config(
            ctx,
            protocolo_wallet,
            taxa_bps,
            teto_por_investidor,
        )
    }

    pub fn definir_emissor(
        ctx: Context<DefinirEmissor>,
        wallet: Pubkey,
        autorizado: bool,
    ) -> Result<()> {
        instructions::admin::handle_definir_emissor(ctx, wallet, autorizado)
    }

    pub fn definir_qualificado(
        ctx: Context<DefinirQualificado>,
        wallet: Pubkey,
        qualificado: bool,
    ) -> Result<()> {
        instructions::admin::handle_definir_qualificado(ctx, wallet, qualificado)
    }

    pub fn pausar_oferta(ctx: Context<AdminOferta>, pausada: bool) -> Result<()> {
        instructions::admin::handle_pausar_oferta(ctx, pausada)
    }

    pub fn cancelar_oferta(ctx: Context<AdminOferta>) -> Result<()> {
        instructions::admin::handle_cancelar_oferta(ctx)
    }

    // ── moeda de teste ───────────────────────────────────────────────────────
    pub fn faucet_mbrl(ctx: Context<FaucetMbrl>, valor: u64) -> Result<()> {
        instructions::faucet::handle_faucet_mbrl(ctx, valor)
    }

    // ── ciclo da oferta ──────────────────────────────────────────────────────
    pub fn criar_oferta(ctx: Context<CriarOferta>, parametros: ParametrosOferta) -> Result<()> {
        instructions::criar_oferta::handle_criar_oferta(ctx, parametros)
    }

    pub fn aportar(ctx: Context<Aportar>, valor: u64) -> Result<()> {
        instructions::aportar::handle_aportar(ctx, valor)
    }

    pub fn encerrar(ctx: Context<Encerrar>) -> Result<()> {
        instructions::encerrar::handle_encerrar(ctx)
    }

    pub fn resgatar_cotas(ctx: Context<ResgatarCotas>) -> Result<()> {
        instructions::resgatar::handle_resgatar_cotas(ctx)
    }

    pub fn liberar_para_emissor(ctx: Context<LiberarParaEmissor>) -> Result<()> {
        instructions::liberar::handle_liberar_para_emissor(ctx)
    }

    pub fn reembolsar(ctx: Context<Reembolsar>) -> Result<()> {
        instructions::reembolsar::handle_reembolsar(ctx)
    }
}
