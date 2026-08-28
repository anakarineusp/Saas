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
    <div className="min-h-screen bg-fundo">
      <header className="border-b border-borda">
        <div className="mx-auto flex max-w-md items-center justify-between px-5 py-3.5">
          <Link to="/" className="font-display text-[17px] font-extrabold tracking-tight text-tinta">
            {NOME_DO_PRODUTO}
            <span className="text-destaque">.</span>
          </Link>
          <BotaoTema />
        </div>
      </header>

      <main className="mx-auto max-w-md px-5 pt-10 pb-16">
        <h1 className="entra font-display text-3xl leading-[1.05] font-extrabold text-balance sm:text-4xl">
          {titulo}
        </h1>
        {subtitulo && <p className="entra atraso-1 mt-2 text-sm leading-relaxed text-fraca">{subtitulo}</p>}
        <div className="entra atraso-2 mt-7">{children}</div>
        {rodape && <div className="entra atraso-3 mt-7 text-center text-sm text-fraca">{rodape}</div>}
      </main>

      <Suporte />
    </div>
  )
}
