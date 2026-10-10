use anchor_lang::prelude::*;
use anchor_spl::token::{Mint, Token, TokenAccount};

use crate::{constants::*, error::ErrorCode, state::*};

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct ParametrosOferta {
    pub nome: String,
    pub simbolo: String,
    pub empresa: String,
    pub cnpj_ref: [u8; 32],
    pub serie: String,
    pub meta_minima: u64,
    pub meta_maxima: u64,
    pub preco_por_cota: u64,
    pub prazo: i64,
}

/// Equivale ao `OfertaOrquestrador.criarOfertaCompleta`: numa instrução só,
/// cria a oferta, o mint das cotas e o cofre de escrow, já com os limites da
/// Res. CVM 88 aplicados.
#[derive(Accounts)]
pub struct CriarOferta<'info> {
    #[account(mut)]
    pub emissor_wallet: Signer<'info>,
    #[account(seeds = [CONFIG_SEED], bump = config.bump)]
    pub config: Box<Account<'info, Config>>,
    #[account(
        mut,
        seeds = [EMISSOR_SEED, emissor_wallet.key().as_ref()],
        bump = emissor.bump,
    )]
    pub emissor: Box<Account<'info, Emissor>>,
    #[account(
        init,
        payer = emissor_wallet,
        space = 8 + Oferta::INIT_SPACE,
        seeds = [OFERTA_SEED, emissor_wallet.key().as_ref(), &emissor.total_ofertas.to_le_bytes()],
        bump
    )]
    pub oferta: Box<Account<'info, Oferta>>,
    /// Cotas: mint e congelamento pela própria oferta (só ela emite, e cada
    /// conta de cotas é congelada no resgate — sem transferência, como a
    /// `DenyAllTransferPolicy` da EVM).
    #[account(
        init,
        payer = emissor_wallet,
        seeds = [COTA_SEED, oferta.key().as_ref()],
        bump,
        mint::decimals = DECIMAIS_COTA,
        mint::authority = oferta,
        mint::freeze_authority = oferta,
    )]
    pub mint_cota: Box<Account<'info, Mint>>,
    #[account(
        init,
        payer = emissor_wallet,
        seeds = [COFRE_SEED, oferta.key().as_ref()],
        bump,
        token::mint = mint_moeda,
        token::authority = oferta,
    )]
    pub cofre: Box<Account<'info, TokenAccount>>,
    #[account(address = config.mint_moeda)]
    pub mint_moeda: Box<Account<'info, Mint>>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

fn texto(valor: &str, maximo: usize) -> Result<String> {
    let t = valor.trim();
    require!(
        !t.is_empty() && t.len() <= maximo,
        ErrorCode::MetadadosInvalidos
    );
    Ok(t.to_string())
}

pub fn handle_criar_oferta(ctx: Context<CriarOferta>, p: ParametrosOferta) -> Result<()> {
    let emissor = &mut ctx.accounts.emissor;
    require!(emissor.autorizado, ErrorCode::EmissorNaoAutorizado);
    require!(
        emissor.oferta_aberta.is_none(),
        ErrorCode::OfertaAnteriorAindaAberta
    );

    let nome = texto(&p.nome, MAX_NOME)?;
    let simbolo = texto(&p.simbolo, MAX_SIMBOLO)?;
    let empresa = texto(&p.empresa, MAX_EMPRESA)?;
    let serie = texto(&p.serie, MAX_SERIE)?;

    // Mesma ordem de validação do orquestrador EVM.
    require!(p.preco_por_cota > 0, ErrorCode::PrecoInvalido);
    let agora = Clock::get()?.unix_timestamp;
    require!(
        p.prazo > agora && p.prazo - agora <= PRAZO_MAXIMO,
        ErrorCode::PrazoExcedeLimite
    );
    require!(
        p.meta_minima > 0 && p.meta_minima <= p.meta_maxima,
        ErrorCode::MetasInvalidas
    );
    require!(
        p.meta_maxima <= TETO_OFERTA,
        ErrorCode::MetaMaximaExcedeTeto
    );
    require!(
        (p.meta_maxima as u128) * LOTE_ADICIONAL_DENOMINADOR
            <= (p.meta_minima as u128) * LOTE_ADICIONAL_NUMERADOR,
        ErrorCode::LoteAdicionalExcedeLimite
    );
    require!(
        p.meta_maxima % p.preco_por_cota == 0,
        ErrorCode::PrecoNaoDivideMetaMaxima
    );

    let config = &ctx.accounts.config;
    let chave = ctx.accounts.oferta.key();
    let oferta = &mut ctx.accounts.oferta;
    oferta.emissor = ctx.accounts.emissor_wallet.key();
    oferta.indice = emissor.total_ofertas;
    oferta.mint_cota = ctx.accounts.mint_cota.key();
    oferta.cofre = ctx.accounts.cofre.key();
    oferta.nome = nome;
    oferta.simbolo = simbolo;
    oferta.empresa = empresa;
    oferta.cnpj_ref = p.cnpj_ref;
    oferta.serie = serie;
    oferta.meta_minima = p.meta_minima;
    oferta.meta_maxima = p.meta_maxima;
    oferta.preco_por_cota = p.preco_por_cota;
    oferta.abertura = agora;
    oferta.prazo = p.prazo;
    // Taxa, teto e carteira do protocolo congelados na criação.
    oferta.teto_por_investidor = config.teto_por_investidor;
    oferta.taxa_bps = config.taxa_bps;
    oferta.protocolo_wallet = config.protocolo_wallet;
    oferta.estado = Estado::Aberta;
    oferta.pausada = false;
    oferta.total_arrecadado = 0;
    oferta.total_investidores = 0;
    oferta.recursos_liberados = false;
    oferta.bump = ctx.bumps.oferta;
    oferta.bump_mint_cota = ctx.bumps.mint_cota;
    oferta.bump_cofre = ctx.bumps.cofre;

    emissor.total_ofertas = emissor
        .total_ofertas
        .checked_add(1)
        .ok_or(ErrorCode::Overflow)?;
    emissor.oferta_aberta = Some(chave);

    emit!(OfertaCriada {
        oferta: chave,
        emissor: oferta.emissor,
        mint_cota: oferta.mint_cota,
        empresa: oferta.empresa.clone(),
        cnpj_ref: oferta.cnpj_ref,
        serie: oferta.serie.clone(),
        meta_minima: oferta.meta_minima,
        meta_maxima: oferta.meta_maxima,
        preco_por_cota: oferta.preco_por_cota,
        prazo: oferta.prazo,
        taxa_bps: oferta.taxa_bps,
    });
    Ok(())
}
