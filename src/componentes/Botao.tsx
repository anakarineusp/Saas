import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { Link } from 'react-router-dom'

type Tom = 'principal' | 'contorno' | 'fantasma' | 'perigo' | 'ok'
type Tamanho = 'normal' | 'grande' | 'pequeno'

const TONS: Record<Tom, string> = {
  principal: 'bg-destaque text-[#08121c] hover:brightness-108 active:brightness-95',
  contorno: 'border border-borda text-tinta hover:border-bordaforte hover:bg-superficie2',
  fantasma: 'text-fraca hover:text-tinta hover:bg-superficie2',
  perigo: 'bg-alerta text-[#160406] hover:brightness-108 active:brightness-95',
  ok: 'bg-ok text-[#04180f] hover:brightness-108 active:brightness-95',
}

const TAMANHOS: Record<Tamanho, string> = {
  pequeno: 'px-3 py-1.5 text-xs',
  normal: 'px-4 py-3 text-sm',
  grande: 'px-6 py-4 text-base',
}

const BASE =
  'inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-all duration-150 disabled:opacity-40 disabled:pointer-events-none'

export function classesDeBotao(tom: Tom = 'principal', tamanho: Tamanho = 'normal', largo = false) {
  return `${BASE} ${TONS[tom]} ${TAMANHOS[tamanho]} ${largo ? 'w-full' : ''}`
}

export function Botao({
  tom = 'principal',
  tamanho = 'normal',
  largo = false,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  tom?: Tom
  tamanho?: Tamanho
  largo?: boolean
  children: ReactNode
}) {
  return (
    <button type="button" {...props} className={classesDeBotao(tom, tamanho, largo)}>
      {children}
    </button>
  )
}

export function BotaoLink({
  para,
  tom = 'principal',
  tamanho = 'normal',
  largo = false,
  children,
}: {
  para: string
  tom?: Tom
  tamanho?: Tamanho
  largo?: boolean
  children: ReactNode
}) {
  return (
    <Link to={para} className={classesDeBotao(tom, tamanho, largo)}>
      {children}
    </Link>
  )
}
