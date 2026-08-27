import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { NOME_DO_PRODUTO } from '../config'
import { BotaoTema } from './BotaoTema'
import { Suporte } from './Suporte'

/** Moldura das telas de entrar e cadastrar. */
export function MolduraPublica({
  titulo,
  subtitulo,
  children,
  rodape,
}: {
  titulo: string
  subtitulo?: string
  children: ReactNode
  rodape?: ReactNode
}) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-fundo">
      <div className="aurora absolute inset-0" />

      <header className="relative mx-auto flex max-w-md items-center justify-between px-5 py-4">
        <Link to="/" className="font-display text-lg font-bold tracking-tight text-tinta">
          {NOME_DO_PRODUTO}
          <span className="text-destaque">.</span>
        </Link>
        <BotaoTema />
      </header>

      <main className="relative mx-auto flex min-h-[calc(100vh-8rem)] max-w-md flex-col justify-center px-5 pb-12">
        <h1 className="entra font-display text-3xl font-bold text-balance">{titulo}</h1>
        {subtitulo && <p className="entra atraso-1 mt-2 text-sm leading-relaxed text-fraca">{subtitulo}</p>}
        <div className="entra atraso-2 mt-7">{children}</div>
        {rodape && <div className="entra atraso-3 mt-7 text-center text-sm text-fraca">{rodape}</div>}
      </main>

      <Suporte />
    </div>
  )
}
