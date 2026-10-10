use anchor_lang::prelude::*;

/// Mesmos nomes dos erros do Solidity, quando existe equivalente, para o site
/// poder traduzir as duas redes com a mesma tabela.
#[error_code]
pub enum ErrorCode {
    #[msg("Somente o admin do programa")]
    NaoAutorizado,
    #[msg("Taxa acima de 1% (100 bps)")]
    TaxaAcimaDoMaximo,
    #[msg("Valor do faucet deve ser > 0 e <= 1.000.000 mBRL")]
    FaucetInvalido,
    #[msg("Carteira não autorizada como emissora")]
    EmissorNaoAutorizado,
    #[msg("A última oferta deste emissor ainda está aberta")]
    OfertaAnteriorAindaAberta,
    #[msg("Nome, símbolo, empresa ou série inválidos")]
    MetadadosInvalidos,
    #[msg("Meta mínima deve ser > 0 e <= meta máxima")]
    MetasInvalidas,
    #[msg("Preço por cota deve ser > 0")]
    PrecoInvalido,
    #[msg("Prazo no passado ou acima de 180 dias (Res. CVM 88)")]
    PrazoExcedeLimite,
    #[msg("Meta máxima acima de R$ 15 milhões (Res. CVM 88)")]
    MetaMaximaExcedeTeto,
    #[msg("Lote adicional acima de 25% da meta mínima (Res. CVM 88)")]
    LoteAdicionalExcedeLimite,
    #[msg("O preço por cota precisa dividir a meta máxima")]
    PrecoNaoDivideMetaMaxima,
    #[msg("Oferta não está aberta")]
    OfertaNaoAberta,
    #[msg("Oferta pausada")]
    OfertaPausada,
    #[msg("Prazo da oferta expirado")]
    PrazoExpirado,
    #[msg("Aporte deve ser múltiplo do preço por cota")]
    AporteNaoMultiploDoPreco,
    #[msg("Aporte excede a meta máxima")]
    ExcedeMetaMaxima,
    #[msg("Aporte excede o teto por investidor")]
    ExcedeTetoInvestidor,
    #[msg("Encerramento antes do prazo exige meta máxima atingida")]
    EncerramentoPrematuro,
    #[msg("Oferta não encerrou com sucesso")]
    OfertaNaoSucedida,
    #[msg("Oferta não falhou")]
    OfertaNaoFalhou,
    #[msg("Nada a resgatar")]
    NadaAResgatar,
    #[msg("Cotas já resgatadas")]
    CotasJaResgatadas,
    #[msg("Recursos já liberados")]
    RecursosJaLiberados,
    #[msg("Nada a reembolsar")]
    NadaAReembolsar,
    #[msg("Já reembolsado")]
    JaReembolsado,
    #[msg("Estouro aritmético")]
    Overflow,
}
