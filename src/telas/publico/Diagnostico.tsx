import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { chave, endereco, enderecoOriginal } from '../../supabase'
import { supabase } from '../../supabase'

type Estado = 'testando' | 'ok' | 'erro'

function Linha({ titulo, valor, bom }: { titulo: string; valor: string; bom: boolean | null }) {
  const cor = bom === null ? 'text-slate-500' : bom ? 'text-emerald-700' : 'text-red-700'
  const marca = bom === null ? '·' : bom ? '✓' : '✕'
  return (
    <div className="flex gap-3 border-t border-slate-100 py-3 first:border-t-0 first:pt-0">
      <span className={`w-4 shrink-0 font-bold ${cor}`}>{marca}</span>
      <span className="min-w-0">
        <span className="block text-sm font-medium text-slate-900">{titulo}</span>
        <span className="block text-xs break-all text-slate-500">{valor}</span>
      </span>
    </div>
  )
}

/** Página de conferência: mostra o que o site está usando e testa a ligação. */
export function Diagnostico() {
  const [estado, setEstado] = useState<Estado>('testando')
  const [recado, setRecado] = useState('')
  const [planos, setPlanos] = useState(0)

  useEffect(() => {
    void (async () => {
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
    <div className="mx-auto min-h-screen max-w-lg px-5 py-10">
      <h1 className="text-2xl font-bold text-slate-900">Conferência da instalação</h1>
      <p className="mt-1 text-sm text-slate-500">
        Esta página mostra o que o site está usando neste momento. Serve para achar
        o que está faltando quando alguma coisa não funciona.
      </p>

      <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-4">
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

      {estado === 'ok' && planos > 0 && (
        <p className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
          Está tudo ligado. Pode usar o sistema normalmente.
        </p>
      )}

      {estado === 'ok' && planos === 0 && (
        <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          O banco respondeu, mas está sem planos cadastrados. Volte no Supabase, em
          SQL Editor, e rode o arquivo <code>tudo-em-um.sql</code>.
        </p>
      )}

      {estado === 'erro' && (
        <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
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
        <Link to="/" className="text-slate-500 underline">
          voltar para o começo
        </Link>
      </p>
    </div>
  )
}
