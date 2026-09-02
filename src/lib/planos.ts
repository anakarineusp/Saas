/** Em uma linha, quanta gente cabe no plano. Serve para a vitrine e para dentro do aplicativo. */
export function porteDoPlano(limite: number | null): string {
  if (limite === null) return 'Motoristas sem limite'
  if (limite === 1) return 'Um motorista: você'
  return `Até ${limite} motoristas`
}
