import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from 'react'

const BASE =
  'w-full rounded-xl border border-borda bg-fundo2 px-3.5 py-3 text-tinta placeholder:text-tenue outline-none transition-colors focus:border-destaque'

export function Campo({
  rotulo,
  dica,
  children,
}: {
  rotulo: string
  dica?: string
  children: ReactNode
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold tracking-wide text-fraca uppercase">{rotulo}</span>
      {children}
      {dica && <span className="mt-1 block text-xs text-tenue">{dica}</span>}
    </label>
  )
}

export function Entrada(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={BASE} />
}

export function Selecao(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={`${BASE} appearance-none`} />
}

export function Busca({
  valor,
  aoMudar,
  placeholder,
}: {
  valor: string
  aoMudar: (v: string) => void
  placeholder: string
}) {
  return (
    <div className="relative">
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.7}
        strokeLinecap="round"
        className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-tenue"
      >
        <path d="m20 20-3.5-3.5M18 11a7 7 0 1 1-14 0 7 7 0 0 1 14 0Z" />
      </svg>
      <input
        value={valor}
        onChange={(e) => aoMudar(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className={`${BASE} pl-10`}
      />
    </div>
  )
}
