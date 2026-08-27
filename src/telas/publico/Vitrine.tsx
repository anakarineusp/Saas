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
import type { Plano } from '../../tipos'

const PASSOS: { icone: NomeDeIcone; titulo: string; texto: string }[] = [
  {
    icone: 'mais',
    titulo: 'Lance o serviço',
    texto: 'Data, hora, passageiro, origem, destino e valor. Vinte segundos, e o transfer de volta sai de um toque.',
  },
  {
    icone: 'carro',
    titulo: 'Escolha o motorista',
    texto: 'A tela já mostra quem está livre naquele horário, quem tem outro serviço perto e em qual carro o grupo cabe.',
  },
  {
    icone: 'whatsapp',
    titulo: 'Avise pelo WhatsApp',
    texto: 'A mensagem sai pronta. O motorista abre o link e confirma sem instalar nada e sem criar conta.',
  },
  {
    icone: 'dinheiro',
    titulo: 'Feche o mês',
    texto: 'Quanto cada motorista tem a receber, quanto cada hotel indicou e quanto sobrou para a empresa.',
  },
]

const DIFERENCAS: { icone: NomeDeIcone; titulo: string; texto: string }[] = [
  {
    icone: 'usuario',
    titulo: 'O motorista nunca vê o valor do cliente',
    texto:
      'Ele enxerga só o serviço e o valor dele. Isso não é uma tela escondida: no banco de dados, o motorista não tem permissão para chegar nesse número.',
  },
  {
    icone: 'raio',
    titulo: 'Ninguém precisa instalar nada',
    texto:
      'O motorista recebe um link no WhatsApp, abre no navegador e confirma. Sem aplicativo, sem senha, sem treinamento.',
  },
  {
    icone: 'relogio',
    titulo: 'Escala sem conflito de horário',
    texto:
      'Ao atribuir, o sistema avisa se o motorista já tem serviço a menos de duas horas e se o grupo não cabe no carro.',
  },
]

const PERGUNTAS = [
  {
    p: 'Preciso instalar alguma coisa?',
    r: 'Não. Funciona pelo navegador, no celular e no computador. Dá para adicionar o atalho na tela de início e ele abre como um aplicativo.',
  },
  {
    p: 'E os meus motoristas?',
    r: 'Também não. Eles recebem um link pelo WhatsApp e confirmam ali mesmo. Quem quiser pode criar uma conta para ver todos os serviços num lugar só, mas é opcional.',
  },
  {
    p: 'Como funciona o teste de 7 dias?',
    r: 'Você se cadastra e usa tudo por 7 dias sem informar cartão. Se não quiser continuar, é só não assinar — não cobramos nada.',
  },
  {
    p: 'Como eu pago depois?',
    r: 'Por PIX, boleto ou cartão, com renovação mensal. Cancela quando quiser, sem multa e sem fidelidade.',
  },
  {
    p: 'Meus dados ficam misturados com os de outra empresa?',
    r: 'Não. Cada empresa só enxerga o que é dela, e essa separação é garantida pelo banco de dados, não só pela tela.',
  },
]

/** Um cartão de serviço igual ao do sistema, para a pessoa ver antes de entrar. */
function AmostraDaTela() {
  return (
    <div className="painel w-full max-w-xs rounded-2xl p-4">
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
  useRevelarAoRolar()

  useEffect(() => {
    void buscarPlanos().then(setPlanos).catch(() => setPlanos([]))
  }, [])

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
        <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-b from-transparent to-fundo" />

        <div className="relative mx-auto max-w-6xl px-5 pt-16 pb-20 sm:pt-24 sm:pb-28">
          <p className="entra text-xs font-bold tracking-[0.2em] text-destaque uppercase">
            Para empresas de transfer turístico
          </p>
          <h1 className="entra atraso-1 font-display mt-4 max-w-3xl text-4xl leading-[1.05] font-extrabold text-balance sm:text-6xl">
            <span className="texto-destaque">A agenda do dia,</span>
            <br />o motorista certo e o<br />
            acerto do mês.
          </h1>
          <p className="entra atraso-2 mt-6 max-w-lg text-lg leading-relaxed text-fraca">
            Larga a planilha e o caderno. Lance o serviço, escale quem está livre e avise pelo WhatsApp — o motorista
            confirma sem instalar nada, e nunca vê o valor cobrado do cliente.
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
          <p className="entra atraso-4 mt-4 text-sm text-tenue">Sem cartão para começar. Cancela quando quiser.</p>

          <div className="entra atraso-5 mt-14 flex justify-center sm:justify-start">
            <AmostraDaTela />
          </div>
        </div>
      </section>

      {/* -------------------------------------------------------- como funciona */}
      <section className="border-t border-borda bg-fundo2">
        <div className="mx-auto max-w-6xl px-5 py-20">
          <h2 className="revela font-display text-3xl font-bold text-balance">Quatro passos, todo dia</h2>
          <p className="revela mt-2 max-w-lg text-fraca">
            É o mesmo caminho que você já faz no caderno — só que sem esquecer ninguém e com a conta pronta no fim do mês.
          </p>

          <ol className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {PASSOS.map((passo, i) => (
              <li
                key={passo.titulo}
                className="revela painel rounded-2xl p-5"
                style={{ transitionDelay: `${i * 70}ms` }}
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-destaque/12 text-destaque">
                    <Icone nome={passo.icone} className="h-4.5 w-4.5" />
                  </span>
                  <span className="font-display text-xs font-bold text-tenue tabular-nums">
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
      <section className="relative overflow-hidden">
        <div className="aurora relative mx-auto max-w-6xl px-5 py-20">
          <h2 className="revela font-display relative text-3xl font-bold text-balance">
            O que muda no dia a dia
          </h2>

          <div className="relative mt-10 grid gap-5 lg:grid-cols-3">
            {DIFERENCAS.map((item, i) => (
              <div
                key={item.titulo}
                className="revela painel rounded-2xl p-6"
                style={{ transitionDelay: `${i * 80}ms` }}
              >
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-ok/12 text-ok">
                  <Icone nome={item.icone} className="h-5 w-5" />
                </span>
                <h3 className="font-display mt-4 text-lg font-semibold text-tinta text-balance">{item.titulo}</h3>
                <p className="mt-2 text-sm leading-relaxed text-fraca">{item.texto}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* --------------------------------------------------------------- planos */}
      <section id="planos" className="scroll-mt-16 border-t border-borda bg-fundo2">
        <div className="mx-auto max-w-6xl px-5 py-20">
          <h2 className="revela font-display text-3xl font-bold">Planos</h2>
          <p className="revela mt-2 text-fraca">Todos começam com 7 dias grátis, sem cartão.</p>

          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {planos.map((plano, i) => {
              const destaque = i === 1
              return (
                <div
                  key={plano.id}
                  className={`revela relative rounded-2xl p-6 ${
                    destaque
                      ? 'border-2 border-destaque bg-superficie shadow-[0_30px_60px_-30px_var(--c-destaque)]'
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
                      {moeda(plano.preco_centavos)}
                    </span>
                    <span className="text-sm text-tenue">por mês</span>
                  </p>
                  <ul className="mt-6 space-y-2.5 text-sm text-fraca">
                    {[
                      plano.limite_motoristas
                        ? `Até ${plano.limite_motoristas} motoristas`
                        : 'Motoristas à vontade',
                      plano.limite_servicos_mes
                        ? `${plano.limite_servicos_mes} serviços por mês`
                        : 'Serviços à vontade',
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
                  <BotaoLink
                    para="/criar-conta"
                    tom={destaque ? 'principal' : 'contorno'}
                    largo
                  >
                    Começar o teste
                  </BotaoLink>
                </div>
              )
            })}

            {planos.length === 0 && (
              <p className="text-sm text-tenue">Não consegui carregar os planos agora.</p>
            )}
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------ perguntas */}
      <section className="mx-auto max-w-3xl px-5 py-20">
        <h2 className="revela font-display text-3xl font-bold">Perguntas que sempre fazem</h2>
        <div className="revela mt-8">
          {PERGUNTAS.map((item) => (
            <Pergunta key={item.p} {...item} />
          ))}
        </div>
      </section>

      {/* ------------------------------------------------------------- chamada */}
      <section className="border-t border-borda bg-fundo2">
        <div className="mx-auto max-w-3xl px-5 py-20 text-center">
          <h2 className="revela font-display text-3xl font-bold text-balance sm:text-4xl">
            Comece hoje com a agenda de amanhã
          </h2>
          <p className="revela mx-auto mt-3 max-w-md text-fraca">
            Leva menos de dois minutos para cadastrar a empresa e lançar o primeiro serviço.
          </p>
          <div className="revela mt-8 flex justify-center">
            <BotaoLink para="/criar-conta" tamanho="grande">
              Testar 7 dias grátis
              <Icone nome="seta" className="h-4 w-4" />
            </BotaoLink>
          </div>
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
