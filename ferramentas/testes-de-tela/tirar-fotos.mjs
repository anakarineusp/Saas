// Tira fotos das telas para conferir o desenho. Não é teste; é para olhar.
//   node ferramentas/testes-de-tela/tirar-fotos.mjs /tmp/olhar
import { chromium } from 'playwright'
const PASTA = process.argv[2] ?? '/tmp/olhar'
const RAIZ = 'http://localhost:5173'
const b = await chromium.launch({ executablePath: process.env.CHROMIUM ?? '/opt/pw-browsers/chromium' })

const pc = await b.newPage({ viewport: { width: 1440, height: 900 } })
await pc.goto(RAIZ, { waitUntil: 'networkidle' })
await pc.waitForTimeout(800)
await pc.screenshot({ path: `${PASTA}/pc-abertura.png` })

const cel = await b.newPage({ viewport: { width: 390, height: 844 } })
await cel.goto(RAIZ, { waitUntil: 'networkidle' })
await cel.waitForTimeout(800)
await cel.screenshot({ path: `${PASTA}/cel-abertura.png` })

await b.close()
console.log('fotos em', PASTA)
