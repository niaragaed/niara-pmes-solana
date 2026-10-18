use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token::{self, FreezeAccount, Mint, MintTo, Token, TokenAccount},
};

use crate::{constants::*, error::ErrorCode, state::*};

#[derive(Accounts)]
pub struct ResgatarCotas<'info> {
    #[account(mut)]
    pub investidor: Signer<'info>,
    pub oferta: Box<Account<'info, Oferta>>,
    #[account(
        mut,
        seeds = [POSICAO_SEED, oferta.key().as_ref(), investidor.key().as_ref()],
        bump = posicao.bump
    )]
    pub posicao: Box<Account<'info, Posicao>>,
    #[account(mut, address = oferta.mint_cota)]
    pub mint_cota: Box<Account<'info, Mint>>,
    #[account(
        init_if_needed,
        payer = investidor,
        associated_token::mint = mint_cota,
        associated_token::authority = investidor,
    )]
    pub destino: Box<Account<'info, TokenAccount>>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}

pub fn handle_resgatar_cotas(ctx: Context<ResgatarCotas>) -> Result<()> {
    let oferta = &ctx.accounts.oferta;
    require!(
        oferta.estado == Estado::EncerradaSucesso,
        ErrorCode::OfertaNaoSucedida
    );
    let posicao = &mut ctx.accounts.posicao;
    require!(!posicao.cotas_resgatadas, ErrorCode::CotasJaResgatadas);
    require!(posicao.aportado > 0, ErrorCode::NadaAResgatar);
    posicao.cotas_resgatadas = true;

    // Investments are always a multiple of the price, so the division is exact.
    let cotas = posicao.aportado / oferta.preco_por_cota;

    let emissor = oferta.emissor;
    let indice = oferta.indice.to_le_bytes();
    let seeds: &[&[u8]] = &[OFERTA_SEED, emissor.as_ref(), &indice, &[oferta.bump]];

    token::mint_to(
        CpiContext::new_with_signer(
            ctx.accounts.token_program.key(),
            MintTo {
                mint: ctx.accounts.mint_cota.to_account_info(),
                to: ctx.accounts.destino.to_account_info(),
                authority: oferta.to_account_info(),
            },
            &[seeds],
        ),
        cotas,
    )?;
    // Non-transferable shares: the account is frozen by the offering right after the mint.
    // (On EVM: DenyAllTransferPolicy. The secondary market comes later.)
    token::freeze_account(CpiContext::new_with_signer(
        ctx.accounts.token_program.key(),
        FreezeAccount {
            account: ctx.accounts.destino.to_account_info(),
            mint: ctx.accounts.mint_cota.to_account_info(),
            authority: oferta.to_account_info(),
        },
        &[seeds],
    ))?;

    emit!(CotasResgatadas {
        oferta: oferta.key(),
        investidor: ctx.accounts.investidor.key(),
        cotas,
    });
    Ok(())
}
