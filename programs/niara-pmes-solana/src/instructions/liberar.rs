use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token::{self, Mint, Token, TokenAccount, TransferChecked},
};

use crate::{constants::*, error::ErrorCode, state::*};

/// Permissionless e única, como na EVM: em caso de sucesso, o escrow vai para
/// o emissor, menos a taxa do protocolo (arredondada para baixo).
#[derive(Accounts)]
pub struct LiberarParaEmissor<'info> {
    #[account(mut)]
    pub pagador: Signer<'info>,
    #[account(mut)]
    pub oferta: Box<Account<'info, Oferta>>,
    #[account(mut, address = oferta.cofre)]
    pub cofre: Box<Account<'info, TokenAccount>>,
    #[account(address = cofre.mint)]
    pub mint_moeda: Box<Account<'info, Mint>>,
    /// CHECK: só serve de autoridade da conta de destino; amarrado à oferta.
    #[account(address = oferta.emissor)]
    pub emissor_wallet: UncheckedAccount<'info>,
    #[account(
        init_if_needed,
        payer = pagador,
        associated_token::mint = mint_moeda,
        associated_token::authority = emissor_wallet,
    )]
    pub destino_emissor: Box<Account<'info, TokenAccount>>,
    /// CHECK: idem, carteira do protocolo gravada na oferta.
    #[account(address = oferta.protocolo_wallet)]
    pub protocolo_wallet: UncheckedAccount<'info>,
    #[account(
        init_if_needed,
        payer = pagador,
        associated_token::mint = mint_moeda,
        associated_token::authority = protocolo_wallet,
    )]
    pub destino_protocolo: Box<Account<'info, TokenAccount>>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}

pub fn handle_liberar_para_emissor(ctx: Context<LiberarParaEmissor>) -> Result<()> {
    let oferta = &mut ctx.accounts.oferta;
    require!(
        oferta.estado == Estado::EncerradaSucesso,
        ErrorCode::OfertaNaoSucedida
    );
    require!(!oferta.recursos_liberados, ErrorCode::RecursosJaLiberados);
    oferta.recursos_liberados = true;

    let total = oferta.total_arrecadado;
    let taxa = ((total as u128) * (oferta.taxa_bps as u128) / BPS_DENOMINADOR) as u64;
    let valor_emissor = total - taxa;

    let emissor = oferta.emissor;
    let indice = oferta.indice.to_le_bytes();
    let seeds: &[&[u8]] = &[OFERTA_SEED, emissor.as_ref(), &indice, &[oferta.bump]];
    let decimais = ctx.accounts.mint_moeda.decimals;

    let token_program = ctx.accounts.token_program.key();
    let cofre = ctx.accounts.cofre.to_account_info();
    let mint = ctx.accounts.mint_moeda.to_account_info();
    let autoridade = oferta.to_account_info();
    let pernas = [
        (
            ctx.accounts.destino_emissor.to_account_info(),
            valor_emissor,
        ),
        (ctx.accounts.destino_protocolo.to_account_info(), taxa),
    ];
    for (para, valor) in pernas {
        if valor == 0 {
            continue;
        }
        token::transfer_checked(
            CpiContext::new_with_signer(
                token_program,
                TransferChecked {
                    from: cofre.clone(),
                    mint: mint.clone(),
                    to: para,
                    authority: autoridade.clone(),
                },
                &[seeds],
            ),
            valor,
            decimais,
        )?;
    }

    emit!(RecursosLiberados {
        oferta: oferta.key(),
        emissor,
        valor_emissor,
        protocolo_wallet: oferta.protocolo_wallet,
        taxa,
    });
    Ok(())
}
