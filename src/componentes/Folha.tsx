import type { ReactNode } from 'react'

type Props = {
  titulo: string
  aberta: boolean
  aoFechar: () => void
  children: ReactNode
}

/** Painel que sobe de baixo da tela. */
export function Folha({ titulo, aberta, aoFechar, children }: Props) {
  if (!aberta) return null

  return (
    <div className="fixed inset-0 z-40 flex flex-col justify-end">
      <button
        type="button"
        aria-label="Fechar"
        onClick={aoFechar}
        className="surge absolute inset-0 bg-slate-900/50"
      />
      <div className="folha-sobe relative flex max-h-[92vh] flex-col rounded-t-3xl bg-slate-50 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <h2 className="text-base font-semibold text-slate-900">{titulo}</h2>
          <button
            type="button"
            onClick={aoFechar}
            className="-mr-1 rounded-full px-3 py-1 text-sm font-medium text-slate-500 active:bg-slate-200"
          >
            Fechar
          </button>
        </div>
        <div className="overflow-y-auto overscroll-contain px-4 pt-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
          {children}
        </div>
      </div>
    </div>
  )
}
