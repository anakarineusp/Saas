import { NavLink } from 'react-router-dom'

const ABAS = [
  { para: '/app', fim: true, rotulo: 'Hoje', icone: 'M7 3v2m10-2v2M4 8h16M5 5h14a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Z' },
  { para: '/app/acerto', fim: false, rotulo: 'Acerto', icone: 'M4 19V9m5 10V5m5 14v-7m5 7V8' },
  { para: '/app/cadastros', fim: false, rotulo: 'Cadastros', icone: 'M4 6h16M4 12h16M4 18h10' },
]

export function BarraAbas() {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur">
      <div className="mx-auto flex max-w-md">
        {ABAS.map((aba) => (
          <NavLink
            key={aba.para}
            to={aba.para}
            end={aba.fim}
            className={({ isActive }) =>
              `flex flex-1 flex-col items-center gap-1 py-2.5 text-xs font-medium ${
                isActive ? 'text-slate-900' : 'text-slate-400'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={isActive ? 2.2 : 1.8} strokeLinecap="round" className="h-6 w-6">
                  <path d={aba.icone} />
                </svg>
                {aba.rotulo}
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
