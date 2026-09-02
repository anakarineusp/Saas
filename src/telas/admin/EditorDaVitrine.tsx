import { useEffect, useRef, useState } from 'react'
import { Erro } from '../../componentes/Aviso'
import { Botao } from '../../componentes/Botao'
import { useAvisar } from '../../componentes/Avisos'
import { Campo, Entrada } from '../../componentes/Campos'
import { Icone } from '../../componentes/Icone'
import { conteudoDaVitrine, enviarImagemDaVitrine, salvarVitrine } from '../../dados'
import { VITRINE_PADRAO, type ConteudoDaVitrine } from '../../vitrine'

/** Caixa de texto de várias linhas, para os parágrafos. */
function Paragrafo({
  rotulo, valor, aoMudar, linhas = 3, dica,
}: {
  rotulo: string
  valor: string
  aoMudar: (v: string) => void
  linhas?: number
  dica?: string
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold tracking-wide text-fraca uppercase">{rotulo}</span>
      <textarea
        value={valor}
        rows={linhas}
        onChange={(e) => aoMudar(e.target.value)}
        className="w-full resize-y rounded-xl border border-borda bg-fundo2 px-3.5 py-3 text-tinta outline-none focus:border-destaque"
      />
      {dica && <span className="mt-1 block text-xs text-tenue">{dica}</span>}
    </label>
  )
}

/** Lista de blocos com título e texto, que dá para acrescentar e remover. */
function ListaDeBlocos({
  rotulo, itens, aoMudar, campo1 = 'Título', campo2 = 'Texto',
}: {
  rotulo: string
  itens: { titulo: string; texto: string }[]
  aoMudar: (itens: { titulo: string; texto: string }[]) => void
  campo1?: string
  campo2?: string
}) {
  const trocar = (i: number, parte: 'titulo' | 'texto', valor: string) =>
    aoMudar(itens.map((item, j) => (i === j ? { ...item, [parte]: valor } : item)))

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-semibold tracking-wide text-fraca uppercase">{rotulo}</span>
        <Botao tom="fantasma" tamanho="pequeno" onClick={() => aoMudar([...itens, { titulo: '', texto: '' }])}>
          <Icone nome="mais" className="h-3.5 w-3.5" />
          Acrescentar
        </Botao>
      </div>
      <div className="space-y-3">
        {itens.map((item, i) => (
          <div key={i} className="rounded-xl border border-borda bg-fundo2 p-3">
            <div className="mb-2 flex items-center gap-2">
              <span className="font-display text-xs font-bold text-tenue">{i + 1}</span>
              <button
                type="button"
                onClick={() => aoMudar(itens.filter((_, j) => j !== i))}
                aria-label="Remover"
                className="ml-auto rounded-full p-1.5 text-tenue hover:bg-alerta/10 hover:text-alerta"
              >
                <Icone nome="lixeira" className="h-4 w-4" />
              </button>
            </div>
            <Entrada value={item.titulo} placeholder={campo1} onChange={(e) => trocar(i, 'titulo', e.target.value)} />
            <textarea
              value={item.texto}
              rows={2}
              placeholder={campo2}
              onChange={(e) => trocar(i, 'texto', e.target.value)}
              className="mt-2 w-full resize-y rounded-xl border border-borda bg-superficie px-3.5 py-2.5 text-sm text-tinta outline-none focus:border-destaque"
            />
          </div>
        ))}
      </div>
    </div>
  )
}

function Secao({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  const [aberta, setAberta] = useState(false)
  return (
    <div className="painel overflow-hidden rounded-2xl">
      <button
        type="button"
        onClick={() => setAberta((a) => !a)}
        aria-expanded={aberta}
        className="flex w-full items-center justify-between gap-3 p-4 text-left"
      >
        <span className="font-display font-bold text-tinta">{titulo}</span>
        <Icone nome="seta" className={`h-4 w-4 text-tenue transition-transform ${aberta ? 'rotate-90' : ''}`} />
      </button>
      {aberta && <div className="space-y-4 border-t border-borda p-4">{children}</div>}
    </div>
  )
}

/** Onde você edita a página de vendas sem mexer em código. */
export function EditorDaVitrine() {
  const avisar = useAvisar()
  const arquivo = useRef<HTMLInputElement>(null)
  const [c, setC] = useState<ConteudoDaVitrine>(VITRINE_PADRAO)
  const [carregando, setCarregando] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState('')

  useEffect(() => {
    void conteudoDaVitrine()
      .then(setC)
      .catch((e) => setErro((e as Error).message))
      .finally(() => setCarregando(false))
  }, [])

  const mudar = <K extends keyof ConteudoDaVitrine>(chave: K, valor: ConteudoDaVitrine[K]) =>
    setC((atual) => ({ ...atual, [chave]: valor }))

  async function salvar() {
    setErro('')
    setSalvando(true)
    try {
      await salvarVitrine(c)
      avisar('Página de vendas atualizada')
    } catch (e) {
      setErro((e as Error).message)
    } finally {
      setSalvando(false)
    }
  }

  async function mandarImagem(f: File) {
    setErro('')
    setEnviando(true)
    try {
      const endereco = await enviarImagemDaVitrine(f)
      mudar('topo', { ...c.topo, imagem: endereco })
      avisar('Imagem enviada')
    } catch (e) {
      setErro((e as Error).message)
    } finally {
      setEnviando(false)
    }
  }

  if (carregando) return <p className="mt-5 text-sm text-tenue">Carregando a página de vendas…</p>

  return (
    <div className="mt-5 space-y-3">
      <div className="painel flex flex-wrap items-center justify-between gap-3 rounded-2xl p-4">
        <p className="text-sm text-fraca">
          Tudo o que aparece na página inicial. Salvou, vale na hora — sem publicar nada.
        </p>
        <div className="flex gap-2">
          <a
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-xl border border-borda px-4 py-2.5 text-sm font-semibold text-fraca hover:text-tinta"
          >
            Ver a página
          </a>
          <Botao disabled={salvando} onClick={() => void salvar()}>
            {salvando ? 'Salvando…' : 'Salvar tudo'}
          </Botao>
        </div>
      </div>

      <Erro>{erro}</Erro>

      <Secao titulo="Marca e cores">
        <Campo rotulo="Nome que aparece no topo">
          <Entrada value={c.marca.nome} onChange={(e) => mudar('marca', { ...c.marca, nome: e.target.value })} />
        </Campo>

        <div>
          <span className="mb-1.5 block text-xs font-semibold tracking-wide text-fraca uppercase">
            Cor de destaque
          </span>
          <div className="flex items-center gap-3">
            <input
              type="color"
              value={c.marca.cor_destaque}
              onChange={(e) => mudar('marca', { ...c.marca, cor_destaque: e.target.value })}
              aria-label="Escolher a cor de destaque"
              className="h-11 w-16 cursor-pointer rounded-lg border border-borda bg-fundo2"
            />
            <input
              value={c.marca.cor_destaque}
              onChange={(e) => mudar('marca', { ...c.marca, cor_destaque: e.target.value })}
              aria-label="Código da cor"
              className="w-32 rounded-xl border border-borda bg-fundo2 px-3 py-2.5 font-mono text-sm text-tinta outline-none focus:border-destaque"
            />
            <span
              className="rounded-lg px-3 py-2 text-sm font-bold"
              style={{ background: c.marca.cor_destaque, color: '#08121c' }}
            >
              exemplo
            </span>
          </div>
          <p className="mt-1.5 text-xs text-tenue">
            É a cor dos botões e dos destaques da página de vendas. Prefira um tom que não canse: cor viva demais
            em fundo escuro pesa e tira a atenção do que importa.
          </p>
        </div>
      </Secao>

      <Secao titulo="Abertura">
        <Campo rotulo="Etiqueta de cima">
          <Entrada value={c.topo.etiqueta} onChange={(e) => mudar('topo', { ...c.topo, etiqueta: e.target.value })} />
        </Campo>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Campo rotulo="Título, primeira linha">
            <Entrada value={c.topo.titulo_1} onChange={(e) => mudar('topo', { ...c.topo, titulo_1: e.target.value })} />
          </Campo>
          <Campo rotulo="Título, segunda linha" dica="Sai logo abaixo da primeira, do mesmo tamanho.">
            <Entrada value={c.topo.titulo_2} onChange={(e) => mudar('topo', { ...c.topo, titulo_2: e.target.value })} />
          </Campo>
        </div>
        <Paragrafo
          rotulo="Texto de apoio"
          valor={c.topo.subtitulo}
          aoMudar={(v) => mudar('topo', { ...c.topo, subtitulo: v })}
        />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Campo rotulo="Botão principal">
            <Entrada value={c.topo.botao} onChange={(e) => mudar('topo', { ...c.topo, botao: e.target.value })} />
          </Campo>
          <Campo rotulo="Botão de apoio">
            <Entrada
              value={c.topo.botao_secundario}
              onChange={(e) => mudar('topo', { ...c.topo, botao_secundario: e.target.value })}
            />
          </Campo>
        </div>
        <Paragrafo
          rotulo="Selos (um por linha)"
          linhas={3}
          valor={c.topo.selos.join('\n')}
          aoMudar={(v) => mudar('topo', { ...c.topo, selos: v.split('\n').filter((x) => x.trim()) })}
        />

        <div>
          <span className="mb-1.5 block text-xs font-semibold tracking-wide text-fraca uppercase">
            Imagem da abertura
          </span>
          <p className="mb-2 text-xs text-tenue">
            Sem imagem, aparece o cartão de exemplo do sistema. Com imagem, ela entra no lugar.
          </p>
          {c.topo.imagem && (
            <img
              src={c.topo.imagem}
              alt=""
              className="mb-3 max-h-48 w-full rounded-xl border border-borda object-cover"
            />
          )}
          <div className="flex flex-wrap gap-2">
            <input
              ref={arquivo}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) void mandarImagem(f)
              }}
            />
            <Botao tom="contorno" disabled={enviando} onClick={() => arquivo.current?.click()}>
              {enviando ? 'Enviando…' : 'Escolher imagem'}
            </Botao>
            {c.topo.imagem && (
              <Botao tom="fantasma" onClick={() => mudar('topo', { ...c.topo, imagem: '' })}>
                Tirar imagem
              </Botao>
            )}
          </div>
          <Entrada
            value={c.topo.imagem}
            onChange={(e) => mudar('topo', { ...c.topo, imagem: e.target.value })}
            placeholder="ou cole o endereço de uma imagem"
          />
        </div>
      </Secao>

      <Secao titulo="A dor (o jeito antigo)">
        <Campo rotulo="Etiqueta">
          <Entrada value={c.dores.etiqueta} onChange={(e) => mudar('dores', { ...c.dores, etiqueta: e.target.value })} />
        </Campo>
        <Paragrafo
          rotulo="Título da seção"
          linhas={2}
          valor={c.dores.titulo}
          aoMudar={(v) => mudar('dores', { ...c.dores, titulo: v })}
        />
        <ListaDeBlocos
          rotulo="Dores"
          itens={c.dores.itens}
          aoMudar={(itens) => mudar('dores', { ...c.dores, itens })}
        />
        <Paragrafo
          rotulo="Frase de fechamento"
          linhas={2}
          valor={c.dores.fecho}
          aoMudar={(v) => mudar('dores', { ...c.dores, fecho: v })}
        />
      </Secao>

      <Secao titulo="Como funciona">
        <Campo rotulo="Etiqueta">
          <Entrada value={c.passos.etiqueta} onChange={(e) => mudar('passos', { ...c.passos, etiqueta: e.target.value })} />
        </Campo>
        <Campo rotulo="Título">
          <Entrada value={c.passos.titulo} onChange={(e) => mudar('passos', { ...c.passos, titulo: e.target.value })} />
        </Campo>
        <Paragrafo
          rotulo="Texto de apoio"
          linhas={2}
          valor={c.passos.subtitulo}
          aoMudar={(v) => mudar('passos', { ...c.passos, subtitulo: v })}
        />
        <ListaDeBlocos
          rotulo="Passos"
          itens={c.passos.itens}
          aoMudar={(itens) => mudar('passos', { ...c.passos, itens })}
        />
      </Secao>

      <Secao titulo="Diferenciais">
        <Campo rotulo="Título">
          <Entrada
            value={c.diferencas.titulo}
            onChange={(e) => mudar('diferencas', { ...c.diferencas, titulo: e.target.value })}
          />
        </Campo>
        <ListaDeBlocos
          rotulo="Diferenciais"
          itens={c.diferencas.itens}
          aoMudar={(itens) => mudar('diferencas', { ...c.diferencas, itens })}
        />
      </Secao>

      <Secao titulo="Planos e indicação">
        <Campo rotulo="Título da seção de planos">
          <Entrada value={c.planos.titulo} onChange={(e) => mudar('planos', { ...c.planos, titulo: e.target.value })} />
        </Campo>
        <Paragrafo
          rotulo="Texto de apoio dos planos"
          linhas={2}
          valor={c.planos.subtitulo}
          aoMudar={(v) => mudar('planos', { ...c.planos, subtitulo: v })}
        />
        <p className="text-xs text-tenue">
          Os nomes e preços dos planos são editados na aba Planos.
        </p>
        <Campo rotulo="Título do bloco de indicação">
          <Entrada
            value={c.indicacao.titulo}
            onChange={(e) => mudar('indicacao', { ...c.indicacao, titulo: e.target.value })}
          />
        </Campo>
        <Paragrafo
          rotulo="Texto da indicação"
          valor={c.indicacao.texto}
          aoMudar={(v) => mudar('indicacao', { ...c.indicacao, texto: v })}
        />
        <Campo rotulo="Botão da indicação">
          <Entrada
            value={c.indicacao.botao}
            onChange={(e) => mudar('indicacao', { ...c.indicacao, botao: e.target.value })}
          />
        </Campo>
      </Secao>

      <Secao titulo="Perguntas frequentes">
        <ListaDeBlocos
          rotulo="Perguntas"
          campo1="Pergunta"
          campo2="Resposta"
          itens={c.perguntas.map((x) => ({ titulo: x.p, texto: x.r }))}
          aoMudar={(itens) => mudar('perguntas', itens.map((x) => ({ p: x.titulo, r: x.texto })))}
        />
      </Secao>

      <Secao titulo="Chamada final e rodapé">
        <Campo rotulo="Título">
          <Entrada value={c.chamada.titulo} onChange={(e) => mudar('chamada', { ...c.chamada, titulo: e.target.value })} />
        </Campo>
        <Paragrafo
          rotulo="Texto"
          linhas={2}
          valor={c.chamada.texto}
          aoMudar={(v) => mudar('chamada', { ...c.chamada, texto: v })}
        />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Campo rotulo="Botão">
            <Entrada value={c.chamada.botao} onChange={(e) => mudar('chamada', { ...c.chamada, botao: e.target.value })} />
          </Campo>
          <Campo rotulo="Frase abaixo do botão">
            <Entrada
              value={c.chamada.rodape}
              onChange={(e) => mudar('chamada', { ...c.chamada, rodape: e.target.value })}
            />
          </Campo>
        </div>
        <Campo rotulo="Rodapé do site">
          <Entrada value={c.rodape} onChange={(e) => mudar('rodape', e.target.value)} />
        </Campo>
      </Secao>

      <div className="flex justify-end gap-2 pt-2">
        <Botao
          tom="fantasma"
          onClick={() => {
            if (window.confirm('Voltar todos os textos ao original? O que você escreveu será perdido.'))
              setC(VITRINE_PADRAO)
          }}
        >
          Voltar ao texto original
        </Botao>
        <Botao disabled={salvando} onClick={() => void salvar()}>
          {salvando ? 'Salvando…' : 'Salvar tudo'}
        </Botao>
      </div>
    </div>
  )
}
