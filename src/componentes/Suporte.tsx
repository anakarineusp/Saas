import { useState } from 'react'
import { RECADO_DO_SUPORTE, WHATSAPP_DO_SUPORTE } from '../config'
import { Icone } from './Icone'

/** Botão de ajuda que acompanha a pessoa em todas as telas. */
export function Suporte({ acima = false }: { acima?: boolean }) {
  const [aberto, setAberto] = useState(false)

  const temWhatsApp = WHATSAPP_DO_SUPORTE.trim().length > 0
  const linkWhatsApp = `https://wa.me/${WHATSAPP_DO_SUPORTE.replace(/\D/g, '')}?text=${encodeURIComponent(RECADO_DO_SUPORTE)}`

  return (
    <div
      className={`fixed right-4 z-40 flex flex-col items-end gap-3 ${
        acima ? 'bottom-[calc(5.5rem+env(safe-area-inset-bottom))]' : 'bottom-[calc(1.25rem+env(safe-area-inset-bottom))]'
      }`}
    >
      {aberto && (
        <div className="entra painel w-72 rounded-2xl p-4 text-left">
          <p className="font-display text-sm font-semibold text-tinta">Precisa de ajuda?</p>
          <p className="mt-1 text-xs text-fraca">
            Fale com a gente. A resposta costuma sair no mesmo dia útil.
          </p>

          {temWhatsApp ? (
            <a
              href={linkWhatsApp}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-ok px-4 py-2.5 text-sm font-semibold text-[#04180f]"
            >
              <Icone nome="whatsapp" className="h-4 w-4" />
              Chamar no WhatsApp
            </a>
          ) : (
            <p className="mt-3 rounded-xl border border-borda bg-fundo2 px-3 py-2.5 text-xs text-tenue">
              O número do suporte ainda não foi cadastrado.
            </p>
          )}

          <a
            href="/diagnostico"
            className="mt-2 block rounded-xl border border-borda px-4 py-2.5 text-center text-xs font-semibold text-fraca hover:text-tinta"
          >
            Conferir a instalação
          </a>
        </div>
      )}

      <button
        type="button"
        onClick={() => setAberto((a) => !a)}
        aria-label={aberto ? 'Fechar a ajuda' : 'Abrir a ajuda'}
        aria-expanded={aberto}
        className="flex h-12 w-12 items-center justify-center rounded-full border border-bordaforte bg-superficie text-destaque shadow-[0_12px_30px_-10px_rgba(0,0,0,0.8)] transition-transform hover:scale-105 active:scale-95"
      >
        <Icone nome={aberto ? 'fechar' : 'ajuda'} className="h-5 w-5" />
      </button>
    </div>
  )
}
