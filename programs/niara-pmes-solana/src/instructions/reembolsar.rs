use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token::{self, Mint, Token, TokenAccount, TransferChecked},
};

use crate::{constants::*, error::ErrorCode, state::*};

#[derive(Accounts)]
pub struct Reembolsar<'info> {
    #[account(mut)]
    pub investidor: Signer<'info>,
    pub oferta: Box<Account<'info, Oferta>>,
    #[account(
        mut,
        seeds = [POSICAO_SEED, oferta.key().as_ref(), investidor.key().as_ref()],
        bump = posicao.bump
    )]
    pub posicao: Box<Account<'info, Posicao>>,
    #[account(mut, address = oferta.cofre)]
    pub cofre: Box<Account<'info, TokenAccount>>,
    #[account(address = cofre.mint)]
    pub mint_moeda: Box<Account<'info, Mint>>,
    #[account(
        init_if_needed,
        payer = investidor,
        associated_token::mint = mint_moeda,
        associated_token::authority = investidor,
    )]
    pub destino: Box<Account<'info, TokenAccount>>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}

pub fn handle_reembolsar(ctx: Context<Reembolsar>) -> Result<()> {
    let oferta = &ctx.accounts.oferta;
    require!(
        oferta.estado == Estado::EncerradaFalha,
        ErrorCode::OfertaNaoFalhou
    );
    let posicao = &mut ctx.accounts.posicao;
    require!(!posicao.reembolsado, ErrorCode::JaReembolsado);
    require!(posicao.aportado > 0, ErrorCode::NadaAReembolsar);
    posicao.reembolsado = true;
    let valor = posicao.aportado;

    let emissor = oferta.emissor;
    let indice = oferta.indice.to_le_bytes();
    let seeds: &[&[u8]] = &[OFERTA_SEED, emissor.as_ref(), &indice, &[oferta.bump]];
    token::transfer_checked(
        CpiContext::new_with_signer(
            ctx.accounts.token_program.key(),
            TransferChecked {
                from: ctx.accounts.cofre.to_account_info(),
                mint: ctx.accounts.mint_moeda.to_account_info(),
                to: ctx.accounts.destino.to_account_info(),
                authority: oferta.to_account_info(),
            },
            &[seeds],
        ),
        valor,
        ctx.accounts.mint_moeda.decimals,
    )?;

    emit!(Reembolso {
        oferta: oferta.key(),
        investidor: ctx.accounts.investidor.key(),
        valor
    });
    Ok(())
}
