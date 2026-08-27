import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { BotaoLink } from '../../componentes/Botao'
import { BotaoTema } from '../../componentes/BotaoTema'
import { EstradaNoturna } from '../../componentes/EstradaNoturna'
import { Icone } from '../../componentes/Icone'
import { Suporte } from '../../componentes/Suporte'
import { conteudoDaVitrine, planos as buscarPlanos } from '../../dados'
import { moeda } from '../../lib/formato'
import { useRevelarAoRolar } from '../../lib/revelar'
import type { Ciclo, Plano } from '../../tipos'
import { VITRINE_PADRAO, type ConteudoDaVitrine } from '../../vitrine'

/** Um cartão de serviço igual ao do sistema — mostrar vale mais que descrever. */
function AmostraDaTela() {
  return (
    <div className="painel w-full max-w-sm rounded-2xl p-4">
      <div className="mb-3 flex items-center gap-2 border-b border-borda pb-3">
        <span className="h-2 w-2 rounded-full bg-alerta" />
        <span className="text-xs font-semibold text-alerta">1 serviço sem motorista</span>
      </div>
      <div className="flex items-center gap-2 text-xs">
        <span className="font-display font-bold text-tinta tabular-nums">14:20</span>
        <span className="rounded-md bg-superficie2 px-1.5 py-0.5 font-medium text-fraca">Transfer IN</span>
        <span className="text-tenue">5 pax</span>
      </div>
      <p className="mt-2 text-sm font-semibold text-tinta">
        Grupo Tavares <span className="ml-1 text-xs font-normal text-tenue">Voo G3 1408</span>
      </p>
      <p className="mt-0.5 text-xs text-fraca">
        Aeroporto Salgado Filho <span className="text-tenue">→</span> Pousada Vila Suíça
      </p>
      <div className="mt-3 flex items-end justify-between border-t border-borda pt-3">
        <span className="flex items-center gap-1.5 text-xs font-medium text-fraca">
          Jocemar <span className="text-tenue">· Spin</span>
          <Icone nome="check" className="h-3.5 w-3.5 text-ok" traco={3} />
        </span>
        <span className="font-display text-sm font-bold text-tinta tabular-nums">R$ 480,00</span>
      </div>
    </div>
  )
}

function Pergunta({ p, r }: { p: string; r: string }) {
  const [aberta, setAberta] = useState(false)
  return (
    <div className="border-b border-borda">
      <button
        type="button"
        onClick={() => setAberta((a) => !a)}
        aria-expanded={aberta}
        className="flex w-full items-center justify-between gap-4 py-4 text-left"
      >
        <span className="font-display text-sm font-semibold text-tinta">{p}</span>
        <Icone
          nome="mais"
          className={`h-4 w-4 shrink-0 text-fraca transition-transform duration-200 ${aberta ? 'rotate-45' : ''}`}
        />
      </button>
      <div className={`grid transition-all duration-300 ${aberta ? 'grid-rows-[1fr] pb-4' : 'grid-rows-[0fr]'}`}>
        <p className="overflow-hidden text-sm leading-relaxed text-fraca">{r}</p>
      </div>
    </div>
  )
}

export function Vitrine() {
  const [planos, setPlanos] = useState<Plano[]>([])
  const [ciclo, setCiclo] = useState<Ciclo>('mensal')
  const [c, setConteudo] = useState<ConteudoDaVitrine>(VITRINE_PADRAO)
  useRevelarAoRolar()

  useEffect(() => {
    void buscarPlanos().then(setPlanos).catch(() => setPlanos([]))
    void conteudoDaVitrine().then(setConteudo).catch(() => setConteudo(VITRINE_PADRAO))
  }, [])

  // A cor de destaque escolhida na administração vale só nesta página.
  const estilo = { ['--c-destaque' as string]: c.marca.cor_destaque } as React.CSSProperties

  const precoDe = (p: Plano) =>
    ciclo === 'anual' ? (p.preco_anual_centavos ?? p.preco_centavos * 10) : p.preco_centavos

  const economiaDe = (p: Plano) => p.preco_centavos * 12 - (p.preco_anual_centavos ?? p.preco_centavos * 10)

  return (
    <div className="min-h-screen bg-fundo" style={estilo}>
      <header className="sticky top-0 z-30 border-b border-borda/60 bg-fundo/80 backdrop-blur-lg">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3.5">
          <span className="font-display text-lg font-bold tracking-tight text-tinta">
            {c.marca.nome}
            <span className="text-destaque">.</span>
          </span>
          <div className="flex items-center gap-1">
            <BotaoTema />
            <Link
              to="/entrar"
              className="rounded-lg px-3 py-2 text-sm font-semibold text-fraca transition-colors hover:text-tinta"
            >
              Entrar
            </Link>
            <BotaoLink para="/criar-conta" tamanho="pequeno">
              Testar grátis
            </BotaoLink>
          </div>
        </div>
      </header>

      {/* ------------------------------------------------------------ abertura */}
      <section className="relative overflow-hidden">
        <EstradaNoturna className="absolute inset-0 h-full w-full opacity-70" />
        <div className="absolute inset-x-0 bottom-0 h-44 bg-gradient-to-b from-transparent to-fundo" />

        <div className="relative mx-auto grid max-w-6xl gap-12 px-5 pt-16 pb-20 sm:pt-24 sm:pb-28 lg:grid-cols-[1.15fr_1fr] lg:items-center">
          <div>
            <p className="entra inline-flex items-center gap-2 text-xs font-semibold tracking-wide text-tenue uppercase">
              <span className="h-1 w-1 rounded-full bg-destaque" />
              {c.topo.etiqueta}
            </p>

            <h1 className="entra atraso-1 font-display mt-5 text-4xl leading-[1.03] font-extrabold text-balance sm:text-6xl">
              {c.topo.titulo_1}
              <br />
              <span className="texto-destaque">{c.topo.titulo_2}</span>
            </h1>

            <p className="entra atraso-2 mt-6 max-w-prose text-lg leading-relaxed text-fraca">
              {c.topo.subtitulo}
            </p>

            <div className="entra atraso-3 mt-8 flex flex-wrap items-center gap-3">
              <BotaoLink para="/criar-conta" tamanho="grande">
                {c.topo.botao}
                <Icone nome="seta" className="h-4 w-4" />
              </BotaoLink>
              <a
                href="#planos"
                className="rounded-xl border border-bordaforte px-6 py-4 text-base font-semibold text-tinta transition-colors hover:bg-superficie2"
              >
                {c.topo.botao_secundario}
              </a>
            </div>

            <ul className="entra atraso-4 mt-6 flex flex-wrap gap-x-5 gap-y-2 text-sm text-tenue">
              {c.topo.selos.map((item) => (
                <li key={item} className="flex items-center gap-1.5">
                  <Icone nome="check" className="h-3.5 w-3.5 text-ok" traco={3} />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <div className="entra atraso-5 flex justify-center lg:justify-end">
            {c.topo.imagem ? (
              <img
                src={c.topo.imagem}
                alt=""
                className="w-full max-w-sm rounded-2xl border border-borda object-cover"
              />
            ) : (
              <AmostraDaTela />
            )}
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------------- dor */}
      <section className="border-t border-borda bg-fundo2/60">
        <div className="mx-auto max-w-6xl px-5 py-24">
          <p className="revela text-xs font-bold tracking-[0.2em] text-alerta uppercase">{c.dores.etiqueta}</p>
          <h2 className="revela font-display mt-3 max-w-2xl text-3xl font-bold text-balance sm:text-4xl">
            {c.dores.titulo}
          </h2>

          <div className="mt-10 grid gap-4 sm:grid-cols-2">
            {c.dores.itens.map((dor, i) => (
              <div
                key={dor.titulo}
                className="revela flex gap-4 rounded-2xl border border-borda bg-superficie/50 p-5"
                style={{ transitionDelay: `${i * 60}ms` }}
              >
                <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-alerta" />

                <div>
                  <h3 className="font-display font-semibold text-tinta">{dor.titulo}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-fraca">{dor.texto}</p>
                </div>
              </div>
            ))}
          </div>

          <p className="revela mx-auto mt-10 max-w-xl text-center text-lg text-balance text-fraca">
            {c.dores.fecho}
          </p>
        </div>
      </section>

      {/* -------------------------------------------------------- como funciona */}
      <section className="relative overflow-hidden">
        <div className="aurora relative mx-auto max-w-6xl px-5 py-24">
          <p className="revela relative text-xs font-bold tracking-[0.2em] text-destaque uppercase">O jeito novo</p>
          <h2 className="revela font-display relative mt-3 text-3xl font-bold text-balance sm:text-4xl">
            Quatro passos, todo dia
          </h2>
          <p className="revela relative mt-2 max-w-lg text-fraca">
            É o mesmo caminho que você já faz — sem esquecer ninguém e com a conta pronta no fim do mês.
          </p>

          <ol className="relative mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {c.passos.itens.map((passo, i) => (
              <li
                key={passo.titulo}
                className="revela painel rounded-2xl p-5"
                style={{ transitionDelay: `${i * 70}ms` }}
              >
                <div className="flex items-center justify-between">
                  <span className="font-display flex h-9 w-9 items-center justify-center rounded-xl border border-borda text-sm font-bold text-fraca">
                    {i + 1}
                  </span>
                  <span className="font-display text-2xl font-extrabold text-borda tabular-nums">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                </div>
                <h3 className="font-display mt-4 font-semibold text-tinta">{passo.titulo}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-fraca">{passo.texto}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ----------------------------------------------------------- diferenças */}
      <section className="border-t border-borda bg-fundo2/60">
        <div className="mx-auto max-w-6xl px-5 py-24">
          <h2 className="revela font-display text-3xl font-bold text-balance sm:text-4xl">
            {c.diferencas.titulo}
          </h2>

          <div className="mt-10 grid gap-5 lg:grid-cols-3">
            {c.diferencas.itens.map((item, i) => (
              <div
                key={item.titulo}
                className="revela painel rounded-2xl p-6"
                style={{ transitionDelay: `${i * 80}ms` }}
              >
                <h3 className="font-display mt-4 text-lg font-semibold text-balance text-tinta">{item.titulo}</h3>
                <p className="mt-2 text-sm leading-relaxed text-fraca">{item.texto}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* --------------------------------------------------------------- planos */}
      <section id="planos" className="scroll-mt-16">
        <div className="mx-auto max-w-6xl px-5 py-24">
          <div className="text-center">
            <h2 className="revela font-display text-3xl font-bold sm:text-4xl">Planos</h2>
            <p className="revela mt-2 text-fraca">Comece com 7 dias grátis. Depois, o plano que couber na sua frota.</p>

            <div className="revela mt-7 inline-flex items-center gap-1 rounded-xl border border-borda bg-superficie p-1">
              {(['mensal', 'anual'] as const).map((opcao) => (
                <button
                  key={opcao}
                  type="button"
                  onClick={() => setCiclo(opcao)}
                  className={`rounded-lg px-4 py-2 text-sm font-semibold capitalize transition-colors ${
                    ciclo === opcao ? 'bg-superficie2 text-tinta' : 'text-tenue hover:text-fraca'
                  }`}
                >
                  {opcao}
                  {opcao === 'anual' && (
                    <span className="ml-1.5 text-xs font-medium text-ok">2 meses grátis</span>
                  )}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {planos.map((plano, i) => {
              const destaque = i === 1
              return (
                <div
                  key={plano.id}
                  className={`revela relative rounded-2xl p-6 ${
                    destaque
                      ? 'painel border-destaque'
                      : 'painel'
                  }`}
                  style={{ transitionDelay: `${i * 70}ms` }}
                >
                  {destaque && (
                    <span className="absolute -top-2.5 left-6 rounded-full bg-destaque px-2.5 py-0.5 text-[11px] font-bold text-[#08121c]">
                      Mais escolhido
                    </span>
                  )}
                  <h3 className="font-display text-xl font-bold text-tinta">{plano.nome}</h3>
                  <p className="mt-1 min-h-10 text-sm text-fraca">{plano.descricao}</p>

                  <p className="mt-5 flex items-baseline gap-1.5">
                    <span className="font-display text-4xl font-extrabold text-tinta tabular-nums">
                      {moeda(precoDe(plano))}
                    </span>
                    <span className="text-sm text-tenue">{ciclo === 'anual' ? 'por ano' : 'por mês'}</span>
                  </p>
                  {ciclo === 'anual' && (
                    <p className="mt-1 text-xs font-semibold text-ok">
                      Economia de {moeda(economiaDe(plano))} no ano
                    </p>
                  )}

                  <ul className="mt-6 space-y-2.5 text-sm text-fraca">
                    {[
                      plano.limite_motoristas ? `Até ${plano.limite_motoristas} motoristas` : 'Motoristas à vontade',
                      plano.limite_servicos_mes ? `${plano.limite_servicos_mes} serviços por mês` : 'Serviços à vontade',
                      'Aviso por WhatsApp',
                      'Acerto de motoristas e indicadores',
                      'Suporte por WhatsApp',
                    ].map((item) => (
                      <li key={item} className="flex items-start gap-2">
                        <Icone nome="check" className="mt-0.5 h-4 w-4 shrink-0 text-ok" traco={2.6} />
                        {item}
                      </li>
                    ))}
                  </ul>

                  <div className="mt-6">
                    <BotaoLink
                      para={`/criar-conta?plano=${plano.id}`}
                      tom={destaque ? 'principal' : 'contorno'}
                      largo
                    >
                      Começar o teste
                    </BotaoLink>
                  </div>
                </div>
              )
            })}

            {planos.length === 0 && <p className="text-sm text-tenue">Não consegui carregar os planos agora.</p>}
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------ indicação */}
      <section className="border-y border-borda bg-fundo2">
        <div className="mx-auto max-w-4xl px-5 py-16">
          <div className="revela painel flex flex-col items-start gap-6 rounded-3xl p-8 sm:flex-row sm:items-center">
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-borda text-fraca">
              <Icone nome="usuario" className="h-6 w-6" />
            </span>
            <div className="flex-1">
              <h2 className="font-display text-xl font-bold text-balance text-tinta">{c.indicacao.titulo}</h2>
              <p className="mt-1.5 text-sm leading-relaxed text-fraca">{c.indicacao.texto}</p>
            </div>
            <BotaoLink para="/criar-conta" tom="contorno">
              {c.indicacao.botao}
            </BotaoLink>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------ perguntas */}
      <section className="mx-auto max-w-3xl px-5 py-24">
        <h2 className="revela font-display text-3xl font-bold sm:text-4xl">Perguntas que sempre fazem</h2>
        <div className="revela mt-8">
          {c.perguntas.map((item) => (
            <Pergunta key={item.p} {...item} />
          ))}
        </div>
      </section>

      {/* -------------------------------------------------------------- chamada */}
      <section className="relative overflow-hidden border-t border-borda">
        <div className="aurora relative mx-auto max-w-3xl px-5 py-24 text-center">
          <h2 className="revela font-display relative text-3xl font-bold text-balance sm:text-5xl">
            {c.chamada.titulo}
          </h2>
          <p className="revela relative mx-auto mt-4 max-w-md text-lg text-fraca">{c.chamada.texto}</p>
          <div className="revela relative mt-8 flex justify-center">
            <BotaoLink para="/criar-conta" tamanho="grande">
              {c.chamada.botao}
              <Icone nome="seta" className="h-4 w-4" />
            </BotaoLink>
          </div>
          <p className="revela relative mt-4 text-sm text-tenue">{c.chamada.rodape}</p>
        </div>
      </section>

      <footer className="border-t border-borda">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-5 py-8 text-sm text-tenue sm:flex-row sm:items-center sm:justify-between">
          <span>
            <span className="font-display font-bold text-fraca">{c.marca.nome}</span> · {c.rodape}
          </span>
          <span className="flex gap-4">
            <Link to="/entrar" className="hover:text-tinta">
              Entrar
            </Link>
            <Link to="/diagnostico" className="hover:text-tinta">
              Conferir instalação
            </Link>
          </span>
        </div>
      </footer>

      <Suporte />
    </div>
  )
}
