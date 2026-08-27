// Escuro por padrão. Claro para quem trabalha no sol — motorista em fila de
// aeroporto ao meio-dia não enxerga tela escura.

export type Tema = 'escuro' | 'claro'

const CHAVE = 'transfer:tema'

export function temaSalvo(): Tema {
  try {
    const salvo = localStorage.getItem(CHAVE)
    if (salvo === 'claro' || salvo === 'escuro') return salvo
  } catch {
    // navegação privada ou armazenamento bloqueado
  }
  return 'escuro'
}

export function aplicarTema(tema: Tema): void {
  document.documentElement.dataset.tema = tema
  document.querySelector('meta[name="theme-color"]')?.setAttribute(
    'content',
    tema === 'claro' ? '#f4f7fc' : '#070b14',
  )
  try {
    localStorage.setItem(CHAVE, tema)
  } catch {
    // sem problema: o tema volta ao padrão na próxima visita
  }
}
