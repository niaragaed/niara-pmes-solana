//! Admin instructions. On EVM these functions sit behind AccessControl +
//! timelock; here the admin is a single wallet (the same as the program's
//! upgrade authority), which is simpler and more centralized, as the README says.
use anchor_lang::prelude::*;
use anchor_spl::token::{Mint, Token};

use crate::{constants::*, error::ErrorCode, program::NiaraPmesSolana, state::*};

#[derive(Accounts)]
pub struct Inicializar<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,

    #[account(
        init,
        payer = admin,
        space = 8 + Config::INIT_SPACE,
        seeds = [CONFIG_SEED],
        bump
    )]
    pub config: Account<'info, Config>,

    /// MockBRL: the mint authority is the config itself (faucet controlled by the program).
    #[account(
        init,
        payer = admin,
        seeds = [MOEDA_SEED],
        bump,
        mint::decimals = DECIMAIS_MOEDA,
        mint::authority = config,
    )]
    pub mint_moeda: Account<'info, Mint>,

    /// Only the holder of the upgrade authority can initialize, which prevents a
    /// third party from hijacking the config right after deployment.
    #[account(constraint = programa.programdata_address()? == Some(dados_programa.key()))]
    pub programa: Program<'info, NiaraPmesSolana>,
    #[account(constraint = dados_programa.upgrade_authority_address == Some(admin.key()) @ ErrorCode::NaoAutorizado)]
    pub dados_programa: Account<'info, ProgramData>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

pub fn handle_inicializar(
    ctx: Context<Inicializar>,
    protocolo_wallet: Pubkey,
    taxa_bps: u16,
    teto_por_investidor: u64,
) -> Result<()> {
    require!(taxa_bps <= TAXA_BPS_MAXIMA, ErrorCode::TaxaAcimaDoMaximo);
    let config = &mut ctx.accounts.config;
    config.admin = ctx.accounts.admin.key();
    config.mint_moeda = ctx.accounts.mint_moeda.key();
    config.protocolo_wallet = protocolo_wallet;
    config.taxa_bps = taxa_bps;
    config.teto_por_investidor = teto_por_investidor;
    config.bump = ctx.bumps.config;
    config.bump_moeda = ctx.bumps.mint_moeda;
    Ok(())
}

#[derive(Accounts)]
pub struct SomenteAdmin<'info> {
    pub admin: Signer<'info>,
    #[account(mut, seeds = [CONFIG_SEED], bump = config.bump, has_one = admin @ ErrorCode::NaoAutorizado)]
    pub config: Account<'info, Config>,
}

/// Applies only to offerings created afterwards: fee, cap and protocol wallet
/// are stored in each offering at creation time (as on EVM).
pub fn handle_atualizar_config(
    ctx: Context<SomenteAdmin>,
    protocolo_wallet: Pubkey,
    taxa_bps: u16,
    teto_por_investidor: u64,
) -> Result<()> {
    require!(taxa_bps <= TAXA_BPS_MAXIMA, ErrorCode::TaxaAcimaDoMaximo);
    let config = &mut ctx.accounts.config;
    config.protocolo_wallet = protocolo_wallet;
    config.taxa_bps = taxa_bps;
    config.teto_por_investidor = teto_por_investidor;
    Ok(())
}

#[derive(Accounts)]
#[instruction(wallet: Pubkey)]
pub struct DefinirEmissor<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,
    #[account(seeds = [CONFIG_SEED], bump = config.bump, has_one = admin @ ErrorCode::NaoAutorizado)]
    pub config: Account<'info, Config>,
    #[account(
        init_if_needed,
        payer = admin,
        space = 8 + Emissor::INIT_SPACE,
        seeds = [EMISSOR_SEED, wallet.as_ref()],
        bump
    )]
    pub emissor: Account<'info, Emissor>,
    pub system_program: Program<'info, System>,
}

pub fn handle_definir_emissor(
    ctx: Context<DefinirEmissor>,
    wallet: Pubkey,
    autorizado: bool,
) -> Result<()> {
    let emissor = &mut ctx.accounts.emissor;
    emissor.wallet = wallet;
    emissor.autorizado = autorizado;
    emissor.bump = ctx.bumps.emissor;
    emit!(EmissorDefinido { wallet, autorizado });
    Ok(())
}

#[derive(Accounts)]
#[instruction(wallet: Pubkey)]
pub struct DefinirQualificado<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,
    #[account(seeds = [CONFIG_SEED], bump = config.bump, has_one = admin @ ErrorCode::NaoAutorizado)]
    pub config: Account<'info, Config>,
    #[account(
        init_if_needed,
        payer = admin,
        space = 8 + Qualificado::INIT_SPACE,
        seeds = [QUALIFICADO_SEED, wallet.as_ref()],
        bump
    )]
    pub qualificado: Account<'info, Qualificado>,
    pub system_program: Program<'info, System>,
}

pub fn handle_definir_qualificado(
    ctx: Context<DefinirQualificado>,
    wallet: Pubkey,
    qualificado: bool,
) -> Result<()> {
    let conta = &mut ctx.accounts.qualificado;
    conta.wallet = wallet;
    conta.qualificado = qualificado;
    conta.bump = ctx.bumps.qualificado;
    emit!(QualificacaoAlterada {
        wallet,
        qualificado
    });
    Ok(())
}

#[derive(Accounts)]
pub struct AdminOferta<'info> {
    pub admin: Signer<'info>,
    #[account(seeds = [CONFIG_SEED], bump = config.bump, has_one = admin @ ErrorCode::NaoAutorizado)]
    pub config: Account<'info, Config>,
    #[account(mut)]
    pub oferta: Account<'info, Oferta>,
    #[account(mut, seeds = [EMISSOR_SEED, oferta.emissor.as_ref()], bump = emissor.bump)]
    pub emissor: Account<'info, Emissor>,
}

/// Pausing only blocks new investments; withdrawals (redemption, refund, release)
/// remain open, same as on EVM.
pub fn handle_pausar_oferta(ctx: Context<AdminOferta>, pausada: bool) -> Result<()> {
    let oferta = &mut ctx.accounts.oferta;
    require!(oferta.estado == Estado::Aberta, ErrorCode::OfertaNaoAberta);
    oferta.pausada = pausada;
    emit!(OfertaPausadaAlterada {
        oferta: oferta.key(),
        pausada
    });
    Ok(())
}

/// Cancels an open offering: it becomes EncerradaFalha (closed, failed) and each
/// investor claims a refund. On EVM only a contract held that role for self-service
/// offerings (no wallet could cancel); here the admin can.
pub fn handle_cancelar_oferta(ctx: Context<AdminOferta>) -> Result<()> {
    let oferta = &mut ctx.accounts.oferta;
    require!(oferta.estado == Estado::Aberta, ErrorCode::OfertaNaoAberta);
    oferta.estado = Estado::EncerradaFalha;
    let chave = oferta.key();
    let emissor = &mut ctx.accounts.emissor;
    if emissor.oferta_aberta == Some(chave) {
        emissor.oferta_aberta = None;
    }
    emit!(OfertaCancelada { oferta: chave });
    Ok(())
}
