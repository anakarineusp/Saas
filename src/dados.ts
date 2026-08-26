// Único lugar do aplicativo que conversa com o banco de dados.
import { supabase } from './supabase'
import type {
  Assinatura, Cliente, Indicador, Motorista, Perfil, Plano, Resumo, Servico, ServicoDoLink,
} from './tipos'

function conferir<T>(resposta: { data: T | null; error: { message: string } | null }): T {
  if (resposta.error) throw new Error(traduzir(resposta.error.message))
  return resposta.data as T
}

/** Deixa o recado do banco em português de gente. */
function traduzir(mensagem: string): string {
  if (/Invalid login credentials/i.test(mensagem)) return 'E-mail ou senha não conferem.'
  if (/User already registered/i.test(mensagem)) return 'Já existe uma conta com esse e-mail.'
  if (/Password should be at least/i.test(mensagem)) return 'A senha precisa ter pelo menos 6 letras ou números.'
  if (/Email not confirmed/i.test(mensagem)) return 'Confirme o e-mail antes de entrar.'
  if (/duplicate key/i.test(mensagem)) return 'Esse registro já existe.'
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
}) {
  return conferir(
    await supabase.rpc('criar_empresa', {
      p_empresa: dados.empresa,
      p_seu_nome: dados.seuNome,
      p_telefone: dados.telefone ?? null,
      p_documento: dados.documento ?? null,
      p_cidade: dados.cidade ?? null,
    }),
  )
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

/** Fala com o servidor que cria a assinatura na empresa de pagamentos. */
export async function abrirCheckout(plano: string): Promise<string> {
  const { data, error } = await supabase.functions.invoke('assinar', { body: { plano } })
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
