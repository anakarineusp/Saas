import { IDIOMAS, type Idioma } from '../idiomas'

export function SeletorDeIdioma({ atual, aoTrocar }: { atual: Idioma; aoTrocar: (i: Idioma) => void }) {
  return (
    <div className="flex items-center gap-0.5 rounded-lg border border-borda bg-superficie p-0.5">
      {IDIOMAS.map((idioma) => (
        <button
          key={idioma.id}
          type="button"
          onClick={() => aoTrocar(idioma.id)}
          aria-pressed={atual === idioma.id}
          className={`rounded px-2 py-1 text-[11px] font-bold transition-colors ${
            atual === idioma.id ? 'bg-superficie2 text-tinta' : 'text-tenue hover:text-fraca'
          }`}
        >
          {idioma.rotulo}
        </button>
      ))}
    </div>
  )
}
