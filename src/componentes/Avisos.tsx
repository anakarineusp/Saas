import { createContext, useCallback, useContext, useState, type ReactNode } from 'react'
import { Icone } from './Icone'

type Tom = 'ok' | 'erro' | 'neutro'
type Recado = { id: number; texto: string; tom: Tom }

const Contexto = createContext<(texto: string, tom?: Tom) => void>(() => {})

/** Recadinho que aparece no rodapé quando alguma coisa é salva ou dá errado. */
export function ProvedorDeAvisos({ children }: { children: ReactNode }) {
  const [recados, setRecados] = useState<Recado[]>([])

  const avisar = useCallback((texto: string, tom: Tom = 'ok') => {
    const id = Date.now() + Math.random()
    setRecados((atuais) => [...atuais, { id, texto, tom }])
    setTimeout(() => setRecados((atuais) => atuais.filter((r) => r.id !== id)), 3600)
  }, [])

  const cores: Record<Tom, string> = {
    ok: 'border-ok/40 bg-ok/15 text-ok',
    erro: 'border-alerta/40 bg-alerta/15 text-alerta',
    neutro: 'border-borda bg-superficie text-tinta',
  }

  return (
    <Contexto.Provider value={avisar}>
      {children}
      <div
        className="pointer-events-none fixed inset-x-0 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] z-50 flex flex-col items-center gap-2 px-4"
        role="status"
        aria-live="polite"
      >
        {recados.map((recado) => (
          <div
            key={recado.id}
            className={`entra flex max-w-sm items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold backdrop-blur-md ${cores[recado.tom]}`}
          >
            <Icone nome={recado.tom === 'erro' ? 'aviso' : 'check'} className="h-4 w-4 shrink-0" traco={2.4} />
            {recado.texto}
          </div>
        ))}
      </div>
    </Contexto.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAvisar() {
  return useContext(Contexto)
}
