// O formato dos dados, igual ao do banco. Dinheiro é sempre em centavos.

export type Papel = 'dono' | 'motorista' | 'admin'
export type TipoServico = 'transfer_in' | 'transfer_out' | 'passeio'
export type StatusServico = 'sem_motorista' | 'atribuido' | 'confirmado' | 'concluido'
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

export type Plano = {
  id: string
  nome: string
  descricao: string | null
  preco_centavos: number
  limite_motoristas: number | null
  limite_servicos_mes: number | null
  ordem: number
  ativo: boolean
}

export type Assinatura = {
  empresa_id: string
  empresa: string
  status: StatusAssinatura
  plano_id: string | null
  plano: string | null
  preco_centavos: number | null
  proxima_cobranca: string | null
  teste_termina_em: string
  dias_de_teste: number
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
  confirmado: boolean
}
