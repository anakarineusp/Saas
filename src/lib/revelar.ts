import { useEffect } from 'react'

/**
 * Faz os blocos com a classe "revela" aparecerem conforme a pessoa rola.
 *
 * O estado escondido é colocado aqui, e não no CSS: se este código não rodar,
 * o conteúdo continua visível. Efeito bonito não pode esconder informação.
 */
export function useRevelarAoRolar() {
  useEffect(() => {
    const alvos = Array.from(document.querySelectorAll('.revela'))
    if (alvos.length === 0) return

    const semMovimento = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (semMovimento || !('IntersectionObserver' in window)) return

    alvos.forEach((alvo) => alvo.classList.add('escondida'))

    const observador = new IntersectionObserver(
      (entradas) => {
        for (const entrada of entradas) {
          if (entrada.isIntersecting) {
            entrada.target.classList.remove('escondida')
            observador.unobserve(entrada.target)
          }
        }
      },
      { rootMargin: '0px 0px -10% 0px', threshold: 0.05 },
    )

    alvos.forEach((alvo) => observador.observe(alvo))

    // Rede de segurança: se por qualquer motivo nada foi revelado, mostra tudo.
    const seguranca = setTimeout(() => {
      document.querySelectorAll('.revela.escondida').forEach((alvo) => {
        const caixa = alvo.getBoundingClientRect()
        if (caixa.top < window.innerHeight * 1.2) alvo.classList.remove('escondida')
      })
    }, 1200)

    return () => {
      clearTimeout(seguranca)
      observador.disconnect()
    }
  }, [])
}
