// O formato dos dados, igual ao do banco. Dinheiro é sempre em centavos.

export type Papel = 'dono' | 'motorista' | 'admin'
export type TipoServico = 'transfer_in' | 'transfer_out' | 'passeio'
export type StatusServico =
  | 'sem_motorista'
  | 'atribuido'
  | 'confirmado'
  | 'recusado'
  | 'concluido'
  | 'cancelado'
export type StatusAssinatura = 'teste' | 'ativa' | 'atrasada' | 'cancelada'

export type Perfil = {
  id: string
  nome: string
  telefone: string | null
  papel: Papel
  empresa_id: string | null
}

export type Motorista = {
  id: string
  empresa_id: string
  perfil_id: string | null
  nome: string
  telefone: string
  veiculo: string
  lugares: number
  percentual: number
  ativo: boolean
}

export type Indicador = {
  id: string
  empresa_id: string
  nome: string
  telefone: string | null
  comissao: number
  ativo: boolean
}

/** Uma linha da visão servicos_completos. */
export type Servico = {
  id: string
  empresa_id: string
  data: string
  hora: string
  tipo: TipoServico
  passageiro: string
  pax: number
  origem: string
  destino: string
  voo: string | null
  status: StatusServico
  motivo: string | null
  respondido_em: string | null
  motorista_id: string | null
  motorista: string | null
  veiculo: string | null
  lugares: number | null
  percentual: number | null
  indicador_id: string | null
  indicador: string | null
  valor_motorista_centavos: number
  /** Vem vazio para quem não pode ver o valor cobrado do cliente. */
  valor_centavos: number | null
  comissao_indicador_centavos: number | null
}

export type Ciclo = 'mensal' | 'anual'

export type Plano = {
  id: string
  nome: string
  descricao: string | null
  preco_centavos: number
  preco_anual_centavos: number | null
  limite_motoristas: number | null
  limite_servicos_mes: number | null
  ordem: number
  ativo: boolean
}

export type Assinatura = {
  empresa_id: string
  empresa: string
  status: StatusAssinatura
  ciclo: Ciclo
  plano_id: string | null
  plano: string | null
  preco_centavos: number | null
  proxima_cobranca: string | null
  teste_termina_em: string
  codigo_indicacao: string | null
  meses_de_credito: number
  dias_de_teste: number
  indicacoes_feitas: number
  indicacoes_confirmadas: number
  pode_usar: boolean
}

export type Cliente = {
  id: string
  nome: string
  documento: string | null
  telefone: string | null
  cidade: string | null
  criada_em: string
  teste_termina_em: string
  status: StatusAssinatura | null
  plano_id: string | null
  plano: string | null
  proxima_cobranca: string | null
  motoristas: number
  servicos: number
  pago_centavos: number
}

export type Resumo = {
  empresas: number
  assinantes: number
  em_teste: number
  atrasados: number
  recebido_mes_centavos: number
  recorrente_centavos: number
}

/** O que o motorista vê ao abrir o link, sem login. */
export type ServicoDoLink = {
  servico_id: string
  data: string
  hora: string
  tipo: TipoServico
  passageiro: string
  pax: number
  origem: string
  destino: string
  voo: string | null
  motorista: string
  empresa: string
  valor_motorista_centavos: number
  status: StatusServico
  confirmado: boolean
  recusado: boolean
}

export type Ajustes = {
  exigir_cartao_no_teste: boolean
  meses_de_premio_por_indicacao: number
  meses_gratis_no_anual: number
}

export type Avaliacao = {
  id: string
  servico_id: string
  motorista_id: string | null
  nota: number | null
  pontualidade: number | null
  veiculo: number | null
  comentario: string | null
  criada_em: string
  respondida_em: string | null
}

export type AvaliacaoDoLink = {
  ja_respondeu: boolean
  empresa: string
  motorista: string | null
  veiculo: string | null
  data: string
  hora: string
  passageiro: string
  origem: string
  destino: string
}

export type Reputacao = {
  motorista_id: string
  nome: string
  veiculo: string
  avaliacoes: number
  media: number | null
  media_pontualidade: number | null
  media_veiculo: number | null
  elogios: number
  reclamacoes: number
  servicos_concluidos: number
  servicos_recusados: number
}

export type Acompanhamento = {
  empresa: string
  telefone_empresa: string | null
  data: string
  hora: string
  tipo: TipoServico
  passageiro: string
  pax: number
  origem: string
  destino: string
  voo: string | null
  motorista: string | null
  veiculo: string | null
  status: StatusServico
}

export type Rota = {
  id: string
  empresa_id: string
  nome: string
  origem: string
  destino: string
  tipo: TipoServico | null
  valor_centavos: number
  pax_ate: number | null
  ativa: boolean
}

export type Cupom = {
  codigo: string
  descricao: string | null
  tipo: 'percentual' | 'meses_gratis' | 'valor'
  valor: number
  plano_id: string | null
  validade: string | null
  usos_maximos: number | null
  usos: number
  ativo: boolean
}

export type Pendencia = {
  servico_id: string
  hora: string
  passageiro: string
  origem: string
  destino: string
  status: StatusServico
  motorista_id: string | null
  motorista: string | null
  telefone: string | null
}

export type Indicadores = {
  empresas: number
  assinantes: number
  em_teste: number
  testes_vencidos: number
  atrasados: number
  cancelados: number
  novos_no_mes: number
  novos_mes_passado: number
  recorrente_centavos: number
  recebido_mes_centavos: number
  recebido_mes_passado_centavos: number
  recebido_total_centavos: number
  a_receber_centavos: number
  indicacoes_confirmadas: number
  servicos_no_sistema: number
  motoristas_no_sistema: number
  ticket_medio_centavos: number
  cancelamento_porcento: number
  conversao_porcento: number
  anual_projetado_centavos: number
}

export type MesDeReceita = {
  mes: string
  recebido_centavos: number
  clientes: number
}
