// Percorre o aplicativo inteiro num navegador de verdade, contra o banco local.
// Rode com: bash ferramentas/testar-tudo.sh
//
// Cada linha "ok" abaixo é uma coisa que precisa continuar funcionando.

import { chromium } from 'playwright'

const RAIZ = 'http://localhost:5173'
const FOTOS = process.argv[2] ?? '/tmp/fotos-do-teste'
const marca = Date.now()
const donaEmail = `ana+${marca}@serratransfer.com.br`
const motoristaEmail = `jocemar+${marca}@gmail.com`
const SENHA = 'transfer123'

const erros = []
const b = await chromium.launch({ executablePath: process.env.CHROMIUM ?? '/opt/pw-browsers/chromium' })

function vigiar(p, quem) {
  p.on('pageerror', (e) => erros.push(`${quem}: ${e}`))
  p.on('console', (m) => {
    // As fontes do Google não carregam nesta caixa de testes; no ar, carregam.
    if (m.type() === 'error' && !/ERR_CONNECTION_RESET|fonts\.g/.test(m.text())) {
      erros.push(`${quem}: ${m.text()}`)
    }
  })
}

// O real usa um espaço especial entre "R$" e o número; deixamos igual para comparar.
async function texto(pagina) {
  // innerText devolve o texto como aparece na tela: um título em maiúsculas por
  // estilo vem em maiúsculas. Por isso comparamos tudo em minúsculas.
  return (await pagina.innerText('body')).replace(/\u00a0/g, ' ')
}

/** Confere se um texto aparece na tela, sem se importar com maiúsculas. */
function contem(todo, parte) {
  return todo.toLowerCase().includes(parte.toLowerCase())
}

const ok = []
function confere(condicao, texto) {
  ok.push(`${condicao ? 'ok   ' : 'FALHOU'} ${texto}`)
  if (!condicao) throw new Error('FALHOU: ' + texto)
}

const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, locale: 'pt-BR' })
const p = await ctx.newPage()
vigiar(p, 'empresa')

// ---------- 1. vitrine ----------
await p.goto(RAIZ, { waitUntil: 'networkidle' })
// Rola a página inteira para os blocos que aparecem ao rolar entrarem na foto.
await p.evaluate(async () => {
  for (let y = 0; y < document.body.scrollHeight; y += 400) {
    window.scrollTo(0, y)
    await new Promise((r) => setTimeout(r, 60))
  }
  window.scrollTo(0, 0)
})
await p.waitForTimeout(700)
confere((await texto(p)).includes('Profissional'), 'a vitrine mostra os planos vindos do banco')
await p.screenshot({ path: `${FOTOS}/n1-vitrine.png`, fullPage: true })

// ---------- 2. criar conta da empresa ----------
await p.getByRole('link', { name: 'Testar 7 dias grátis' }).first().click()
await p.getByLabel('E-mail').fill(donaEmail)
await p.getByLabel(/Senha/).fill(SENHA)
await p.getByRole('button', { name: 'Criar minha conta' }).click()
await p.waitForURL('**/sua-empresa', { timeout: 15000 })
await p.screenshot({ path: `${FOTOS}/n2-sua-empresa.png`, fullPage: true })

await p.getByLabel('Nome da empresa').fill('Serra Transfer')
await p.getByLabel('Seu nome').fill('Ana Karine')
await p.getByLabel('WhatsApp').fill('5554999000001')
await p.getByLabel('Cidade').fill('Gramado')
await p.getByLabel(/CNPJ/).fill('12345678000190')
await p.getByRole('button', { name: 'Começar os 7 dias' }).click()
await p.waitForURL((u) => u.pathname === '/app', { timeout: 15000 })
await p.waitForTimeout(800)
confere((await texto(p)).includes('Teste grátis'), 'entrou no app com o teste de 7 dias correndo')
await p.screenshot({ path: `${FOTOS}/n3-app-vazio.png`, fullPage: true })

// ---------- 3. cadastros ----------
await p.getByRole('link', { name: 'Cadastros', exact: true }).click()
await p.waitForTimeout(600)
await p.getByRole('button', { name: 'Novo' }).click()
await p.getByLabel('Nome').fill('Jocemar')
await p.getByLabel(/WhatsApp/).fill('5554999120031')
await p.getByLabel('Veículo').fill('Spin')
await p.getByLabel('Lugares').fill('6')
await p.getByLabel(/Percentual/).fill('40')
await p.getByRole('button', { name: 'Salvar motorista' }).click()
await p.waitForTimeout(900)
confere((await texto(p)).includes('Spin · 6 lugares · 40%'), 'motorista cadastrado no banco')

await p.getByRole('button', { name: 'Indicadores' }).click()
await p.getByRole('button', { name: 'Novo' }).click()
await p.getByLabel('Nome').fill('Pousada Vila Suíça')
await p.getByLabel(/WhatsApp/).fill('555432958120')
await p.getByLabel(/Comissão/).fill('10')
await p.getByRole('button', { name: 'Salvar indicador' }).click()
await p.waitForTimeout(900)
confere((await texto(p)).includes('Comissão de 10%'), 'indicador cadastrado no banco')

await p.getByRole('button', { name: 'Serviços' }).click()
await p.getByRole('button', { name: 'Novo' }).click()
const hoje = new Date().toISOString().slice(0, 10)
await p.getByLabel('Data').fill(hoje)
await p.getByLabel('Hora').fill('14:20')
await p.getByLabel('Passageiro').fill('Grupo Tavares')
await p.getByLabel('Pax').fill('5')
await p.getByLabel(/Valor cobrado/).fill('480,00')
await p.getByLabel('Destino').fill('Pousada Vila Suíça, Gramado')
await p.getByLabel(/Voo/).fill('G3 1408')
await p.getByLabel('Indicação').selectOption({ label: 'Pousada Vila Suíça' })
await p.getByRole('button', { name: 'Salvar serviço' }).click()
await p.waitForTimeout(900)
confere((await texto(p)).includes('R$ 480,00'), 'serviço cadastrado com o valor do cliente')
await p.screenshot({ path: `${FOTOS}/n4-cadastros.png`, fullPage: true })

// ---------- 4. atribuir ----------
await p.getByRole('link', { name: 'Hoje', exact: true }).click()
await p.waitForTimeout(900)
const hojeTexto = await texto(p)
confere(hojeTexto.includes('1 serviço sem motorista'), 'a faixa vermelha aparece com o serviço sem motorista')
await p.screenshot({ path: `${FOTOS}/n5-hoje.png`, fullPage: true })

await p.getByText('Grupo Tavares').first().click()
await p.waitForTimeout(600)
await p.getByRole('button', { name: /Jocemar Spin/ }).click()
await p.waitForTimeout(1200)
const painel = await texto(p)
confere(painel.includes('R$ 192,00'), 'o valor do motorista foi calculado pelo banco: R$ 192,00')
await p.screenshot({ path: `${FOTOS}/n6-atribuido.png`, fullPage: true })

// ---------- 5. link do WhatsApp ----------
const linkWhats = await p.evaluate(async () => {
  const original = window.open
  let capturado = null
  window.open = (u) => { capturado = u; return null }
  const botao = [...document.querySelectorAll('button')].find((b) => b.textContent.trim() === 'Avisar')
  botao.click()
  await new Promise((r) => setTimeout(r, 1500))
  window.open = original
  return capturado
})
confere(!!linkWhats, 'o botão de avisar o motorista montou a mensagem')
const mensagem = decodeURIComponent(new URL(linkWhats).searchParams.get('text')).replace(/\u00a0/g, ' ')
confere(mensagem.includes('R$ 192,00'), 'a mensagem leva o valor do motorista')
confere(!mensagem.includes('480'), 'a mensagem NÃO leva o valor cobrado do cliente')
const linkConfirmar = mensagem.match(/Confirmar: (\S+)/)[1]
console.log('--- MENSAGEM ---'); console.log(mensagem); console.log('--- FIM ---')

// ---------- 6. motorista confirma sem login, noutro aparelho ----------
const ctxMotorista = await b.newContext({ viewport: { width: 390, height: 844 }, locale: 'pt-BR' })
const pm = await ctxMotorista.newPage()
vigiar(pm, 'motorista-sem-login')
await pm.goto(linkConfirmar, { waitUntil: 'networkidle' })
await pm.waitForTimeout(800)
const telaMotorista = await texto(pm)
confere(telaMotorista.includes('R$ 192,00'), 'o motorista vê o valor dele')
confere(!telaMotorista.includes('480'), 'o motorista NÃO vê o valor do cliente')
await pm.screenshot({ path: `${FOTOS}/n7-confirmar.png`, fullPage: true })
await pm.getByRole('button', { name: /Aceito o serviço/ }).click()
await pm.waitForTimeout(1000)
confere((await texto(pm)).includes('Serviço confirmado'), 'o motorista confirmou pelo link')
await pm.screenshot({ path: `${FOTOS}/n8-confirmado.png`, fullPage: true })

// ---------- 7. o app da empresa mostra o check ----------
await p.reload({ waitUntil: 'networkidle' })
await p.waitForTimeout(1200)
confere(!(await texto(p)).includes('sem motorista'), 'na empresa, o serviço saiu da lista de pendentes')

// ---------- 8. acerto ----------
await p.getByRole('link', { name: 'Acerto', exact: true }).click()
await p.waitForTimeout(1000)
const acerto = await texto(p)
confere(acerto.includes('R$ 480,00'), 'o acerto mostra o faturado do mês')
confere(acerto.includes('R$ 192,00'), 'o acerto mostra o quanto pagar ao motorista')
confere(acerto.includes('R$ 48,00'), 'o acerto mostra a comissão do indicador')
await p.screenshot({ path: `${FOTOS}/n9-acerto.png`, fullPage: true })

// ---------- 9. assinatura ----------
await p.goto(`${RAIZ}/app/assinatura`, { waitUntil: 'networkidle' })
await p.waitForTimeout(800)
const assinatura = await texto(p)
confere(assinatura.includes('teste grátis') || assinatura.includes('Faltam'), 'a tela de assinatura mostra o teste correndo')
confere(contem(assinatura, 'Indique e ganhe'), 'a tela de assinatura mostra o código de indicação')
confere(assinatura.includes('R$ 199,00'), 'a tela de assinatura mostra os planos')
await p.screenshot({ path: `${FOTOS}/n10-assinatura.png`, fullPage: true })

// ---------- 10. convite do motorista ----------
await p.goto(`${RAIZ}/app/cadastros`, { waitUntil: 'networkidle' })
await p.waitForTimeout(900)
await p.getByRole('button', { name: /criar link de acesso/ }).click()
await p.waitForTimeout(900)
const textoConvite = await texto(p)
const linkConvite = textoConvite.match(/(http:\/\/localhost:5173\/convite\/\S+)/)[1]
confere(!!linkConvite, 'a empresa gerou o link de convite do motorista')

const ctxConta = await b.newContext({ viewport: { width: 390, height: 844 }, locale: 'pt-BR' })
const pc = await ctxConta.newPage()
vigiar(pc, 'motorista-com-conta')
await pc.goto(linkConvite, { waitUntil: 'networkidle' })
await pc.getByLabel('Seu nome').fill('Jocemar Bariatto')
await pc.getByLabel('E-mail').fill(motoristaEmail)
await pc.getByLabel(/Senha/).fill(SENHA)
await pc.getByRole('button', { name: 'Criar minha conta' }).click()
await pc.waitForURL('**/motorista', { timeout: 15000 })
await pc.waitForTimeout(1200)
const areaMotorista = await texto(pc)
confere(areaMotorista.includes('Grupo Tavares'), 'a área do motorista mostra o serviço dele')
confere(areaMotorista.includes('R$ 192,00'), 'a área do motorista mostra o valor dele')
confere(!areaMotorista.includes('480'), 'a área do motorista NÃO mostra o valor do cliente')
await pc.screenshot({ path: `${FOTOS}/n11-area-motorista.png`, fullPage: true })

// ---------- 11. o painel de quem vende o sistema ----------
// A dona do sistema é criada direto no banco, como será na vida real.
const { execSync } = await import('node:child_process')
const adminEmail = `admin+${marca}@sistema.com.br`
execSync(
  `PGPASSWORD=transfer psql -h 127.0.0.1 -U transfer -d ${process.env.BANCO ?? 'transfer_local'} -v ON_ERROR_STOP=1 ` +
  `-c "insert into auth.users (id, email) values ('99999999-9999-9999-9999-999999999999', '${adminEmail}')" ` +
  `-c "insert into public.local_senhas values ('99999999-9999-9999-9999-999999999999', encode(digest('${SENHA}','sha256'),'hex'))" ` +
  `-c "insert into public.perfis (id, nome, papel) values ('99999999-9999-9999-9999-999999999999','Administração','admin')" ` +
  `-c "create extension if not exists pgcrypto"`,
  { stdio: 'pipe', shell: '/bin/bash' },
)

// e chega um pagamento, como chegaria do Asaas
const empresaId = execSync(
  `PGPASSWORD=transfer psql -h 127.0.0.1 -U transfer -d ${process.env.BANCO ?? 'transfer_local'} -tAc "select id from empresas limit 1"`,
  { stdio: 'pipe', shell: '/bin/bash' },
).toString().trim()

execSync(
  `PGPASSWORD=transfer psql -h 127.0.0.1 -U transfer -d ${process.env.BANCO ?? 'transfer_local'} -v ON_ERROR_STOP=1 -c ` +
  `"select public.processar_evento_pagamento('asaas', jsonb_build_object('id','evt_e2e','event','PAYMENT_CONFIRMED','payment',` +
  `jsonb_build_object('id','pay_e2e','value',199.00,'billingType','PIX','dueDate',current_date::text,'paymentDate',current_date::text,'externalReference','${empresaId}')))"`,
  { stdio: 'pipe', shell: '/bin/bash' },
)

const ctxAdmin = await b.newContext({ viewport: { width: 900, height: 1000 }, locale: 'pt-BR' })
const pa = await ctxAdmin.newPage()
vigiar(pa, 'admin')
await pa.goto(`${RAIZ}/entrar`, { waitUntil: 'networkidle' })
await pa.getByLabel('E-mail').fill(adminEmail)
await pa.getByLabel('Senha').fill(SENHA)
await pa.getByRole('button', { name: 'Entrar' }).click()
await pa.waitForURL('**/admin', { timeout: 15000 })
await pa.waitForTimeout(1200)
const painelAdmin = (await pa.innerText('body')).replace(/\u00a0/g, ' ')
confere(painelAdmin.includes('Serra Transfer'), 'o painel mostra a empresa cliente')
confere(painelAdmin.includes('R$ 199,00'), 'o painel mostra o dinheiro recebido no mês')
confere(painelAdmin.includes('ativa'), 'o painel mostra a assinatura como ativa depois do pagamento')
await pa.screenshot({ path: `${FOTOS}/n12-admin-clientes.png`, fullPage: true })

await pa.getByRole('button', { name: 'Pagamentos' }).click()
await pa.waitForTimeout(600)
const abaPagamentos = (await pa.innerText('body')).replace(/\u00a0/g, ' ')
confere(abaPagamentos.includes('pago'), 'a aba de pagamentos mostra a cobrança paga')
confere(abaPagamentos.includes('pix'), 'e mostra por onde o cliente pagou')
await pa.screenshot({ path: `${FOTOS}/n13-admin-pagamentos.png`, fullPage: true })

// e a empresa, que pagou, deixa de ver o aviso de teste
await p.goto(`${RAIZ}/app/assinatura`, { waitUntil: 'networkidle' })
await p.waitForTimeout(1000)
confere((await texto(p)).includes('Assinatura em dia'), 'do lado da empresa, a assinatura aparece em dia')
await p.screenshot({ path: `${FOTOS}/n14-assinatura-ativa.png`, fullPage: true })

console.log('')
ok.forEach((l) => console.log(l))
console.log('')
console.log('ERROS DE TELA:', erros.length ? erros : 'nenhum')
await b.close()
