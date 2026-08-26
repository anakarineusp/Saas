import type { ReactNode } from 'react'

export function Erro({ children }: { children: ReactNode }) {
  if (!children) return null
  return (
    <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm font-medium text-red-700">
      {children}
    </p>
  )
}

export function Carregando({ texto = 'Carregando…' }: { texto?: string }) {
  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <p className="text-sm text-slate-500">{texto}</p>
    </div>
  )
}

export function Vazio({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-2xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
      {children}
    </p>
  )
}
