// Guarda quem está logado, qual o papel da pessoa e como está a assinatura.
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { meuPerfil, minhaAssinatura } from './dados'
import { supabase } from './supabase'
import type { Assinatura, Perfil } from './tipos'

type Sessao = {
  carregando: boolean
  entrou: boolean
  email: string | null
  perfil: Perfil | null
  assinatura: Assinatura | null
  recarregar: () => Promise<void>
}

const Contexto = createContext<Sessao>({
  carregando: true,
  entrou: false,
  email: null,
  perfil: null,
  assinatura: null,
  recarregar: async () => {},
})

export function ProvedorDeSessao({ children }: { children: ReactNode }) {
  const [carregando, setCarregando] = useState(true)
  const [email, setEmail] = useState<string | null>(null)
  const [perfil, setPerfil] = useState<Perfil | null>(null)
  const [assinatura, setAssinatura] = useState<Assinatura | null>(null)

  // Importante: só larga o "carregando" depois de saber quem é a pessoa e como
  // está a assinatura. Se soltasse antes, o aplicativo mandaria alguém já
  // cadastrado para a tela de cadastro por uma fração de segundo.
  const buscar = useCallback(async () => {
    setCarregando(true)
    const { data } = await supabase.auth.getSession()
    const usuario = data.session?.user ?? null

    if (!usuario) {
      setEmail(null)
      setPerfil(null)
      setAssinatura(null)
      setCarregando(false)
      return
    }

    const p = await meuPerfil(usuario.id).catch(() => null)
    const a = p?.papel === 'dono' && p.empresa_id ? await minhaAssinatura(p.empresa_id).catch(() => null) : null

    setEmail(usuario.email ?? null)
    setPerfil(p)
    setAssinatura(a)
    setCarregando(false)
  }, [])

  useEffect(() => {
    void buscar()
    const { data } = supabase.auth.onAuthStateChange(() => {
      void buscar()
    })
    return () => data.subscription.unsubscribe()
  }, [buscar])

  return (
    <Contexto.Provider
      value={{ carregando, entrou: email !== null, email, perfil, assinatura, recarregar: buscar }}
    >
      {children}
    </Contexto.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useSessao() {
  return useContext(Contexto)
}
