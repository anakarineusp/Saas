// Roda uma vez por dia e anota, para cada empresa, quantos serviços de amanhã
// ainda estão sem confirmação. O dono vê isso na tela Hoje ao abrir o sistema.
//
// Para agendar: no Supabase, em Integrations > Cron, crie um agendamento diário
// (por exemplo às 18h) chamando esta função.
//
// Se um dia você contratar a API oficial do WhatsApp, o envio automático entra
// aqui: a lista de quem avisar já sai pronta.

import { createClient } from 'jsr:@supabase/supabase-js@2'

Deno.serve(async (requisicao) => {
  const segredo = Deno.env.get('CRON_SECRET') ?? ''
  if (segredo && requisicao.headers.get('x-cron-secret') !== segredo) {
    return new Response('Não autorizado', { status: 401 })
  }

  const banco = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  const { data, error } = await banco.rpc('montar_lembretes')
  if (error) {
    console.error('falhou ao montar os lembretes', error)
    return new Response(JSON.stringify({ erro: error.message }), { status: 500 })
  }

  const empresas = (data ?? []) as { empresa: string; pendentes: number }[]
  console.log(`lembretes do dia: ${empresas.length} empresas com pendência`)

  return new Response(JSON.stringify({ empresas: empresas.length, detalhe: empresas }), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  })
})
