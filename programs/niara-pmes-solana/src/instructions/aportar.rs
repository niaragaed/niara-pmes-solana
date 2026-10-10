use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Token, TokenAccount, TransferChecked};

use crate::{constants::*, error::ErrorCode, state::*};

#[derive(Accounts)]
pub struct Aportar<'info> {
    #[account(mut)]
    pub investidor: Signer<'info>,
    #[account(mut)]
    pub oferta: Box<Account<'info, Oferta>>,
    #[account(
        init_if_needed,
        payer = investidor,
        space = 8 + Posicao::INIT_SPACE,
        seeds = [POSICAO_SEED, oferta.key().as_ref(), investidor.key().as_ref()],
        bump
    )]
    pub posicao: Box<Account<'info, Posicao>>,
    /// CHECK: PDA ["qualificado", investidor]. Pode não existir (investidor de
    /// varejo); o seed garante que ninguém passa a conta de outra pessoa.
    #[account(seeds = [QUALIFICADO_SEED, investidor.key().as_ref()], bump)]
    pub qualificado: UncheckedAccount<'info>,
    #[account(
        mut,
        token::mint = mint_moeda,
        token::authority = investidor,
    )]
    pub origem: Box<Account<'info, TokenAccount>>,
    #[account(mut, address = oferta.cofre)]
    pub cofre: Box<Account<'info, TokenAccount>>,
    #[account(address = cofre.mint)]
    pub mint_moeda: Box<Account<'info, Mint>>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

fn eh_qualificado(conta: &UncheckedAccount) -> bool {
    if conta.owner != &crate::ID || conta.data_is_empty() {
        return false;
    }
    let dados = conta.try_borrow_data();
    match dados {
        Ok(d) => Qualificado::try_deserialize(&mut &d[..])
            .map(|q| q.qualificado)
            .unwrap_or(false),
        Err(_) => false,
    }
}

pub fn handle_aportar(ctx: Context<Aportar>, valor: u64) -> Result<()> {
    let oferta = &mut ctx.accounts.oferta;
    require!(oferta.estado == Estado::Aberta, ErrorCode::OfertaNaoAberta);
    require!(!oferta.pausada, ErrorCode::OfertaPausada);
    require!(
        Clock::get()?.unix_timestamp < oferta.prazo,
        ErrorCode::PrazoExpirado
    );
    require!(
        valor > 0 && valor % oferta.preco_por_cota == 0,
        ErrorCode::AporteNaoMultiploDoPreco
    );
    let novo_total = oferta
        .total_arrecadado
        .checked_add(valor)
        .ok_or(ErrorCode::Overflow)?;
    require!(
        novo_total <= oferta.meta_maxima,
        ErrorCode::ExcedeMetaMaxima
    );

    let posicao = &mut ctx.accounts.posicao;
    let novo_aportado = posicao
        .aportado
        .checked_add(valor)
        .ok_or(ErrorCode::Overflow)?;
    if !eh_qualificado(&ctx.accounts.qualificado) {
        require!(
            novo_aportado <= oferta.teto_por_investidor,
            ErrorCode::ExcedeTetoInvestidor
        );
    }

    if posicao.investidor == Pubkey::default() {
        posicao.oferta = oferta.key();
        posicao.investidor = ctx.accounts.investidor.key();
        posicao.bump = ctx.bumps.posicao;
        oferta.total_investidores = oferta
            .total_investidores
            .checked_add(1)
            .ok_or(ErrorCode::Overflow)?;
    }
    posicao.aportado = novo_aportado;
    oferta.total_arrecadado = novo_total;

    token::transfer_checked(
        CpiContext::new(
            ctx.accounts.token_program.key(),
            TransferChecked {
                from: ctx.accounts.origem.to_account_info(),
                mint: ctx.accounts.mint_moeda.to_account_info(),
                to: ctx.accounts.cofre.to_account_info(),
                authority: ctx.accounts.investidor.to_account_info(),
            },
        ),
        valor,
        ctx.accounts.mint_moeda.decimals,
    )?;

    emit!(Aporte {
        oferta: oferta.key(),
        investidor: ctx.accounts.investidor.key(),
        valor,
        total_arrecadado: novo_total,
    });
    Ok(())
}
