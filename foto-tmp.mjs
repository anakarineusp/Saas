import { chromium } from 'playwright'
const b = await chromium.launch()
const p = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 })
await p.goto('http://localhost:5173/', { waitUntil: 'networkidle' })
await p.evaluate(async () => {
  for (let y = 0; y < document.body.scrollHeight; y += 200) {
    window.scrollTo(0, y)
    await new Promise((r) => setTimeout(r, 120))
  }
  window.scrollTo(0, 0)
})
await p.waitForTimeout(1200)
await p.screenshot({ path: '/tmp/vitrine-nova.png', fullPage: true })
const d = await b.newPage({ viewport: { width: 1280, height: 900 } })
await d.goto('http://localhost:5173/', { waitUntil: 'networkidle' })
await d.waitForTimeout(600)
await d.screenshot({ path: '/tmp/vitrine-desktop.png' })
await b.close()
