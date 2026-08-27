import { useEffect } from 'react'

/** Faz os blocos com a classe "revela" aparecerem conforme a pessoa rola a página. */
export function useRevelarAoRolar() {
  useEffect(() => {
    const alvos = document.querySelectorAll('.revela')
    if (alvos.length === 0) return

    if (!('IntersectionObserver' in window)) {
      alvos.forEach((alvo) => alvo.classList.add('visivel'))
      return
    }

    const observador = new IntersectionObserver(
      (entradas) => {
        for (const entrada of entradas) {
          if (entrada.isIntersecting) {
            entrada.target.classList.add('visivel')
            observador.unobserve(entrada.target)
          }
        }
      },
      { rootMargin: '0px 0px -12% 0px', threshold: 0.05 },
    )

    alvos.forEach((alvo) => observador.observe(alvo))
    return () => observador.disconnect()
  }, [])
}
