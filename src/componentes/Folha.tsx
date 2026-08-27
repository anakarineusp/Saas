import { useEffect, type ReactNode } from 'react'
import { Icone } from './Icone'

/** Painel que sobe de baixo da tela. */
export function Folha({
  titulo,
  aberta,
  aoFechar,
  children,
}: {
  titulo: string
  aberta: boolean
  aoFechar: () => void
  children: ReactNode
}) {
  // Fechar com a tecla Esc, e travar a rolagem do fundo enquanto está aberta.
  useEffect(() => {
    if (!aberta) return
    const aoTeclar = (e: KeyboardEvent) => e.key === 'Escape' && aoFechar()
    const rolagem = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', aoTeclar)
    return () => {
      document.body.style.overflow = rolagem
      window.removeEventListener('keydown', aoTeclar)
    }
  }, [aberta, aoFechar])

  if (!aberta) return null

  return (
    <div className="fixed inset-0 z-40 flex flex-col justify-end" role="dialog" aria-modal="true">
      <button
        type="button"
        aria-label="Fechar"
        onClick={aoFechar}
        className="surge absolute inset-0 bg-[#03060d]/80 backdrop-blur-sm"
      />
      <div className="folha-sobe painel relative flex max-h-[92vh] flex-col rounded-t-3xl">
        <div className="mx-auto mt-2.5 h-1 w-10 rounded-full bg-bordaforte" />
        <div className="flex items-center justify-between px-5 py-3">
          <h2 className="font-display text-base font-semibold text-tinta">{titulo}</h2>
          <button
            type="button"
            onClick={aoFechar}
            aria-label="Fechar"
            className="-mr-1 rounded-full p-2 text-fraca transition-colors hover:bg-superficie2 hover:text-tinta"
          >
            <Icone nome="fechar" className="h-4 w-4" />
          </button>
        </div>
        <div className="border-t border-borda" />
        <div className="overflow-y-auto overscroll-contain px-5 pt-5 pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
          {children}
        </div>
      </div>
    </div>
  )
}
