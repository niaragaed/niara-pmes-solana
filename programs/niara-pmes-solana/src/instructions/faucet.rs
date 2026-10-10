use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token::{self, Mint, MintTo, Token, TokenAccount},
};

use crate::{constants::*, error::ErrorCode, state::*};

/// Faucet de MockBRL — moeda de teste, sem valor. Na EVM o `mint` do MockBRL
/// é aberto e sem limite; aqui é aberto com teto por chamada.
#[derive(Accounts)]
pub struct FaucetMbrl<'info> {
    #[account(mut)]
    pub usuario: Signer<'info>,
    #[account(seeds = [CONFIG_SEED], bump = config.bump)]
    pub config: Account<'info, Config>,
    #[account(mut, address = config.mint_moeda)]
    pub mint_moeda: Account<'info, Mint>,
    #[account(
        init_if_needed,
        payer = usuario,
        associated_token::mint = mint_moeda,
        associated_token::authority = usuario,
    )]
    pub destino: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}

pub fn handle_faucet_mbrl(ctx: Context<FaucetMbrl>, valor: u64) -> Result<()> {
    require!(
        valor > 0 && valor <= FAUCET_MAXIMO,
        ErrorCode::FaucetInvalido
    );
    let seeds: &[&[u8]] = &[CONFIG_SEED, &[ctx.accounts.config.bump]];
    token::mint_to(
        CpiContext::new_with_signer(
            ctx.accounts.token_program.key(),
            MintTo {
                mint: ctx.accounts.mint_moeda.to_account_info(),
                to: ctx.accounts.destino.to_account_info(),
                authority: ctx.accounts.config.to_account_info(),
            },
            &[seeds],
        ),
        valor,
    )
}
