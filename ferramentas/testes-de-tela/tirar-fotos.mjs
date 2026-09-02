// Tira fotos das telas para conferir o desenho. Não é teste; é para olhar.
//   node ferramentas/testes-de-tela/tirar-fotos.mjs /tmp/olhar
import { chromium } from 'playwright'
const PASTA = process.argv[2] ?? '/tmp/olhar'
const RAIZ = 'http://localhost:5173'
const b = await chromium.launch({ executablePath: process.env.CHROMIUM ?? '/opt/pw-browsers/chromium' })

async function rolar(p) {
  await p.evaluate(async () => {
    for (let y = 0; y < document.body.scrollHeight; y += 250) {
      window.scrollTo(0, y)
      await new Promise((r) => setTimeout(r, 110))
    }
    window.scrollTo(0, 0)
  })
  await p.waitForTimeout(900)
}

const pc = await b.newPage({ viewport: { width: 1440, height: 900 } })
await pc.goto(RAIZ, { waitUntil: 'networkidle' })
await pc.waitForTimeout(700)
await pc.screenshot({ path: `${PASTA}/pc-abertura.png` })
await rolar(pc)
for (const [nome, alvo] of [['pc-dores', 2], ['pc-passos', 4], ['pc-diferencas', 5], ['pc-planos', 6], ['pc-perguntas', 8]]) {
  const secao = await pc.$(`section:nth-of-type(${alvo})`)
  if (!secao) continue
  await secao.scrollIntoViewIfNeeded()
  await pc.waitForTimeout(600)
  await pc.screenshot({ path: `${PASTA}/${nome}.png` })
}

const cel = await b.newPage({ viewport: { width: 390, height: 844 } })
await cel.goto(RAIZ, { waitUntil: 'networkidle' })
await cel.waitForTimeout(700)
await cel.screenshot({ path: `${PASTA}/cel-abertura.png` })

// telas de entrar e cadastrar
await cel.goto(`${RAIZ}/entrar`, { waitUntil: 'networkidle' })
await cel.waitForTimeout(500)
await cel.screenshot({ path: `${PASTA}/cel-entrar.png` })

// tema claro, na vitrine
await cel.goto(RAIZ, { waitUntil: 'networkidle' })
await cel.evaluate(() => document.documentElement.setAttribute('data-tema', 'claro'))
await cel.waitForTimeout(500)
await cel.screenshot({ path: `${PASTA}/cel-claro.png` })

await b.close()
console.log('fotos em', PASTA)
