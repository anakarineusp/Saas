// Cria a assinatura no Asaas e devolve o endereço do checkout, onde o cliente
// paga por PIX, boleto ou cartão. Chamado pela tela de planos.

import { createClient } from 'jsr:@supabase/supabase-js@2'

const ASAAS = Deno.env.get('ASAAS_API_URL') ?? 'https://api-sandbox.asaas.com/v3'
const CHAVE = Deno.env.get('ASAAS_API_KEY') ?? ''

async function noAsaas(caminho: string, opcoes: RequestInit = {}) {
  const resposta = await fetch(`${ASAAS}${caminho}`, {
    ...opcoes,
    headers: {
      'content-type': 'application/json',
      access_token: CHAVE,
      ...(opcoes.headers ?? {}),
    },
  })
  const corpo = await resposta.json()
  if (!resposta.ok) {
    throw new Error(corpo?.errors?.[0]?.description ?? 'Erro na empresa de pagamentos')
  }
  return corpo
}

Deno.serve(async (requisicao) => {
  if (requisicao.method !== 'POST') return new Response('Método não aceito', { status: 405 })
  if (!CHAVE) return new Response(JSON.stringify({ erro: 'Falta configurar a chave do Asaas.' }), { status: 500 })

  const autorizacao = requisicao.headers.get('Authorization') ?? ''

  // O cliente que fala pelo usuário logado: as regras de visibilidade valem.
  const comoUsuario = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: autorizacao } } },
  )
  const comoServidor = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  const { data: usuario } = await comoUsuario.auth.getUser()
  if (!usuario?.user) return new Response('Não autorizado', { status: 401 })

  const { plano } = await requisicao.json().catch(() => ({ plano: null }))
  if (!plano) return new Response(JSON.stringify({ erro: 'Escolha um plano.' }), { status: 400 })

  const { data: assinatura, error: erroAssinatura } = await comoUsuario
    .from('minha_assinatura')
    .select('empresa_id, empresa')
    .single()

  if (erroAssinatura || !assinatura) return new Response('Empresa não encontrada', { status: 404 })

  const { data: dadosPlano } = await comoUsuario
    .from('planos').select('id, nome, preco_centavos').eq('id', plano).single()

  if (!dadosPlano) return new Response(JSON.stringify({ erro: 'Plano não encontrado.' }), { status: 400 })

  const { data: empresa } = await comoServidor
    .from('empresas').select('nome, documento, telefone').eq('id', assinatura.empresa_id).single()

  const { data: atual } = await comoServidor
    .from('assinaturas').select('provedor_cliente_id').eq('empresa_id', assinatura.empresa_id).single()

  try {
    // 1. cliente no Asaas (reaproveita se já existir)
    let clienteId = atual?.provedor_cliente_id
    if (!clienteId) {
      const cliente = await noAsaas('/customers', {
        method: 'POST',
        body: JSON.stringify({
          name: empresa?.nome ?? assinatura.empresa,
          cpfCnpj: (empresa?.documento ?? '').replace(/\D/g, ''),
          mobilePhone: (empresa?.telefone ?? '').replace(/\D/g, ''),
          email: usuario.user.email,
          externalReference: assinatura.empresa_id,
        }),
      })
      clienteId = cliente.id
    }

    // 2. assinatura mensal
    const amanha = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
    const nova = await noAsaas('/subscriptions', {
      method: 'POST',
      body: JSON.stringify({
        customer: clienteId,
        billingType: 'UNDEFINED', // deixa o cliente escolher PIX, boleto ou cartão
        cycle: 'MONTHLY',
        value: dadosPlano.preco_centavos / 100,
        nextDueDate: amanha,
        description: `Plano ${dadosPlano.nome}`,
        externalReference: assinatura.empresa_id,
      }),
    })

    // 3. guarda no nosso banco e devolve o endereço de pagamento
    await comoServidor.from('assinaturas').update({
      plano_id: dadosPlano.id,
      provedor: 'asaas',
      provedor_cliente_id: clienteId,
      provedor_assinatura_id: nova.id,
      atualizada_em: new Date().toISOString(),
    }).eq('empresa_id', assinatura.empresa_id)

    const cobrancas = await noAsaas(`/payments?subscription=${nova.id}&limit=1`)
    const checkout = cobrancas?.data?.[0]?.invoiceUrl ?? null

    return new Response(JSON.stringify({ checkout, assinatura: nova.id }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    })
  } catch (erro) {
    console.error(erro)
    return new Response(JSON.stringify({ erro: String((erro as Error).message) }), { status: 502 })
  }
})
