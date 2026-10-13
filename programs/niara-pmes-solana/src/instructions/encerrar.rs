use anchor_lang::prelude::*;

use crate::{constants::*, error::ErrorCode, state::*};

/// Permissionless, as on EVM: anyone can close after the deadline, or earlier
/// if the maximum target was reached exactly.
#[derive(Accounts)]
pub struct Encerrar<'info> {
    #[account(mut)]
    pub oferta: Account<'info, Oferta>,
    #[account(mut, seeds = [EMISSOR_SEED, oferta.emissor.as_ref()], bump = emissor.bump)]
    pub emissor: Account<'info, Emissor>,
}

pub fn handle_encerrar(ctx: Context<Encerrar>) -> Result<()> {
    let oferta = &mut ctx.accounts.oferta;
    require!(oferta.estado == Estado::Aberta, ErrorCode::OfertaNaoAberta);
    let agora = Clock::get()?.unix_timestamp;
    require!(
        agora >= oferta.prazo || oferta.total_arrecadado == oferta.meta_maxima,
        ErrorCode::EncerramentoPrematuro
    );
    let sucesso = oferta.total_arrecadado >= oferta.meta_minima;
    oferta.estado = if sucesso {
        Estado::EncerradaSucesso
    } else {
        Estado::EncerradaFalha
    };

    let chave = oferta.key();
    let emissor = &mut ctx.accounts.emissor;
    if emissor.oferta_aberta == Some(chave) {
        emissor.oferta_aberta = None;
    }
    emit!(OfertaEncerrada {
        oferta: chave,
        sucesso,
        total_arrecadado: oferta.total_arrecadado
    });
    Ok(())
}
