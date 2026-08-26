import { paraISO } from './lib/formato'
import type { Dados } from './types'

// Dados de demonstração. Edite os nomes, horários e valores à vontade antes de uma reunião:
// as datas se ajustam sozinhas ao dia em que o app for aberto.

/** Data de hoje mais (ou menos) alguns dias, sempre dentro do mês corrente. */
function dia(deslocamento: number): string {
  const hoje = new Date()
  const alvo = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() + deslocamento, 12)
  if (alvo.getMonth() === hoje.getMonth()) return paraISO(alvo)

  const espelhado = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() - deslocamento, 12)
  if (espelhado.getMonth() === hoje.getMonth()) return paraISO(espelhado)

  return paraISO(hoje)
}

const AEROPORTO = 'Aeroporto Salgado Filho, Porto Alegre'

export function dadosDeDemonstracao(): Dados {
  const hoje = dia(0)

  return {
    motoristas: [
      { id: 'mot-jocemar', nome: 'Jocemar', telefone: '5554999120031', veiculo: 'Spin', lugares: 6, percentual: 40 },
      { id: 'mot-anderson', nome: 'Anderson', telefone: '5554999845512', veiculo: 'Spin', lugares: 6, percentual: 40 },
      { id: 'mot-luciane', nome: 'Luciane', telefone: '5554999233470', veiculo: 'Onix', lugares: 4, percentual: 35 },
      { id: 'mot-vanderlei', nome: 'Vanderlei', telefone: '5554999671208', veiculo: 'Sprinter', lugares: 15, percentual: 45 },
    ],

    indicadores: [
      { id: 'ind-bertoluci', nome: 'Hotel Bertoluci', comissao: 10, telefone: '555432861400' },
      { id: 'ind-vilasuica', nome: 'Pousada Vila Suíça', comissao: 10, telefone: '555432958120' },
      { id: 'ind-hortensias', nome: 'Recanto das Hortênsias', comissao: 12, telefone: '555432770910' },
    ],

    servicos: [
      // ---------- hoje ----------
      {
        id: 'srv-01', data: hoje, hora: '07:40', tipo: 'transfer_out',
        passageiro: 'Família Piovesan', pax: 4,
        origem: 'Hotel Bertoluci, Gramado', destino: AEROPORTO, voo: 'G3 1408',
        valor: 520, motoristaId: 'mot-jocemar', indicadorId: 'ind-bertoluci', status: 'confirmado',
      },
      {
        id: 'srv-02', data: hoje, hora: '11:30', tipo: 'transfer_in',
        passageiro: 'Sr. e Sra. Bertoldo', pax: 2,
        origem: AEROPORTO, destino: 'Pousada Vila Suíça, Gramado', voo: 'LA 3287',
        valor: 490, motoristaId: 'mot-luciane', indicadorId: 'ind-vilasuica', status: 'confirmado',
      },
      {
        id: 'srv-03', data: hoje, hora: '13:00', tipo: 'passeio',
        passageiro: 'Grupo Nakamura', pax: 6,
        origem: 'Hotel Serra Azul, Gramado', destino: 'Lago Negro e Rua Coberta',
        valor: 380, motoristaId: 'mot-anderson', indicadorId: 'ind-hortensias', status: 'atribuido',
      },
      {
        id: 'srv-04', data: hoje, hora: '14:20', tipo: 'transfer_in',
        passageiro: 'Grupo Tavares', pax: 5,
        origem: AEROPORTO, destino: 'Pousada Vila Suíça, Gramado', voo: 'G3 1408',
        valor: 480, indicadorId: 'ind-vilasuica', status: 'sem_motorista',
      },
      {
        id: 'srv-05', data: hoje, hora: '16:00', tipo: 'passeio',
        passageiro: 'Renata Prado e família', pax: 4,
        origem: 'Centro de Gramado', destino: 'Vale da Lua, Canela',
        valor: 340, indicadorId: 'ind-hortensias', status: 'sem_motorista',
      },
      {
        id: 'srv-06', data: hoje, hora: '18:45', tipo: 'transfer_in',
        passageiro: 'Grupo Kunzler', pax: 12,
        origem: AEROPORTO, destino: 'Recanto das Hortênsias, Canela', voo: 'G3 2056',
        valor: 690, motoristaId: 'mot-vanderlei', indicadorId: 'ind-hortensias', status: 'atribuido',
      },
      {
        id: 'srv-07', data: hoje, hora: '21:10', tipo: 'transfer_in',
        passageiro: 'Marcelo Andrade', pax: 2,
        origem: AEROPORTO, destino: 'Hotel Bertoluci, Gramado', voo: 'LA 3312',
        valor: 450, motoristaId: 'mot-jocemar', indicadorId: 'ind-bertoluci', status: 'atribuido',
      },

      // ---------- dias anteriores do mês ----------
      {
        id: 'srv-08', data: dia(-6), hora: '10:00', tipo: 'transfer_in',
        passageiro: 'Família Grazziotin', pax: 3,
        origem: AEROPORTO, destino: 'Hotel Bertoluci, Gramado', voo: 'AD 4021',
        valor: 470, motoristaId: 'mot-jocemar', indicadorId: 'ind-bertoluci', status: 'concluido',
      },
      {
        id: 'srv-09', data: dia(-3), hora: '08:20', tipo: 'transfer_out',
        passageiro: 'Sr. e Sra. Dalla Corte', pax: 2,
        origem: 'Pousada Vila Suíça, Gramado', destino: AEROPORTO, voo: 'LA 3290',
        valor: 500, motoristaId: 'mot-luciane', indicadorId: 'ind-vilasuica', status: 'concluido',
      },
      {
        id: 'srv-10', data: dia(-3), hora: '15:30', tipo: 'passeio',
        passageiro: 'Grupo Zanella', pax: 6,
        origem: 'Hotel Serra Azul, Gramado', destino: 'Mundo a Vapor e Rua Coberta, Canela',
        valor: 360, motoristaId: 'mot-anderson', indicadorId: 'ind-hortensias', status: 'concluido',
      },
      {
        id: 'srv-11', data: dia(-1), hora: '19:40', tipo: 'transfer_in',
        passageiro: 'Grupo Menegotto', pax: 10,
        origem: AEROPORTO, destino: 'Hotel Casa da Montanha, Gramado', voo: 'G3 2056',
        valor: 640, motoristaId: 'mot-vanderlei', status: 'concluido',
      },

      // ---------- próximos dias ----------
      {
        id: 'srv-12', data: dia(2), hora: '09:00', tipo: 'transfer_out',
        passageiro: 'Família Tavares', pax: 5,
        origem: 'Pousada Vila Suíça, Gramado', destino: AEROPORTO, voo: 'AD 4118',
        valor: 500, motoristaId: 'mot-jocemar', indicadorId: 'ind-vilasuica', status: 'atribuido',
      },
    ],
  }
}
