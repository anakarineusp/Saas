import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { planos as buscarPlanos } from '../../dados'
import { moeda } from '../../lib/formato'
import type { Plano } from '../../tipos'

const PASSOS = [
  { titulo: 'Lance o serviço', texto: 'Data, hora, passageiro, origem, destino e valor. Leva 20 segundos.' },
  { titulo: 'Escolha o motorista', texto: 'O sistema mostra quem está livre, quem já tem serviço na hora e em qual carro o grupo cabe.' },
  { titulo: 'Avise pelo WhatsApp', texto: 'A mensagem sai pronta. O motorista abre o link e confirma, sem instalar nada.' },
  { titulo: 'Feche o mês', texto: 'Quanto cada motorista tem a receber e quanto cada hotel indicou, calculado sozinho.' },
]

export function Vitrine() {
  const [planos, setPlanos] = useState<Plano[]>([])

  useEffect(() => {
    void buscarPlanos().then(setPlanos).catch(() => setPlanos([]))
  }, [])

  return (
    <div className="min-h-screen bg-white">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-5 py-4">
        <span className="text-lg font-bold tracking-tight text-slate-900">Transfer</span>
        <Link to="/entrar" className="text-sm font-medium text-slate-600 hover:text-slate-900">
          Entrar
        </Link>
      </header>

      <section className="mx-auto max-w-5xl px-5 pt-8 pb-14">
        <p className="text-xs font-semibold tracking-widest text-emerald-700 uppercase">
          Para empresas de transfer turístico
        </p>
        <h1 className="mt-3 max-w-2xl text-4xl leading-tight font-bold text-balance text-slate-900 sm:text-5xl">
          A agenda do dia, o motorista certo e o acerto do mês, num lugar só.
        </h1>
        <p className="mt-4 max-w-xl text-lg text-slate-600">
          Chega de planilha e caderno. Lance o serviço, escolha quem está livre e avise pelo WhatsApp.
          O motorista confirma sem instalar nada — e nunca vê o valor cobrado do cliente.
        </p>
        <div className="mt-7 flex flex-wrap gap-3">
          <Link
            to="/criar-conta"
            className="rounded-xl bg-slate-900 px-6 py-3.5 font-semibold text-white hover:bg-slate-700"
          >
            Testar 7 dias grátis
          </Link>
          <a
            href="#planos"
            className="rounded-xl border border-slate-300 px-6 py-3.5 font-semibold text-slate-700 hover:bg-slate-50"
          >
            Ver os planos
          </a>
        </div>
        <p className="mt-3 text-sm text-slate-500">Sem cartão para começar. Cancela quando quiser.</p>
      </section>

      <section className="border-y border-slate-200 bg-slate-50">
        <div className="mx-auto grid max-w-5xl gap-6 px-5 py-14 sm:grid-cols-2 lg:grid-cols-4">
          {PASSOS.map((passo, i) => (
            <div key={passo.titulo}>
              <span className="text-sm font-bold text-emerald-700 tabular-nums">{i + 1}</span>
              <h3 className="mt-1 font-semibold text-slate-900">{passo.titulo}</h3>
              <p className="mt-1 text-sm text-slate-600">{passo.texto}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="planos" className="mx-auto max-w-5xl px-5 py-16">
        <h2 className="text-3xl font-bold text-slate-900">Planos</h2>
        <p className="mt-2 text-slate-600">Todos começam com 7 dias grátis, sem cartão.</p>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {planos.map((plano, i) => (
            <div
              key={plano.id}
              className={`rounded-2xl border p-6 ${
                i === 1 ? 'border-2 border-slate-900 bg-slate-900 text-white' : 'border-slate-200 bg-white'
              }`}
            >
              {i === 1 && (
                <span className="mb-2 inline-block rounded-full bg-emerald-500 px-2.5 py-0.5 text-xs font-semibold">
                  Mais escolhido
                </span>
              )}
              <h3 className={`text-xl font-bold ${i === 1 ? 'text-white' : 'text-slate-900'}`}>{plano.nome}</h3>
              <p className={`mt-1 text-sm ${i === 1 ? 'text-slate-300' : 'text-slate-600'}`}>{plano.descricao}</p>
              <p className="mt-5">
                <span className={`text-3xl font-bold tabular-nums ${i === 1 ? 'text-white' : 'text-slate-900'}`}>
                  {moeda(plano.preco_centavos)}
                </span>
                <span className={`text-sm ${i === 1 ? 'text-slate-400' : 'text-slate-500'}`}> por mês</span>
              </p>
              <ul className={`mt-5 space-y-1.5 text-sm ${i === 1 ? 'text-slate-200' : 'text-slate-600'}`}>
                <li>
                  {plano.limite_motoristas ? `Até ${plano.limite_motoristas} motoristas` : 'Motoristas à vontade'}
                </li>
                <li>{plano.limite_servicos_mes ? `${plano.limite_servicos_mes} serviços por mês` : 'Serviços à vontade'}</li>
                <li>Aviso por WhatsApp e acerto do mês</li>
              </ul>
              <Link
                to="/criar-conta"
                className={`mt-6 block rounded-xl px-4 py-3 text-center font-semibold ${
                  i === 1 ? 'bg-white text-slate-900 hover:bg-slate-100' : 'bg-slate-900 text-white hover:bg-slate-700'
                }`}
              >
                Começar o teste
              </Link>
            </div>
          ))}
          {planos.length === 0 && (
            <p className="text-sm text-slate-500">Não consegui carregar os planos agora.</p>
          )}
        </div>
      </section>

      <footer className="border-t border-slate-200">
        <div className="mx-auto max-w-5xl px-5 py-8 text-sm text-slate-500">
          Transfer · sistema para empresas de transfer turístico
        </div>
      </footer>
    </div>
  )
}
