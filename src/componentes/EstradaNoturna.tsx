import { useEffect, useRef } from 'react'

/**
 * A abertura da vitrine: uma estrada de serra à noite, com os faróis dos carros
 * subindo e descendo. É desenhada em código, não é foto nem vídeo — abre na
 * hora, funciona em qualquer celular e não depende de banco de imagens.
 *
 * Para quem pediu menos movimento no aparelho, a cena fica parada.
 */
export function EstradaNoturna({ className = '' }: { className?: string }) {
  const tela = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = tela.current
    if (!canvas) return
    const contexto = canvas.getContext('2d')
    if (!contexto) return
    const ctx = contexto

    const paradinho = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    let largura = 0
    let altura = 0
    let quadro = 0
    let visivel = true

    const medir = () => {
      const escala = Math.min(window.devicePixelRatio || 1, 2)
      const caixa = canvas.getBoundingClientRect()
      largura = Math.max(1, caixa.width)
      altura = Math.max(1, caixa.height)
      canvas.width = largura * escala
      canvas.height = altura * escala
      ctx.setTransform(escala, 0, 0, escala, 0, 0)
    }

    // Cada farol é um ponto de luz que percorre a estrada.
    type Farol = { t: number; faixa: -1 | 1; velocidade: number; subindo: boolean }
    const farois: Farol[] = Array.from({ length: 9 }, () => nascer())

    function nascer(): Farol {
      const subindo = Math.random() > 0.45
      return {
        t: Math.random(),
        faixa: subindo ? 1 : -1,
        velocidade: 0.055 + Math.random() * 0.07,
        subindo,
      }
    }

    const estrelas = Array.from({ length: 60 }, () => ({
      x: Math.random(),
      y: Math.random() * 0.55,
      brilho: 0.25 + Math.random() * 0.6,
      cintila: Math.random() * Math.PI * 2,
    }))

    /** A posição na estrada: t=0 no horizonte, t=1 na frente de quem olha. */
    function naEstrada(t: number, faixa: number) {
      const horizonte = altura * 0.58
      const fuga = largura * 0.52
      const curvatura = Math.sin(t * 1.5) * largura * 0.06
      const abertura = t * t * largura * 0.42
      return {
        x: fuga + curvatura + faixa * abertura * 0.55,
        y: horizonte + (altura - horizonte) * (t * t * 0.96 + t * 0.04),
        escala: 0.25 + t * t * 2.6,
      }
    }

    function corDoTema() {
      const claro = document.documentElement.dataset.tema === 'claro'
      return claro
        ? { ceu1: '#dbe8fb', ceu2: '#f4f7fc', serra1: '#9fb4d2', serra2: '#c3d3e8', pista: '#b9c8dd', luz: '#0f7fc4', tras: '#d33843', estrela: '#7c93b5' }
        : { ceu1: '#050810', ceu2: '#0d1830', serra1: '#0a1424', serra2: '#101d33', pista: '#16233a', luz: '#9fe4ff', tras: '#ff6a72', estrela: '#cfe2ff' }
    }

    /** Silhueta de montanha, sempre igual (a semente é fixa). */
    function serra(base: number, amplitude: number, semente: number, cor: string) {
      ctx.beginPath()
      ctx.moveTo(0, altura)
      for (let x = 0; x <= largura; x += 8) {
        const p = x / largura
        const y =
          base -
          Math.sin(p * 5.2 + semente) * amplitude -
          Math.sin(p * 11.5 + semente * 2.3) * amplitude * 0.35 -
          Math.sin(p * 2.1 + semente * 0.7) * amplitude * 0.6
        ctx.lineTo(x, y)
      }
      ctx.lineTo(largura, altura)
      ctx.closePath()
      ctx.fillStyle = cor
      ctx.fill()
    }

    function desenhar(tempo: number) {
      const c = corDoTema()
      const horizonte = altura * 0.58

      // céu
      const ceu = ctx.createLinearGradient(0, 0, 0, horizonte)
      ceu.addColorStop(0, c.ceu1)
      ceu.addColorStop(1, c.ceu2)
      ctx.fillStyle = ceu
      ctx.fillRect(0, 0, largura, altura)

      // estrelas
      for (const estrela of estrelas) {
        const cintilar = paradinho ? 1 : 0.65 + Math.sin(tempo * 0.0012 + estrela.cintila) * 0.35
        ctx.globalAlpha = estrela.brilho * cintilar * 0.8
        ctx.fillStyle = c.estrela
        ctx.fillRect(estrela.x * largura, estrela.y * horizonte, 1.4, 1.4)
      }
      ctx.globalAlpha = 1

      // serras, uma atrás da outra
      serra(horizonte + 6, altura * 0.1, 1.4, c.serra2)
      serra(horizonte + 18, altura * 0.14, 3.1, c.serra1)

      // pista
      const pistaEsq = naEstrada(1, -1.9)
      const pistaDir = naEstrada(1, 1.9)
      ctx.beginPath()
      ctx.moveTo(largura * 0.52, horizonte)
      ctx.lineTo(pistaDir.x, altura)
      ctx.lineTo(pistaEsq.x, altura)
      ctx.closePath()
      const asfalto = ctx.createLinearGradient(0, horizonte, 0, altura)
      asfalto.addColorStop(0, c.serra1)
      asfalto.addColorStop(1, c.pista)
      ctx.fillStyle = asfalto
      ctx.fill()

      // faróis
      for (const farol of farois) {
        if (!paradinho) {
          farol.t += (farol.velocidade / 60) * (farol.subindo ? 1 : -1)
          if (farol.t > 1.05 || farol.t < -0.05) Object.assign(farol, nascer(), { t: farol.subindo ? 0 : 1 })
        }
        const t = Math.max(0, Math.min(1, farol.t))
        const p = naEstrada(t, farol.faixa)
        const cor = farol.subindo ? c.luz : c.tras
        const raio = Math.max(1.2, p.escala * 2.4)

        const halo = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, raio * 7)
        halo.addColorStop(0, cor)
        halo.addColorStop(0.25, `${cor}66`)
        halo.addColorStop(1, 'transparent')
        ctx.globalAlpha = 0.18 + t * 0.55
        ctx.fillStyle = halo
        ctx.beginPath()
        ctx.arc(p.x, p.y, raio * 7, 0, Math.PI * 2)
        ctx.fill()

        ctx.globalAlpha = 0.4 + t * 0.6
        ctx.fillStyle = cor
        ctx.beginPath()
        ctx.arc(p.x, p.y, raio, 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.globalAlpha = 1

      // névoa no encontro do céu com a serra
      const nevoa = ctx.createLinearGradient(0, horizonte - altura * 0.12, 0, horizonte + altura * 0.1)
      nevoa.addColorStop(0, 'transparent')
      nevoa.addColorStop(0.5, `${c.ceu2}cc`)
      nevoa.addColorStop(1, 'transparent')
      ctx.fillStyle = nevoa
      ctx.fillRect(0, horizonte - altura * 0.12, largura, altura * 0.22)
    }

    const rodar = (tempo: number) => {
      if (visivel) desenhar(tempo)
      quadro = requestAnimationFrame(rodar)
    }

    medir()
    desenhar(0)
    if (!paradinho) quadro = requestAnimationFrame(rodar)

    const aoRedimensionar = () => {
      medir()
      desenhar(performance.now())
    }
    const aoTrocarDeAba = () => {
      visivel = !document.hidden
    }

    window.addEventListener('resize', aoRedimensionar)
    document.addEventListener('visibilitychange', aoTrocarDeAba)

    return () => {
      cancelAnimationFrame(quadro)
      window.removeEventListener('resize', aoRedimensionar)
      document.removeEventListener('visibilitychange', aoTrocarDeAba)
    }
  }, [])

  return <canvas ref={tela} className={className} aria-hidden="true" />
}
