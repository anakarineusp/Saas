// Um desenho só, com traço fino, para o sistema inteiro falar a mesma língua.

const DESENHOS = {
  calendario: 'M7 3v2m10-2v2M4 8h16M5 5h14a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Z',
  grafico: 'M4 19V9m5 10V5m5 14v-7m5 7V8',
  lista: 'M4 6h16M4 12h16M4 18h10',
  check: 'm5 13 4 4L19 7',
  mais: 'M12 5v14M5 12h14',
  lixeira: 'M4 7h16M9 7V5h6v2m-8 0 1 13h8l1-13',
  relogio: 'M12 7v5l3 2m6-2a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z',
  seta: 'M5 12h14m-6-6 6 6-6 6',
  volta: 'M9 14 4 9l5-5M4 9h11a5 5 0 0 1 0 10h-3',
  copiar: 'M9 9V5a1 1 0 0 1 1-1h9a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1h-4M5 9h9a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-9a1 1 0 0 1 1-1Z',
  whatsapp:
    'M20.5 11.5a8.5 8.5 0 0 1-12.6 7.4L3.5 20.5l1.7-4.3A8.5 8.5 0 1 1 20.5 11.5Z',
  ajuda: 'M9.1 9a3 3 0 1 1 4.5 2.6c-.9.5-1.6 1.3-1.6 2.4M12 17.5h.01M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z',
  sol: 'M12 4V2m0 20v-2m8-8h2M2 12h2m13.7-5.7 1.4-1.4M4.9 19.1l1.4-1.4m11.4 0 1.4 1.4M4.9 4.9l1.4 1.4M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z',
  lua: 'M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5Z',
  sair: 'M15 17l5-5-5-5m5 5H9m1 8H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h4',
  lupa: 'm20 20-3.5-3.5M18 11a7 7 0 1 1-14 0 7 7 0 0 1 14 0Z',
  aviso: 'M12 9v4m0 4h.01M10.3 3.9 2.6 17.3A2 2 0 0 0 4.3 20.3h15.4a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z',
  fechar: 'M6 6l12 12M18 6 6 18',
  usuario: 'M16 19v-1a4 4 0 0 0-8 0v1m8-11a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z',
  dinheiro: 'M12 6v12m3-9.5c0-.8-1.3-1.5-3-1.5s-3 .7-3 1.5 1.3 1.5 3 1.5 3 .7 3 1.5-1.3 1.5-3 1.5-3-.7-3-1.5',
  carro: 'M5 17h14M6.5 17v2m11-2v2M4 13l1.4-4.2A2 2 0 0 1 7.3 7.5h9.4a2 2 0 0 1 1.9 1.3L20 13v3a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-3Zm3 0h10',
  raio: 'M13 3 4 14h7l-1 7 9-11h-7l1-7Z',
} as const

export type NomeDeIcone = keyof typeof DESENHOS

export function Icone({
  nome,
  className = 'h-5 w-5',
  traco = 1.7,
}: {
  nome: NomeDeIcone
  className?: string
  traco?: number
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={traco}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d={DESENHOS[nome]} />
    </svg>
  )
}
