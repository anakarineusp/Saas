import { useEffect, useState } from 'react'
import { aplicarTema, temaSalvo, type Tema } from '../tema'
import { Icone } from './Icone'

/** Troca entre escuro e claro. Fica guardado no aparelho de quem escolheu. */
export function BotaoTema({ className = '' }: { className?: string }) {
  const [tema, setTema] = useState<Tema>(temaSalvo)

  useEffect(() => {
    aplicarTema(tema)
  }, [tema])

  return (
    <button
      type="button"
      onClick={() => setTema(tema === 'escuro' ? 'claro' : 'escuro')}
      aria-label={tema === 'escuro' ? 'Mudar para o modo claro' : 'Mudar para o modo escuro'}
      title={tema === 'escuro' ? 'Modo claro' : 'Modo escuro'}
      className={`rounded-full p-2 text-fraca transition-colors hover:bg-superficie2 hover:text-tinta ${className}`}
    >
      <Icone nome={tema === 'escuro' ? 'sol' : 'lua'} className="h-4.5 w-4.5" />
    </button>
  )
}
