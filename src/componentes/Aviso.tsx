import type { ReactNode } from 'react'
import { Icone } from './Icone'

export function Erro({ children }: { children: ReactNode }) {
  if (!children) return null
  return (
    <p className="flex items-start gap-2 rounded-xl border border-alerta/40 bg-alerta/10 px-3.5 py-3 text-sm font-medium text-alerta">
      <Icone nome="aviso" className="mt-0.5 h-4 w-4 shrink-0" />
      <span>{children}</span>
    </p>
  )
}

/** Espaço reservado com o formato do conteúdo, em vez de um "carregando" solto. */
export function Carregando({ linhas = 3 }: { linhas?: number }) {
  return (
    <div className="space-y-3 px-4 pt-6" aria-busy="true" aria-label="Carregando">
      <div className="carregando-bloco h-7 w-2/3 rounded-lg" />
      <div className="carregando-bloco h-4 w-1/3 rounded-lg" />
      <div className="mt-6 space-y-3">
        {Array.from({ length: linhas }).map((_, i) => (
          <div key={i} className="carregando-bloco h-28 rounded-2xl" />
        ))}
      </div>
    </div>
  )
}

export function Vazio({
  titulo,
  children,
  acao,
}: {
  titulo: string
  children?: ReactNode
  acao?: ReactNode
}) {
  return (
    <div className="rounded-2xl border border-dashed border-borda bg-superficie/40 p-8 text-center">
      <p className="font-display font-semibold text-tinta">{titulo}</p>
      {children && <p className="mx-auto mt-1.5 max-w-xs text-sm text-fraca">{children}</p>}
      {acao && <div className="mt-4 flex justify-center">{acao}</div>}
    </div>
  )
}
