import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from 'react'

const BASE =
  'w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-slate-900 outline-none focus:border-slate-900'

export function Campo({ rotulo, children }: { rotulo: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-slate-500">{rotulo}</span>
      {children}
    </label>
  )
}

export function Entrada(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={BASE} />
}

export function Selecao(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={BASE} />
}

export function BotaoPrincipal({
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { children: ReactNode }) {
  return (
    <button
      type="button"
      {...props}
      className="w-full rounded-xl bg-slate-900 px-4 py-3 text-center font-semibold text-white active:bg-slate-700 disabled:opacity-40"
    >
      {children}
    </button>
  )
}
