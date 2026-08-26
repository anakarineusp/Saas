export type Motorista = {
  id: string
  nome: string
  telefone: string // formato 5554999999999
  veiculo: string // "Spin"
  lugares: number // 6
  percentual: number // 40 = 40%
}

export type Indicador = {
  id: string
  nome: string // "Hotel Bertoluci"
  comissao: number // 10 = 10%
  telefone: string // usado no aviso por WhatsApp
}

export type TipoServico = 'transfer_in' | 'transfer_out' | 'passeio'

export type StatusServico = 'sem_motorista' | 'atribuido' | 'confirmado' | 'concluido'

export type Servico = {
  id: string
  data: string // "2026-08-27"
  hora: string // "14:20"
  tipo: TipoServico
  passageiro: string
  pax: number
  origem: string
  destino: string
  voo?: string
  valor: number // valor cobrado do cliente
  motoristaId?: string
  indicadorId?: string
  status: StatusServico
}

export type Dados = {
  motoristas: Motorista[]
  indicadores: Indicador[]
  servicos: Servico[]
}
