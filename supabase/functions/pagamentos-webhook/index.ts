// Recebe o aviso da empresa de pagamentos e repassa para o banco de dados,
// que é onde mora toda a regra. Este arquivo é de propósito burro e curto.
//
// Endereço depois de publicado:
//   https://<seu-projeto>.supabase.co/functions/v1/pagamentos-webhook
// É esse endereço que se cola no painel do Asaas, em Integrações > Webhooks.

import { createClient } from 'jsr:@supabase/supabase-js@2'

const SEGREDO = Deno.env.get('ASAAS_WEBHOOK_TOKEN') ?? ''

Deno.serve(async (requisicao) => {
  if (requisicao.method !== 'POST') {
    return new Response('Método não aceito', { status: 405 })
  }

  // O Asaas manda de volta o token que você cadastrou no painel dele.
  const token = requisicao.headers.get('asaas-access-token') ?? ''
  if (!SEGREDO || token !== SEGREDO) {
    return new Response('Não autorizado', { status: 401 })
  }

  let evento: unknown
  try {
    evento = await requisicao.json()
  } catch {
    return new Response('Corpo inválido', { status: 400 })
  }

  const banco = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, // chave de servidor: passa por cima das regras de visibilidade
  )

  const { data, error } = await banco.rpc('processar_evento_pagamento', {
    p_provedor: 'asaas',
    p_evento: evento,
  })

  if (error) {
    console.error('falhou ao processar evento', error)
    // devolver erro faz o Asaas tentar de novo mais tarde, que é o certo
    return new Response(JSON.stringify({ erro: error.message }), { status: 500 })
  }

  return new Response(JSON.stringify({ resultado: data }), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  })
})
