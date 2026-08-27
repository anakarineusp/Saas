// Começa o teste de 7 dias já com cartão guardado na empresa de pagamentos.
// A primeira cobrança sai no oitavo dia, sozinha.
//
// IMPORTANTE: os dados do cartão passam por aqui e vão direto para o Asaas.
// Nada de cartão é gravado no nosso banco de dados, em nenhum momento.

import { createClient } from 'jsr:@supabase/supabase-js@2'

const ASAAS = Deno.env.get('ASAAS_API_URL') ?? 'https://api-sandbox.asaas.com/v3'
const CHAVE = Deno.env.get('ASAAS_API_KEY') ?? ''

async function noAsaas(caminho: string, opcoes: RequestInit = {}) {
  const resposta = await fetch(`${ASAAS}${caminho}`, {
    ...opcoes,
    headers: { 'content-type': 'application/json', access_token: CHAVE, ...(opcoes.headers ?? {}) },
  })
  const corpo = await resposta.json()
  if (!resposta.ok) {
    throw new Error(corpo?.errors?.[0]?.description ?? 'A operadora do cartão recusou.')
  }
  return corpo
}

const soNumeros = (v: unknown) => String(v ?? '').replace(/\D/g, '')

Deno.serve(async (requisicao) => {
  if (requisicao.method !== 'POST') return new Response('Método não aceito', { status: 405 })
  if (!CHAVE) {
    return new Response(JSON.stringify({ erro: 'A conta da empresa de pagamentos ainda não foi ligada.' }), {
      status: 503,
      headers: { 'content-type': 'application/json' },
    })
  }

  const autorizacao = requisicao.headers.get('Authorization') ?? ''
  const comoUsuario = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: autorizacao } },
  })
  const comoServidor = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

  const { data: usuario } = await comoUsuario.auth.getUser()
  if (!usuario?.user) return new Response('Não autorizado', { status: 401 })

  const corpo = await requisicao.json().catch(() => null)
  const { plano, cartao, titular } = corpo ?? {}
  if (!plano || !cartao?.numero) {
    return new Response(JSON.stringify({ erro: 'Faltam os dados do cartão.' }), { status: 400 })
  }

  const { data: assinatura } = await comoUsuario.from('minha_assinatura').select('empresa_id').single()
  if (!assinatura) return new Response('Empresa não encontrada', { status: 404 })

  const { data: dadosPlano } = await comoUsuario
    .from('planos').select('id, nome, preco_centavos').eq('id', plano).single()
  if (!dadosPlano) return new Response(JSON.stringify({ erro: 'Plano não encontrado.' }), { status: 400 })

  const { data: empresa } = await comoServidor
    .from('empresas').select('nome, documento, telefone').eq('id', assinatura.empresa_id).single()

  try {
    const cliente = await noAsaas('/customers', {
      method: 'POST',
      body: JSON.stringify({
        name: empresa?.nome,
        cpfCnpj: soNumeros(titular?.documento ?? empresa?.documento),
        email: usuario.user.email,
        mobilePhone: soNumeros(empresa?.telefone),
        externalReference: assinatura.empresa_id,
      }),
    })

    // A primeira cobrança cai no oitavo dia: os 7 primeiros são de graça.
    const oitavoDia = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)

    const nova = await noAsaas('/subscriptions', {
      method: 'POST',
      body: JSON.stringify({
        customer: cliente.id,
        billingType: 'CREDIT_CARD',
        cycle: 'MONTHLY',
        value: dadosPlano.preco_centavos / 100,
        nextDueDate: oitavoDia,
        description: `Plano ${dadosPlano.nome}`,
        externalReference: assinatura.empresa_id,
        creditCard: {
          holderName: cartao.nome,
          number: soNumeros(cartao.numero),
          expiryMonth: String(cartao.mes).padStart(2, '0'),
          expiryYear: String(cartao.ano).length === 2 ? `20${cartao.ano}` : String(cartao.ano),
          ccv: soNumeros(cartao.codigo),
        },
        creditCardHolderInfo: {
          name: titular?.nome ?? cartao.nome,
          email: usuario.user.email,
          cpfCnpj: soNumeros(titular?.documento ?? empresa?.documento),
          postalCode: soNumeros(titular?.cep),
          addressNumber: String(titular?.numero ?? 'S/N'),
          phone: soNumeros(empresa?.telefone),
        },
        remoteIp: requisicao.headers.get('x-forwarded-for')?.split(',')[0]?.trim(),
      }),
    })

    await comoServidor
      .from('assinaturas')
      .update({
        plano_id: dadosPlano.id,
        provedor: 'asaas',
        provedor_cliente_id: cliente.id,
        provedor_assinatura_id: nova.id,
        atualizada_em: new Date().toISOString(),
      })
      .eq('empresa_id', assinatura.empresa_id)

    return new Response(JSON.stringify({ ok: true, primeira_cobranca: oitavoDia }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    })
  } catch (erro) {
    console.error(erro)
    return new Response(JSON.stringify({ erro: String((erro as Error).message) }), {
      status: 402,
      headers: { 'content-type': 'application/json' },
    })
  }
})
