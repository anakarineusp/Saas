import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { versaoDoBanco, VERSAO_ESPERADA } from '../../dados'
import { chave, endereco, enderecoOriginal } from '../../supabase'
import { supabase } from '../../supabase'

type Estado = 'testando' | 'ok' | 'erro'

function Linha({ titulo, valor, bom }: { titulo: string; valor: string; bom: boolean | null }) {
  const cor = bom === null ? 'text-tenue' : bom ? 'text-ok' : 'text-alerta'
  const marca = bom === null ? '·' : bom ? '✓' : '✕'
  return (
    <div className="flex gap-3 border-t border-borda py-3 first:border-t-0 first:pt-0">
      <span className={`w-4 shrink-0 font-bold ${cor}`}>{marca}</span>
      <span className="min-w-0">
        <span className="block text-sm font-semibold text-tinta">{titulo}</span>
        <span className="block text-xs break-all text-tenue">{valor}</span>
      </span>
    </div>
  )
}

/** Página de conferência: mostra o que o site está usando e testa a ligação. */
export function Diagnostico() {
  const [estado, setEstado] = useState<Estado>('testando')
  const [recado, setRecado] = useState('')
  const [planos, setPlanos] = useState(0)
  const [versao, setVersao] = useState<number | null>(null)

  useEffect(() => {
    void (async () => {
      setVersao(await versaoDoBanco())
      const { data, error } = await supabase.from('planos').select('id')
      if (error) {
        setEstado('erro')
        setRecado(error.message)
        return
      }
      setPlanos(data?.length ?? 0)
      setEstado('ok')
    })()
  }, [])

  // Vale qualquer endereço que seja só o site, sem sobra de caminho no fim.
  const enderecoParece = /^https?:\/\/[^/]+$/.test(endereco)
  const foiCorrigido = enderecoOriginal !== endereco && enderecoOriginal !== ''

  return (
    <div className="mx-auto min-h-screen max-w-lg bg-fundo px-5 py-10">
      <h1 className="font-display text-2xl font-bold text-tinta">Conferência da instalação</h1>
      <p className="mt-1 text-sm text-fraca">
        Esta página mostra o que o site está usando neste momento. Serve para achar
        o que está faltando quando alguma coisa não funciona.
      </p>

      <div className="painel mt-6 rounded-2xl p-4">
        <Linha
          titulo="Endereço do banco de dados"
          valor={endereco || 'não configurado'}
          bom={enderecoParece}
        />
        {foiCorrigido && (
          <Linha
            titulo="Endereço corrigido automaticamente"
            valor={`você cadastrou "${enderecoOriginal}" e o sistema está usando "${endereco}"`}
            bom={null}
          />
        )}
        <Linha
          titulo="Chave pública"
          valor={chave ? `cadastrada, começa com ${chave.slice(0, 12)}…` : 'não configurada'}
          bom={chave.length > 20}
        />
        <Linha
          titulo="Versão do banco de dados"
          valor={
            versao === null
              ? 'conferindo…'
              : versao === 0
                ? 'este banco ainda não sabe dizer a versão — está desatualizado'
                : versao >= VERSAO_ESPERADA
                  ? `versão ${versao}, em dia`
                  : `versão ${versao}, e o site precisa da ${VERSAO_ESPERADA}`
          }
          bom={versao === null ? null : versao >= VERSAO_ESPERADA}
        />
        <Linha
          titulo="Conversa com o banco de dados"
          valor={
            estado === 'testando'
              ? 'testando…'
              : estado === 'ok'
                ? `respondeu, com ${planos} ${planos === 1 ? 'plano cadastrado' : 'planos cadastrados'}`
                : recado
          }
          bom={estado === 'testando' ? null : estado === 'ok' && planos > 0}
        />
      </div>

      {versao !== null && versao < VERSAO_ESPERADA && (
        <div className="mt-4 rounded-xl border border-atencao/40 bg-atencao/10 p-4 text-sm text-atencao">
          <p className="font-semibold">O banco de dados está atrás do site.</p>
          <p className="mt-2 leading-relaxed">
            O sistema ganhou recursos novos, e as regras deles ainda não foram aplicadas aqui. Enquanto isso, criar
            conta e outras coisas vão falhar.
          </p>
          <p className="mt-2 leading-relaxed">
            <strong>Como resolver:</strong> abra o arquivo <code>docs/tudo-em-um.sql</code> no GitHub, copie tudo,
            cole no SQL Editor do Supabase e clique em Run. Pode rodar por cima do que já existe, sem medo.
          </p>
        </div>
      )}

      {estado === 'ok' && planos > 0 && versao !== null && versao >= VERSAO_ESPERADA && (
        <p className="mt-4 rounded-xl border border-ok/40 bg-ok/10 p-4 text-sm text-ok">
          Está tudo ligado. Pode usar o sistema normalmente.
        </p>
      )}

      {estado === 'ok' && planos === 0 && (
        <p className="mt-4 rounded-xl border border-atencao/40 bg-atencao/10 p-4 text-sm text-atencao">
          O banco respondeu, mas está sem planos cadastrados. Volte no Supabase, em
          SQL Editor, e rode o arquivo <code>tudo-em-um.sql</code>.
        </p>
      )}

      {estado === 'erro' && (
        <div className="mt-4 rounded-xl border border-alerta/40 bg-alerta/10 p-4 text-sm text-alerta">
          <p className="font-semibold">O banco recusou a conversa.</p>
          <p className="mt-2">
            {/Invalid path/i.test(recado) &&
              'O endereço cadastrado tem sobra no fim. Ele precisa terminar em .supabase.co, sem /rest/v1.'}
            {/Invalid API key|JWT|apikey/i.test(recado) &&
              'A chave pública não confere. Copie de novo a Publishable key (ou anon public) do Supabase.'}
            {!/Invalid path|Invalid API key|JWT|apikey/i.test(recado) &&
              'Veja o recado acima e me mande esta tela.'}
          </p>
          <p className="mt-2 text-xs">
            Depois de corrigir na Vercel, é obrigatório publicar de novo: em Deployments,
            nos três pontinhos, Redeploy. Trocar a variável sozinha não muda o site que já está no ar.
          </p>
        </div>
      )}

      <p className="mt-8 text-center text-sm">
        <Link to="/" className="text-fraca underline underline-offset-2 hover:text-tinta">
          voltar para o começo
        </Link>
      </p>
    </div>
  )
}
