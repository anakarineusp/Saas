export type Aba = 'hoje' | 'acerto' | 'cadastros'

const ABAS: { id: Aba; rotulo: string; icone: string }[] = [
  { id: 'hoje', rotulo: 'Hoje', icone: 'M7 3v2m10-2v2M4 8h16M5 5h14a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Z' },
  { id: 'acerto', rotulo: 'Acerto', icone: 'M4 19V9m5 10V5m5 14v-7m5 7V8' },
  { id: 'cadastros', rotulo: 'Cadastros', icone: 'M4 6h16M4 12h16M4 18h10' },
]

export function BarraAbas({ atual, aoTrocar }: { atual: Aba; aoTrocar: (aba: Aba) => void }) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur">
      <div className="mx-auto flex max-w-md">
        {ABAS.map((aba) => {
          const ativa = aba.id === atual
          return (
            <button
              key={aba.id}
              type="button"
              onClick={() => aoTrocar(aba.id)}
              className={`flex flex-1 flex-col items-center gap-1 py-2.5 text-xs font-medium ${
                ativa ? 'text-slate-900' : 'text-slate-400'
              }`}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={ativa ? 2.2 : 1.8} strokeLinecap="round" className="h-6 w-6">
                <path d={aba.icone} />
              </svg>
              {aba.rotulo}
            </button>
          )
        })}
      </div>
    </nav>
  )
}
