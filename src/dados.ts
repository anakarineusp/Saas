// Único lugar do aplicativo que conversa com o banco de dados.
import { supabase, VERSAO_DO_BANCO_ESPERADA } from './supabase'
import { juntarComPadrao, type ConteudoDaVitrine } from './vitrine'
import type {
  Acompanhamento, Ajustes, Assinatura, AvaliacaoDoLink, Ciclo, Cliente, Cupom, Indicador, Indicadores,
  MesDeReceita, Motorista, Pendencia, Perfil, Plano, Reputacao, Resumo, Rota, Servico, ServicoDoLink,
} from './tipos'

function conferir<T>(resposta: { data: T | null; error: { message: string } | null }): T {
  if (resposta.error) throw new Error(traduzir(resposta.error.message))
  return resposta.data as T
}

const BANCO_DESATUALIZADO =
  'O banco de dados está desatualizado: falta rodar a última versão do arquivo ' +
  'docs/tudo-em-um.sql no Supabase. Abra /diagnostico para conferir.'

/** Deixa o recado do banco em português de gente. */
function traduzir(mensagem: string): string {
  // Função ou coluna que o site pede e o banco ainda não tem: quase sempre é
  // porque o arquivo do banco não foi rodado depois de uma atualização.
  if (
    /Could not find the function|schema cache|does not exist|relation .* does not exist|column .* does not exist/i.test(
      mensagem,
    )
  ) {
    return BANCO_DESATUALIZADO
  }
  if (/Invalid login credentials/i.test(mensagem)) return 'E-mail ou senha não conferem.'
  if (/User already registered/i.test(mensagem)) return 'Já existe uma conta com esse e-mail.'
  if (/Password should be at least/i.test(mensagem)) return 'A senha precisa ter pelo menos 6 letras ou números.'
  if (/Email not confirmed/i.test(mensagem)) return 'Confirme o e-mail antes de entrar.'
  if (/motoristas_perfil_unico/i.test(mensagem)) {
    return 'Esta conta já está ligada a outro motorista desta empresa. Use um e-mail diferente.'
  }
  if (/duplicate key/i.test(mensagem)) {
    return 'Já existe um cadastro igual a este. Confira se não foi salvo duas vezes.'
  }
  return mensagem
}

// ------------------------------------------------------------------- entrar

export async function criarConta(email: string, senha: string) {
  const { error } = await supabase.auth.signUp({ email, password: senha })
  if (error) throw new Error(traduzir(error.message))
}

export async function entrar(email: string, senha: string) {
  const { error } = await supabase.auth.signInWithPassword({ email, password: senha })
  if (error) throw new Error(traduzir(error.message))
}

export async function sair() {
  await supabase.auth.signOut()
}

/**
 * Busca o perfil de quem está logado.
 * Sempre filtrando pelo próprio usuário: a administração enxerga todos os
 * perfis, então sem esse filtro ela receberia o perfil de outra pessoa.
 */
/** Em que versão o banco está. Devolve 0 quando nem essa pergunta ele entende. */
export async function versaoDoBanco(): Promise<number> {
  const { data, error } = await supabase.rpc('versao_do_banco')
  if (error) return 0
  return Number(data ?? 0)
}

export const VERSAO_ESPERADA = VERSAO_DO_BANCO_ESPERADA

export async function meuPerfil(usuarioId: string): Promise<Perfil | null> {
  const { data } = await supabase.from('perfis').select('*').eq('id', usuarioId).limit(1)
  return (data?.[0] as Perfil) ?? null
}

export async function criarEmpresa(dados: {
  empresa: string
  seuNome: string
  telefone?: string
  documento?: string
  cidade?: string
  indicacao?: string
  plano?: string
}) {
  return conferir(
    await supabase.rpc('criar_empresa', {
      p_empresa: dados.empresa,
      p_seu_nome: dados.seuNome,
      p_telefone: dados.telefone ?? null,
      p_documento: dados.documento ?? null,
      p_cidade: dados.cidade ?? null,
      p_indicacao: dados.indicacao ?? null,
      p_plano: dados.plano ?? null,
    }),
  )
}

/** Confere um código de indicação e devolve o nome de quem indicou. */
export async function conferirIndicacao(codigo: string): Promise<string | null> {
  const { data } = await supabase.rpc('conferir_indicacao', { p_codigo: codigo })
  return (data as string) ?? null
}

export async function aceitarConvite(token: string, seuNome: string) {
  return conferir(await supabase.rpc('aceitar_convite', { p_token: token, p_seu_nome: seuNome }))
}

// -------------------------------------------------------------- assinatura

export async function minhaAssinatura(empresaId: string): Promise<Assinatura | null> {
  const { data } = await supabase.from('minha_assinatura').select('*').eq('empresa_id', empresaId).limit(1)
  return (data?.[0] as Assinatura) ?? null
}

export async function planos(): Promise<Plano[]> {
  return conferir(await supabase.from('planos').select('*').eq('ativo', true).order('ordem')) ?? []
}

export async function escolherPlano(plano: string) {
  conferir(await supabase.rpc('escolher_plano', { p_plano: plano }))
}

// ------------------------------------------------------------------ ajustes

const AJUSTES_PADRAO: Ajustes = {
  exigir_cartao_no_teste: false,
  meses_de_premio_por_indicacao: 1,
  meses_gratis_no_anual: 2,
}

/** Os ajustes que a administração liga e desliga. Nunca deixa a tela sem resposta. */
export async function ajustes(): Promise<Ajustes> {
  const { data } = await supabase.from('configuracoes').select('chave, valor')
  if (!data) return AJUSTES_PADRAO
  const mapa = Object.fromEntries((data as { chave: string; valor: unknown }[]).map((l) => [l.chave, l.valor]))
  return {
    exigir_cartao_no_teste: mapa.exigir_cartao_no_teste === true || mapa.exigir_cartao_no_teste === 'true',
    meses_de_premio_por_indicacao: Number(mapa.meses_de_premio_por_indicacao ?? 1),
    meses_gratis_no_anual: Number(mapa.meses_gratis_no_anual ?? 2),
  }
}

export async function salvarAjuste(chave: string, valor: unknown) {
  conferir(
    await supabase
      .from('configuracoes')
      .update({ valor, atualizada_em: new Date().toISOString() })
      .eq('chave', chave)
      .select(),
  )
}

export async function salvarPlano(plano: Partial<Plano> & { id: string }) {
  const { id, ...resto } = plano
  conferir(await supabase.from('planos').update(resto).eq('id', id).select())
}

/**
 * Começa o teste já com cartão guardado. Os dados do cartão vão direto para a
 * empresa de pagamentos: não passam pelo nosso banco em momento nenhum.
 */
export async function iniciarTesteComCartao(dados: {
  plano: string
  cartao: { nome: string; numero: string; mes: string; ano: string; codigo: string }
  titular: { nome: string; documento: string; cep: string; numero: string }
}) {
  const { data, error } = await supabase.functions.invoke('iniciar-teste', { body: dados })
  if (error) {
    throw new Error(
      (data as { erro?: string })?.erro ??
        'Não consegui validar o cartão agora. Confira os números e tente de novo.',
    )
  }
  return data as { ok: boolean; primeira_cobranca: string }
}

/** Fala com o servidor que cria a assinatura na empresa de pagamentos. */
export async function abrirCheckout(plano: string, ciclo: Ciclo = 'mensal'): Promise<string> {
  const { data, error } = await supabase.functions.invoke('assinar', { body: { plano, ciclo } })
  if (error) throw new Error('Não consegui abrir o pagamento. Tente de novo em instantes.')
  if (!data?.checkout) throw new Error(data?.erro ?? 'A empresa de pagamentos não devolveu o link.')
  return data.checkout as string
}

// -------------------------------------------------------------- operacional

export async function motoristas(): Promise<Motorista[]> {
  return conferir(await supabase.from('motoristas').select('*').order('nome')) ?? []
}

export async function salvarMotorista(m: Partial<Motorista> & { empresa_id: string }) {
  const { id, ...resto } = m
  if (id) return conferir(await supabase.from('motoristas').update(resto).eq('id', id).select())
  return conferir(await supabase.from('motoristas').insert(resto).select())
}

export async function excluirMotorista(id: string) {
  conferir(await supabase.from('motoristas').delete().eq('id', id).select())
}

export async function indicadores(): Promise<Indicador[]> {
  return conferir(await supabase.from('indicadores').select('*').order('nome')) ?? []
}

export async function salvarIndicador(i: Partial<Indicador> & { empresa_id: string }) {
  const { id, ...resto } = i
  if (id) return conferir(await supabase.from('indicadores').update(resto).eq('id', id).select())
  return conferir(await supabase.from('indicadores').insert(resto).select())
}

export async function excluirIndicador(id: string) {
  conferir(await supabase.from('indicadores').delete().eq('id', id).select())
}

export async function servicos(de: string, ate: string): Promise<Servico[]> {
  return conferir(
    await supabase.from('servicos_completos').select('*').gte('data', de).lte('data', ate).order('data').order('hora'),
  ) ?? []
}

export async function gravarServico(s: {
  id?: string
  data: string
  hora: string
  tipo: string
  passageiro: string
  pax: number
  origem: string
  destino: string
  voo?: string | null
  valor_centavos: number
  indicador_id?: string | null
}) {
  return conferir(
    await supabase.rpc('gravar_servico', {
      p_data: s.data,
      p_hora: s.hora,
      p_tipo: s.tipo,
      p_passageiro: s.passageiro,
      p_pax: s.pax,
      p_origem: s.origem,
      p_destino: s.destino,
      p_valor_centavos: s.valor_centavos,
      p_voo: s.voo ?? null,
      p_indicador_id: s.indicador_id ?? null,
      p_id: s.id ?? null,
    }),
  )
}

export async function excluirServico(id: string) {
  conferir(await supabase.from('servicos').delete().eq('id', id).select())
}

export async function concluirServico(id: string, concluido = true) {
  conferir(await supabase.rpc('concluir_servico', { p_servico_id: id, p_concluido: concluido }))
}

export async function atribuirMotorista(servicoId: string, motoristaId: string) {
  conferir(await supabase.rpc('atribuir_motorista', { p_servico_id: servicoId, p_motorista_id: motoristaId }))
}

export async function linkDoServico(servicoId: string): Promise<string> {
  return conferir(await supabase.rpc('link_do_servico', { p_servico_id: servicoId }))
}

export async function criarConvite(empresaId: string, motoristaId: string): Promise<string> {
  const linha = conferir(
    await supabase.from('convites').insert({ empresa_id: empresaId, motorista_id: motoristaId }).select(),
  ) as { token: string }[]
  return linha[0].token
}

// ------------------------------------------------------- motorista com login

export async function meusServicos(): Promise<Servico[]> {
  return conferir(
    await supabase.from('servicos_completos').select('*').gte('data', new Date().toISOString().slice(0, 10)).order('data').order('hora'),
  ) ?? []
}

export async function confirmarServico(id: string) {
  conferir(await supabase.rpc('confirmar_servico', { p_servico_id: id }))
}

// ------------------------------------------------- motorista pelo link, sem login

export async function servicoDoLink(token: string): Promise<ServicoDoLink | null> {
  const dados = conferir(await supabase.rpc('servico_do_link', { p_token: token })) as ServicoDoLink[]
  return dados?.[0] ?? null
}

export async function confirmarPeloLink(token: string) {
  conferir(await supabase.rpc('confirmar_pelo_link', { p_token: token }))
}

export async function recusarPeloLink(token: string, motivo?: string) {
  conferir(await supabase.rpc('recusar_pelo_link', { p_token: token, p_motivo: motivo ?? null }))
}

export async function recusarServico(id: string, motivo?: string) {
  conferir(await supabase.rpc('recusar_servico', { p_servico_id: id, p_motivo: motivo ?? null }))
}

export async function cancelarServico(id: string, motivo?: string) {
  conferir(await supabase.rpc('cancelar_servico', { p_servico_id: id, p_motivo: motivo ?? null }))
}

export async function reabrirServico(id: string) {
  conferir(await supabase.rpc('reabrir_servico', { p_servico_id: id }))
}

// -------------------------------------------------- painel de quem vende o sistema

export async function painelClientes(): Promise<Cliente[]> {
  return conferir(await supabase.from('painel_clientes').select('*').order('criada_em', { ascending: false })) ?? []
}

export async function painelResumo(): Promise<Resumo | null> {
  const { data } = await supabase.from('painel_resumo').select('*').limit(1)
  return (data?.[0] as Resumo) ?? null
}

export async function pagamentos() {
  return conferir(
    await supabase.from('pagamentos').select('*').order('criado_em', { ascending: false }).limit(100),
  ) ?? []
}

// ------------------------------------------------------ conteúdo da vitrine

export async function conteudoDaVitrine(): Promise<ConteudoDaVitrine> {
  const { data } = await supabase.from('vitrine').select('conteudo').limit(1)
  return juntarComPadrao((data?.[0] as { conteudo: unknown } | undefined)?.conteudo)
}

export async function salvarVitrine(conteudo: ConteudoDaVitrine) {
  conferir(
    await supabase
      .from('vitrine')
      .update({ conteudo, atualizada_em: new Date().toISOString() })
      .eq('id', 1)
      .select(),
  )
}

/** Manda uma imagem para o depósito de arquivos e devolve o endereço público. */
export async function enviarImagemDaVitrine(arquivo: File): Promise<string> {
  const nome = `${Date.now()}-${arquivo.name.replace(/[^a-zA-Z0-9.\-_]/g, '')}`
  const { error } = await supabase.storage.from('vitrine').upload(nome, arquivo, { upsert: true })
  if (error) {
    throw new Error(
      'Não consegui guardar a imagem. Confira se o arquivo do banco foi rodado por completo, ou use um endereço de imagem.',
    )
  }
  const { data } = supabase.storage.from('vitrine').getPublicUrl(nome)
  return data.publicUrl
}

// ---------------------------------------------------- avaliação e reputação

export async function linkDeAvaliacao(servicoId: string): Promise<string> {
  return conferir(await supabase.rpc('link_de_avaliacao', { p_servico_id: servicoId }))
}

export async function avaliacaoDoLink(token: string): Promise<AvaliacaoDoLink | null> {
  const dados = conferir(await supabase.rpc('avaliacao_do_link', { p_token: token })) as AvaliacaoDoLink[]
  return dados?.[0] ?? null
}

export async function avaliar(dados: {
  token: string
  nota: number
  pontualidade?: number
  veiculo?: number
  comentario?: string
}) {
  conferir(
    await supabase.rpc('avaliar', {
      p_token: dados.token,
      p_nota: dados.nota,
      p_pontualidade: dados.pontualidade ?? null,
      p_veiculo: dados.veiculo ?? null,
      p_comentario: dados.comentario ?? null,
    }),
  )
}

/** No plano Solo, o dono vira o motorista dele mesmo. */
export async function euSouOMotorista(veiculo: string, lugares: number): Promise<string> {
  return conferir(await supabase.rpc('eu_sou_o_motorista', { p_veiculo: veiculo, p_lugares: lugares }))
}

export async function reputacao(): Promise<Reputacao[]> {
  return conferir(await supabase.from('reputacao').select('*').order('nome')) ?? []
}

// --------------------------------------------- acompanhamento do passageiro

export async function linkDeAcompanhamento(servicoId: string): Promise<string> {
  return conferir(await supabase.rpc('link_de_acompanhamento', { p_servico_id: servicoId }))
}

export async function acompanhar(token: string): Promise<Acompanhamento | null> {
  const dados = conferir(await supabase.rpc('acompanhar', { p_token: token })) as Acompanhamento[]
  return dados?.[0] ?? null
}

// --------------------------------------------------- tabela de preços

export async function rotas(): Promise<Rota[]> {
  return conferir(await supabase.from('rotas').select('*').eq('ativa', true).order('nome')) ?? []
}

export async function salvarRota(r: Partial<Rota> & { empresa_id: string }) {
  const { id, ...resto } = r
  if (id) return conferir(await supabase.from('rotas').update(resto).eq('id', id).select())
  return conferir(await supabase.from('rotas').insert(resto).select())
}

export async function excluirRota(id: string) {
  conferir(await supabase.from('rotas').delete().eq('id', id).select())
}

// ------------------------------------------------------------------ cupons

export async function conferirCupom(codigo: string): Promise<Cupom | null> {
  const dados = conferir(await supabase.rpc('conferir_cupom', { p_codigo: codigo })) as Cupom[]
  return dados?.[0] ?? null
}

export async function aplicarCupom(codigo: string): Promise<string> {
  return conferir(await supabase.rpc('aplicar_cupom', { p_codigo: codigo }))
}

export async function cupons(): Promise<Cupom[]> {
  return conferir(await supabase.from('cupons').select('*').order('criado_em', { ascending: false })) ?? []
}

export async function salvarCupom(c: Partial<Cupom> & { codigo: string }, novo = false) {
  if (novo) return conferir(await supabase.from('cupons').insert(c).select())
  const { codigo, ...resto } = c
  return conferir(await supabase.from('cupons').update(resto).eq('codigo', codigo).select())
}

export async function excluirCupom(codigo: string) {
  conferir(await supabase.from('cupons').delete().eq('codigo', codigo).select())
}

// ------------------------------------------------------ lembrete da véspera

export async function pendenciasDeAmanha(): Promise<Pendencia[]> {
  return (conferir(await supabase.rpc('pendencias_de_amanha')) as Pendencia[]) ?? []
}

// ------------------------------------- números e gestão para a administração

export async function painelIndicadores(): Promise<Indicadores | null> {
  const { data } = await supabase.from('painel_indicadores').select('*').limit(1)
  return (data?.[0] as Indicadores) ?? null
}

export async function receitaPorMes(meses = 12): Promise<MesDeReceita[]> {
  return (conferir(await supabase.rpc('receita_por_mes', { p_meses: meses })) as MesDeReceita[]) ?? []
}

export async function salvarEmpresa(id: string, dados: Record<string, unknown>) {
  conferir(await supabase.from('empresas').update(dados).eq('id', id).select())
}

export async function excluirEmpresa(id: string) {
  conferir(await supabase.from('empresas').delete().eq('id', id).select())
}

export async function mudarAssinatura(empresaId: string, dados: Record<string, unknown>) {
  conferir(await supabase.from('assinaturas').update(dados).eq('empresa_id', empresaId).select())
}

export async function esticarTeste(empresaId: string, dias: number) {
  conferir(await supabase.rpc('esticar_teste', { p_empresa: empresaId, p_dias: dias }))
}
