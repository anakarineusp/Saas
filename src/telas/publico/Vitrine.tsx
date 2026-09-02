import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { BotaoLink } from '../../componentes/Botao'
import { BotaoTema } from '../../componentes/BotaoTema'
import { EstradaNoturna } from '../../componentes/EstradaNoturna'
import { Icone } from '../../componentes/Icone'
import { Suporte } from '../../componentes/Suporte'
import { conteudoDaVitrine, planos as buscarPlanos } from '../../dados'
import { moeda } from '../../lib/formato'
import { porteDoPlano } from '../../lib/planos'
import { useRevelarAoRolar } from '../../lib/revelar'
import type { Ciclo, Plano } from '../../tipos'
import { VITRINE_PADRAO, type ConteudoDaVitrine } from '../../vitrine'

/* ---------------------------------------------------------------------------
   A vitrine.

   A régua aqui é site de produto, não site de startup: título grande e
   alinhado à esquerda, régua fina separando os assuntos, e a tela do próprio
   aplicativo aparecendo de verdade em vez de cartão bonito explicando o que
   ele faz. Cor só no que é clicável.
--------------------------------------------------------------------------- */

/** O miolo do celular: a tela Hoje, do jeitinho que ela é no aplicativo. */
function TelaDoAplicativo() {
  const dias = [
    { sigla: 'ter', numero: 26 },
    { sigla: 'qua', numero: 27 },
    { sigla: 'qui', numero: 28, hoje: true },
    { sigla: 'sex', numero: 29 },
    { sigla: 'sáb', numero: 30 },
  ]

  return (
    <div className="flex h-full flex-col bg-fundo text-left">
      <div className="flex items-center justify-between border-b border-borda px-4 py-3">
        <span className="font-display text-[13px] font-bold text-tinta">Serra Transfer</span>
        <span className="flex gap-2 text-tenue">
          <Icone nome="sol" className="h-3.5 w-3.5" />
          <Icone nome="sair" className="h-3.5 w-3.5" />
        </span>
      </div>

      <div className="flex gap-1.5 px-4 pt-4">
        {dias.map((d) => (
          <span
            key={d.numero}
            className={`flex flex-1 flex-col items-center rounded-lg py-1.5 text-[10px] ${
              d.hoje ? 'bg-destaque text-[#08121c]' : 'text-tenue'
            }`}
          >
            <span className="uppercase">{d.sigla}</span>
            <span className="font-display text-[13px] font-bold tabular-nums">{d.numero}</span>
          </span>
        ))}
      </div>

      <p className="px-4 pt-3 text-[10px] tracking-[0.14em] text-tenue uppercase">3 serviços · 2 motoristas</p>

      <div className="mt-2 space-y-2 px-4">
        <div className="painel rounded-xl p-3">
          <div className="flex items-center gap-1.5 text-[10px] whitespace-nowrap">
            <span className="font-display text-[13px] font-bold text-tinta tabular-nums">06:40</span>
            <span className="rounded bg-superficie2 px-1 py-0.5 text-fraca">Transfer IN</span>
            <span className="text-tenue">5 pax</span>
            <span className="ml-auto flex items-center gap-1 text-ok">
              <span className="h-1 w-1 rounded-full bg-ok" />
              Confirmado
            </span>
          </div>
          <p className="mt-1.5 text-[12px] font-semibold text-tinta">
            Grupo Tavares <span className="text-[10px] font-normal text-tenue">Voo G3 1408</span>
          </p>
          <p className="text-[10px] text-fraca">Salgado Filho → Pousada Vila Suíça</p>
          <div className="mt-2 flex items-center justify-between border-t border-borda pt-2 text-[10px]">
            <span className="text-fraca">Jocemar · Spin</span>
            <span className="font-display text-[12px] font-bold text-tinta tabular-nums">R$ 480,00</span>
          </div>
        </div>

        <div className="painel rounded-xl p-3">
          <div className="flex items-center gap-1.5 text-[10px] whitespace-nowrap">
            <span className="font-display text-[13px] font-bold text-tinta tabular-nums">14:20</span>
            <span className="rounded bg-superficie2 px-1 py-0.5 text-fraca">Passeio</span>
            <span className="text-tenue">2 pax</span>
            <span className="ml-auto flex items-center gap-1 text-atencao">
              <span className="h-1 w-1 rounded-full bg-atencao" />
              Sem motorista
            </span>
          </div>
          <p className="mt-1.5 text-[12px] font-semibold text-tinta">Família Bertoldi</p>
          <p className="text-[10px] text-fraca">Gramado → Vale dos Vinhedos</p>
          <div className="mt-2 flex items-center justify-between border-t border-borda pt-2 text-[10px]">
            <span className="font-semibold text-destaque">Escalar motorista</span>
            <span className="font-display text-[12px] font-bold text-tinta tabular-nums">R$ 690,00</span>
          </div>
        </div>

        <div className="painel rounded-xl p-3">
          <div className="flex items-center gap-1.5 text-[10px] whitespace-nowrap">
            <span className="font-display text-[13px] font-bold text-tinta tabular-nums">19:05</span>
            <span className="rounded bg-superficie2 px-1 py-0.5 text-fraca">Transfer OUT</span>
            <span className="text-tenue">3 pax</span>
            <span className="ml-auto flex items-center gap-1 text-fraca">
              <span className="h-1 w-1 rounded-full bg-fraca" />
              Aguardando
            </span>
          </div>
          <p className="mt-1.5 text-[12px] font-semibold text-tinta">Sra. Kubitschek</p>
          <p className="text-[10px] text-fraca">Hotel Ritta Höppner → Salgado Filho</p>
          <div className="mt-2 flex items-center justify-between border-t border-borda pt-2 text-[10px]">
            <span className="text-fraca">Luciane · Onix</span>
            <span className="font-display text-[12px] font-bold text-tinta tabular-nums">R$ 520,00</span>
          </div>
        </div>
      </div>

    </div>
  )
}

/** A moldura do aparelho. */
function Celular() {
  return (
    <div className="w-[275px] rounded-[2rem] border border-bordaforte bg-fundo2 p-1.5 shadow-2xl shadow-black/40 sm:w-[310px]">
      <div className="relative h-[540px] overflow-hidden rounded-[1.6rem] border border-borda sm:h-[620px]">
        <span className="absolute top-2 left-1/2 z-10 h-1 w-14 -translate-x-1/2 rounded-full bg-bordaforte" />
        <TelaDoAplicativo />
      </div>
    </div>
  )
}

/** Título de seção: uma linha de assunto e o título, sempre à esquerda. */
function Assunto({ etiqueta, titulo, apoio }: { etiqueta: string; titulo: string; apoio?: string }) {
  return (
    <div className="max-w-2xl">
      <p className="revela text-[11px] font-semibold tracking-[0.18em] text-tenue uppercase">{etiqueta}</p>
      <h2 className="revela font-display mt-3 text-3xl leading-[1.05] font-extrabold text-balance sm:text-[2.75rem]">
        {titulo}
      </h2>
      {apoio && <p className="revela mt-3 max-w-lg text-fraca">{apoio}</p>}
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
        className="flex w-full items-center justify-between gap-6 py-5 text-left"
      >
        <span className="font-display font-semibold text-tinta">{p}</span>
        <span className="text-tenue">{aberta ? '−' : '+'}</span>
      </button>
      <div className={`grid transition-all duration-300 ${aberta ? 'grid-rows-[1fr] pb-5' : 'grid-rows-[0fr]'}`}>
        <p className="max-w-2xl overflow-hidden text-sm leading-relaxed text-fraca">{r}</p>
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
      <header className="sticky top-0 z-30 border-b border-borda bg-fundo/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3">
          <span className="font-display text-[17px] font-extrabold tracking-tight text-tinta">
            {c.marca.nome}
            <span className="text-destaque">.</span>
          </span>
          <div className="flex items-center gap-3">
            <BotaoTema />
            <Link to="/entrar" className="text-sm font-semibold text-fraca transition-colors hover:text-tinta">
              Entrar
            </Link>
            <BotaoLink para="/criar-conta" tamanho="pequeno">
              Testar grátis
            </BotaoLink>
          </div>
        </div>
      </header>

      {/* ------------------------------------------------------------ abertura */}
      {/* No celular a ordem é texto, aparelho e argumentos: a tela do produto
          precisa aparecer cedo. No computador tudo isso convive lado a lado. */}
      <section className="overflow-hidden border-b border-borda">
        <div className="mx-auto grid max-w-6xl gap-10 px-5 pt-14 sm:pt-20 lg:grid-cols-[1.05fr_auto] lg:grid-rows-[auto_1fr] lg:gap-x-16 lg:gap-y-12">
          <div className="lg:col-start-1 lg:row-start-1">
            <p className="entra text-[11px] font-semibold tracking-[0.18em] text-tenue uppercase">
              {c.topo.etiqueta}
            </p>

            <h1 className="entra atraso-1 font-display mt-5 text-[2.6rem] leading-[0.98] font-extrabold text-balance sm:text-6xl lg:text-[4.5rem]">
              {c.topo.titulo_1}
              <br />
              {c.topo.titulo_2}
            </h1>

            <p className="entra atraso-2 mt-6 max-w-lg text-[17px] leading-relaxed text-fraca">
              {c.topo.subtitulo}
            </p>

            <div className="entra atraso-3 mt-8 flex flex-wrap items-center gap-x-6 gap-y-3">
              <BotaoLink para="/criar-conta" tamanho="grande">
                {c.topo.botao}
                <Icone nome="seta" className="h-4 w-4" />
              </BotaoLink>
              <a
                href="#planos"
                className="text-sm font-semibold text-tinta underline decoration-bordaforte underline-offset-4 hover:decoration-destaque"
              >
                {c.topo.botao_secundario}
              </a>
            </div>

            <p className="entra atraso-4 mt-6 text-sm text-tenue">{c.topo.selos.join(' · ')}</p>
          </div>

          {/* A tela de verdade, cortada pela dobra: mostrar vale mais que descrever. */}
          <div className="entra atraso-5 -mb-20 flex justify-center lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:-mb-24 lg:justify-end lg:self-end">
            {c.topo.imagem ? (
              <img src={c.topo.imagem} alt="" className="w-full max-w-sm rounded-2xl border border-borda object-cover" />
            ) : (
              <Celular />
            )}
          </div>

          <dl className="entra atraso-5 grid gap-6 border-t border-borda pt-6 pb-14 sm:grid-cols-3 sm:gap-8 lg:col-start-1 lg:row-start-2 lg:pb-20">
            {[
              ['20 segundos', 'para lançar um serviço e mandar para o motorista'],
              ['Nenhum aplicativo', 'o motorista abre um link e responde ali mesmo'],
              ['Zero planilha', 'o acerto do mês fica pronto sozinho'],
            ].map(([titulo, texto]) => (
              <div key={titulo}>
                <dt className="font-display font-bold text-tinta">{titulo}</dt>
                <dd className="mt-1 text-sm leading-relaxed text-fraca">{texto}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* ---------------------------------------------------------------- dor */}
      <section className="border-b border-borda">
        <div className="mx-auto max-w-6xl px-5 py-20 sm:py-24">
          <Assunto etiqueta={c.dores.etiqueta} titulo={c.dores.titulo} />

          <ol className="mt-12 border-t border-borda">
            {c.dores.itens.map((dor, i) => (
              <li
                key={dor.titulo}
                className="revela grid gap-1 border-b border-borda py-6 sm:grid-cols-[3.5rem_1fr_1.1fr] sm:gap-6"
                style={{ transitionDelay: `${i * 50}ms` }}
              >
                <span className="font-display text-sm font-bold text-tenue tabular-nums">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <h3 className="font-display font-bold text-tinta">{dor.titulo}</h3>
                <p className="text-sm leading-relaxed text-fraca">{dor.texto}</p>
              </li>
            ))}
          </ol>

          <p className="revela font-display mt-10 max-w-xl text-xl leading-snug font-semibold text-balance text-tinta">
            {c.dores.fecho}
          </p>
        </div>
      </section>

      {/* Um respiro: a serra à noite, desenhada em código. */}
      <div className="relative h-28 overflow-hidden border-b border-borda sm:h-36">
        <EstradaNoturna className="absolute inset-0 h-full w-full" />
      </div>

      {/* -------------------------------------------------------- como funciona */}
      <section className="border-b border-borda">
        <div className="mx-auto max-w-6xl px-5 py-20 sm:py-24">
          <Assunto etiqueta={c.passos.etiqueta} titulo={c.passos.titulo} apoio={c.passos.subtitulo} />

          <ol className="mt-12 grid gap-px overflow-hidden rounded-2xl border border-borda bg-borda sm:grid-cols-2 lg:grid-cols-4">
            {c.passos.itens.map((passo, i) => (
              <li
                key={passo.titulo}
                className="revela bg-fundo p-6"
                style={{ transitionDelay: `${i * 60}ms` }}
              >
                <span className="font-display text-sm font-bold text-destaque tabular-nums">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <h3 className="font-display mt-3 font-bold text-tinta">{passo.titulo}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-fraca">{passo.texto}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ----------------------------------------------------------- diferenças */}
      <section className="border-b border-borda">
        <div className="mx-auto max-w-6xl px-5 py-20 sm:py-24">
          <Assunto etiqueta="Diferença" titulo={c.diferencas.titulo} />

          <div className="mt-12 border-t border-borda">
            {c.diferencas.itens.map((item, i) => (
              <div
                key={item.titulo}
                className="revela grid gap-2 border-b border-borda py-8 sm:grid-cols-[1fr_1.2fr] sm:gap-10"
                style={{ transitionDelay: `${i * 60}ms` }}
              >
                <h3 className="font-display text-xl leading-snug font-bold text-balance text-tinta">
                  {item.titulo}
                </h3>
                <p className="text-sm leading-relaxed text-fraca sm:text-base">{item.texto}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* --------------------------------------------------------------- planos */}
      <section id="planos" className="scroll-mt-14 border-b border-borda">
        <div className="mx-auto max-w-6xl px-5 py-20 sm:py-24">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <Assunto etiqueta="Preço" titulo={c.planos.titulo} apoio={c.planos.subtitulo} />

            <div className="revela inline-flex items-center rounded-xl border border-borda p-1">
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
                  {opcao === 'anual' && <span className="ml-1.5 text-xs font-medium text-ok">2 meses grátis</span>}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-12 grid gap-px overflow-hidden rounded-2xl border border-borda bg-borda lg:grid-cols-3">
            {planos.map((plano, i) => (
              <div
                key={plano.id}
                className="revela flex flex-col bg-fundo p-7"
                style={{ transitionDelay: `${i * 60}ms` }}
              >
                <div className="flex items-baseline justify-between gap-3">
                  <h3 className="font-display text-lg font-bold text-tinta">{plano.nome}</h3>
                  <span className="text-xs text-tenue">{porteDoPlano(plano.limite_motoristas)}</span>
                </div>
                <p className="mt-2 min-h-10 text-sm leading-relaxed text-fraca">{plano.descricao}</p>

                <p className="mt-6 flex items-baseline gap-2">
                  <span className="font-display text-[2.5rem] leading-none font-extrabold text-tinta tabular-nums">
                    {moeda(precoDe(plano))}
                  </span>
                  <span className="text-sm text-tenue">{ciclo === 'anual' ? 'por ano' : 'por mês'}</span>
                </p>
                <p className="mt-1.5 h-4 text-xs font-semibold text-ok">
                  {ciclo === 'anual' ? `Economia de ${moeda(economiaDe(plano))} no ano` : ''}
                </p>

                <ul className="mt-6 flex-1 space-y-2 text-sm text-fraca">
                  {[
                    'Agenda do dia e escala de motoristas',
                    'Aviso e confirmação pelo WhatsApp',
                    'Acerto de motoristas e indicadores',
                    'Link de acompanhamento para o hotel',
                    'Avaliação do passageiro',
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-2.5">
                      <Icone nome="check" className="mt-0.5 h-4 w-4 shrink-0 text-tenue" traco={2.4} />
                      {item}
                    </li>
                  ))}
                </ul>

                <div className="mt-7">
                  <BotaoLink para={`/criar-conta?plano=${plano.id}`} tom={i === 1 ? 'principal' : 'contorno'} largo>
                    Testar 7 dias
                  </BotaoLink>
                </div>
              </div>
            ))}

            {planos.length === 0 && (
              <p className="bg-fundo p-7 text-sm text-tenue">Não consegui carregar os planos agora.</p>
            )}
          </div>

          <p className="revela mt-6 text-sm text-tenue">
            Trocar de plano depois é um toque. Se a sua operação crescer, o sistema avisa antes de travar.
          </p>
        </div>
      </section>

      {/* ------------------------------------------------------------ indicação */}
      <section className="border-b border-borda">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 px-5 py-14 sm:flex-row sm:items-center sm:justify-between">
          <div className="revela max-w-xl">
            <h2 className="font-display text-xl font-bold text-tinta">{c.indicacao.titulo}</h2>
            <p className="mt-1.5 text-sm leading-relaxed text-fraca">{c.indicacao.texto}</p>
          </div>
          <BotaoLink para="/criar-conta" tom="contorno">
            {c.indicacao.botao}
          </BotaoLink>
        </div>
      </section>

      {/* ------------------------------------------------------------ perguntas */}
      <section className="border-b border-borda">
        <div className="mx-auto max-w-6xl px-5 py-20 sm:py-24">
          <div className="grid gap-10 lg:grid-cols-[1fr_1.6fr]">
            <h2 className="revela font-display text-3xl leading-[1.05] font-extrabold text-balance sm:text-[2.75rem]">
              Perguntas que sempre fazem
            </h2>
            <div className="revela border-t border-borda">
              {c.perguntas.map((item) => (
                <Pergunta key={item.p} {...item} />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* -------------------------------------------------------------- chamada */}
      <section className="border-b border-borda">
        <div className="mx-auto max-w-6xl px-5 py-20 sm:py-28">
          <h2 className="revela font-display max-w-2xl text-4xl leading-[1] font-extrabold text-balance sm:text-6xl">
            {c.chamada.titulo}
          </h2>
          <p className="revela mt-5 max-w-md text-lg text-fraca">{c.chamada.texto}</p>
          <div className="revela mt-8 flex flex-wrap items-center gap-x-6 gap-y-3">
            <BotaoLink para="/criar-conta" tamanho="grande">
              {c.chamada.botao}
              <Icone nome="seta" className="h-4 w-4" />
            </BotaoLink>
            <span className="text-sm text-tenue">{c.chamada.rodape}</span>
          </div>
        </div>
      </section>

      <footer>
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-5 py-10 text-sm text-tenue sm:flex-row sm:items-center sm:justify-between">
          <span>
            <span className="font-display font-bold text-fraca">{c.marca.nome}</span> · {c.rodape}
          </span>
          <span className="flex gap-5">
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
