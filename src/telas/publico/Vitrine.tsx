import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { BotaoLink } from '../../componentes/Botao'
import { BotaoTema } from '../../componentes/BotaoTema'
import { EstradaNoturna } from '../../componentes/EstradaNoturna'
import { Icone, type NomeDeIcone } from '../../componentes/Icone'
import { Suporte } from '../../componentes/Suporte'
import { NOME_DO_PRODUTO } from '../../config'
import { planos as buscarPlanos } from '../../dados'
import { moeda } from '../../lib/formato'
import { useRevelarAoRolar } from '../../lib/revelar'
import type { Ciclo, Plano } from '../../tipos'

const DORES = [
  {
    titulo: 'A ligação das onze da noite',
    texto: 'Conferindo no caderno quem leva o voo das seis, e ligando para três motoristas até alguém atender.',
  },
  {
    titulo: 'O transfer que furou',
    texto: 'Dois serviços marcados no mesmo horário para o mesmo carro — e o hotel ligando atrás do passageiro.',
  },
  {
    titulo: 'O acerto que não fecha',
    texto: 'Fim do mês somando percentual de motorista na calculadora, e sempre falta um serviço em algum lugar.',
  },
  {
    titulo: 'O valor que vazou',
    texto: 'O motorista viu por acaso quanto o cliente pagou — e a conversa do mês seguinte começou torta.',
  },
]

const PASSOS: { icone: NomeDeIcone; titulo: string; texto: string }[] = [
  {
    icone: 'mais',
    titulo: 'Lance o serviço',
    texto: 'Data, hora, passageiro, rota e valor. Vinte segundos — e o transfer de volta sai de um toque.',
  },
  {
    icone: 'carro',
    titulo: 'Escale quem está livre',
    texto: 'A tela mostra quem já tem serviço naquele horário e em qual carro o grupo cabe. Sem conflito.',
  },
  {
    icone: 'whatsapp',
    titulo: 'Avise pelo WhatsApp',
    texto: 'A mensagem sai pronta. O motorista abre o link e confirma — sem instalar nada, sem criar conta.',
  },
  {
    icone: 'dinheiro',
    titulo: 'Feche o mês sozinho',
    texto: 'Quanto cada motorista recebe, quanto cada hotel indicou, quanto sobrou para você. Pronto.',
  },
]

const DIFERENCAS: { icone: NomeDeIcone; titulo: string; texto: string }[] = [
  {
    icone: 'usuario',
    titulo: 'O motorista nunca vê o valor do cliente',
    texto:
      'Ele enxerga o serviço e o valor dele, mais nada. Não é uma tela escondida: no banco de dados o motorista não tem permissão de chegar nesse número.',
  },
  {
    icone: 'raio',
    titulo: 'Ninguém instala nada',
    texto:
      'O motorista recebe um link no WhatsApp e confirma ali mesmo. Sem aplicativo, sem senha, sem treinar equipe.',
  },
  {
    icone: 'relogio',
    titulo: 'Conflito de horário some',
    texto:
      'Na hora de escalar, o sistema avisa se o motorista tem outro serviço a menos de duas horas e se o grupo não cabe no carro.',
  },
]

const PERGUNTAS = [
  {
    p: 'Preciso instalar alguma coisa?',
    r: 'Não. Funciona pelo navegador, no celular e no computador. Dá para colocar o atalho na tela de início e abre como aplicativo.',
  },
  {
    p: 'E os meus motoristas, vão conseguir usar?',
    r: 'Eles não precisam aprender nada. Recebem um link pelo WhatsApp e tocam em "Aceito". Quem quiser pode criar conta para ver todos os serviços num lugar só, mas é opcional.',
  },
  {
    p: 'Como funciona o teste de 7 dias?',
    r: 'Você se cadastra e usa tudo por 7 dias. Se não quiser continuar, é só não assinar.',
  },
  {
    p: 'Posso cancelar quando quiser?',
    r: 'Pode, sem multa e sem fidelidade. No plano anual, o valor já sai com dois meses de desconto justamente porque é um compromisso maior.',
  },
  {
    p: 'Meus dados ficam misturados com os de outra empresa?',
    r: 'Não. Cada empresa enxerga apenas o que é dela, e essa separação é garantida pelo banco de dados, não só pela tela.',
  },
  {
    p: 'E se eu precisar de ajuda?',
    r: 'Tem um botão de suporte em todas as telas, que abre uma conversa direta no WhatsApp.',
  },
]

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
  useRevelarAoRolar()

  useEffect(() => {
    void buscarPlanos().then(setPlanos).catch(() => setPlanos([]))
  }, [])

  const precoDe = (p: Plano) =>
    ciclo === 'anual' ? (p.preco_anual_centavos ?? p.preco_centavos * 10) : p.preco_centavos

  const economiaDe = (p: Plano) => p.preco_centavos * 12 - (p.preco_anual_centavos ?? p.preco_centavos * 10)

  return (
    <div className="min-h-screen bg-fundo">
      <header className="sticky top-0 z-30 border-b border-borda/60 bg-fundo/80 backdrop-blur-lg">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3.5">
          <span className="font-display text-lg font-bold tracking-tight text-tinta">
            {NOME_DO_PRODUTO}
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
            <p className="entra inline-flex items-center gap-2 rounded-full border border-borda bg-fundo2/70 px-3 py-1.5 text-xs font-semibold text-destaque backdrop-blur">
              <span className="pulsa h-1.5 w-1.5 rounded-full bg-destaque" />
              Feito para transfer turístico na serra
            </p>

            <h1 className="entra atraso-1 font-display mt-5 text-4xl leading-[1.03] font-extrabold text-balance sm:text-6xl">
              Sua operação inteira
              <br />
              <span className="texto-destaque">cabe numa tela.</span>
            </h1>

            <p className="entra atraso-2 mt-6 max-w-lg text-lg leading-relaxed text-fraca">
              Larga o caderno e a planilha. Lance o serviço, escale quem está livre e avise pelo WhatsApp — o
              motorista confirma sem instalar nada, e <strong className="text-tinta">nunca vê o valor cobrado do
              cliente</strong>.
            </p>

            <div className="entra atraso-3 mt-8 flex flex-wrap items-center gap-3">
              <BotaoLink para="/criar-conta" tamanho="grande">
                Testar 7 dias grátis
                <Icone nome="seta" className="h-4 w-4" />
              </BotaoLink>
              <a
                href="#planos"
                className="rounded-xl border border-bordaforte px-6 py-4 text-base font-semibold text-tinta transition-colors hover:bg-superficie2"
              >
                Ver os planos
              </a>
            </div>

            <ul className="entra atraso-4 mt-6 flex flex-wrap gap-x-5 gap-y-2 text-sm text-tenue">
              {['Cancela quando quiser', 'Sem fidelidade', 'Suporte no WhatsApp'].map((item) => (
                <li key={item} className="flex items-center gap-1.5">
                  <Icone nome="check" className="h-3.5 w-3.5 text-ok" traco={3} />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <div className="entra atraso-5 flex justify-center lg:justify-end">
            <AmostraDaTela />
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------------- dor */}
      <section className="border-t border-borda bg-fundo2">
        <div className="mx-auto max-w-6xl px-5 py-20">
          <p className="revela text-xs font-bold tracking-[0.2em] text-alerta uppercase">O jeito antigo</p>
          <h2 className="revela font-display mt-3 max-w-2xl text-3xl font-bold text-balance sm:text-4xl">
            Você não perde dinheiro por falta de cliente. Perde por falta de controle.
          </h2>

          <div className="mt-10 grid gap-4 sm:grid-cols-2">
            {DORES.map((dor, i) => (
              <div
                key={dor.titulo}
                className="revela flex gap-4 rounded-2xl border border-borda bg-superficie/50 p-5"
                style={{ transitionDelay: `${i * 60}ms` }}
              >
                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-alerta/12 text-alerta">
                  <Icone nome="aviso" className="h-4 w-4" />
                </span>
                <div>
                  <h3 className="font-display font-semibold text-tinta">{dor.titulo}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-fraca">{dor.texto}</p>
                </div>
              </div>
            ))}
          </div>

          <p className="revela mx-auto mt-10 max-w-xl text-center text-lg text-balance text-fraca">
            Nada disso é falta de capricho. É o caderno chegando no limite dele.
          </p>
        </div>
      </section>

      {/* -------------------------------------------------------- como funciona */}
      <section className="relative overflow-hidden">
        <div className="aurora relative mx-auto max-w-6xl px-5 py-20">
          <p className="revela relative text-xs font-bold tracking-[0.2em] text-destaque uppercase">O jeito novo</p>
          <h2 className="revela font-display relative mt-3 text-3xl font-bold text-balance sm:text-4xl">
            Quatro passos, todo dia
          </h2>
          <p className="revela relative mt-2 max-w-lg text-fraca">
            É o mesmo caminho que você já faz — sem esquecer ninguém e com a conta pronta no fim do mês.
          </p>

          <ol className="relative mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {PASSOS.map((passo, i) => (
              <li
                key={passo.titulo}
                className="revela painel rounded-2xl p-5"
                style={{ transitionDelay: `${i * 70}ms` }}
              >
                <div className="flex items-center justify-between">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-destaque/12 text-destaque">
                    <Icone nome={passo.icone} className="h-4.5 w-4.5" />
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
      <section className="border-t border-borda bg-fundo2">
        <div className="mx-auto max-w-6xl px-5 py-20">
          <h2 className="revela font-display text-3xl font-bold text-balance sm:text-4xl">
            Três coisas que nenhuma planilha faz
          </h2>

          <div className="mt-10 grid gap-5 lg:grid-cols-3">
            {DIFERENCAS.map((item, i) => (
              <div
                key={item.titulo}
                className="revela painel rounded-2xl p-6"
                style={{ transitionDelay: `${i * 80}ms` }}
              >
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-ok/12 text-ok">
                  <Icone nome={item.icone} className="h-5 w-5" />
                </span>
                <h3 className="font-display mt-4 text-lg font-semibold text-balance text-tinta">{item.titulo}</h3>
                <p className="mt-2 text-sm leading-relaxed text-fraca">{item.texto}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* --------------------------------------------------------------- planos */}
      <section id="planos" className="scroll-mt-16">
        <div className="mx-auto max-w-6xl px-5 py-20">
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
                    ciclo === opcao ? 'bg-destaque text-[#04121f]' : 'text-fraca hover:text-tinta'
                  }`}
                >
                  {opcao}
                  {opcao === 'anual' && (
                    <span className={`ml-1.5 text-xs ${ciclo === 'anual' ? 'text-[#04121f]/70' : 'text-ok'}`}>
                      2 meses grátis
                    </span>
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
                      ? 'border-2 border-destaque bg-superficie shadow-[0_30px_70px_-35px_var(--c-destaque)]'
                      : 'painel'
                  }`}
                  style={{ transitionDelay: `${i * 70}ms` }}
                >
                  {destaque && (
                    <span className="absolute -top-3 left-6 rounded-full bg-destaque px-3 py-1 text-xs font-bold text-[#04121f]">
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
                    <BotaoLink para="/criar-conta" tom={destaque ? 'principal' : 'contorno'} largo>
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
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-destaque/12 text-destaque">
              <Icone nome="usuario" className="h-6 w-6" />
            </span>
            <div className="flex-1">
              <h2 className="font-display text-xl font-bold text-balance text-tinta">
                Indicou, os dois ganham um mês
              </h2>
              <p className="mt-1.5 text-sm leading-relaxed text-fraca">
                Toda empresa recebe um código. Quando alguém entra pelo seu código e vira cliente, você ganha um mês
                grátis — e essa pessoa também. Sem limite de indicações.
              </p>
            </div>
            <BotaoLink para="/criar-conta" tom="contorno">
              Quero meu código
            </BotaoLink>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------ perguntas */}
      <section className="mx-auto max-w-3xl px-5 py-20">
        <h2 className="revela font-display text-3xl font-bold sm:text-4xl">Perguntas que sempre fazem</h2>
        <div className="revela mt-8">
          {PERGUNTAS.map((item) => (
            <Pergunta key={item.p} {...item} />
          ))}
        </div>
      </section>

      {/* -------------------------------------------------------------- chamada */}
      <section className="relative overflow-hidden border-t border-borda">
        <div className="aurora relative mx-auto max-w-3xl px-5 py-24 text-center">
          <h2 className="revela font-display relative text-3xl font-bold text-balance sm:text-5xl">
            Amanhã de manhã, sem caderno.
          </h2>
          <p className="revela relative mx-auto mt-4 max-w-md text-lg text-fraca">
            Leva menos de dois minutos para cadastrar a empresa e lançar o primeiro serviço.
          </p>
          <div className="revela relative mt-8 flex justify-center">
            <BotaoLink para="/criar-conta" tamanho="grande">
              Testar 7 dias grátis
              <Icone nome="seta" className="h-4 w-4" />
            </BotaoLink>
          </div>
          <p className="revela relative mt-4 text-sm text-tenue">Cancela quando quiser. Sem fidelidade.</p>
        </div>
      </section>

      <footer className="border-t border-borda">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-5 py-8 text-sm text-tenue sm:flex-row sm:items-center sm:justify-between">
          <span>
            <span className="font-display font-bold text-fraca">{NOME_DO_PRODUTO}</span> · sistema para empresas de
            transfer turístico
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
