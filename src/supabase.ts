// A ligação com o banco de dados. As duas chaves abaixo são públicas de
// propósito: quem manda em quem vê o quê é o banco, não o aplicativo.
import { createClient } from '@supabase/supabase-js'

const endereco = import.meta.env.VITE_SUPABASE_URL
const chave = import.meta.env.VITE_SUPABASE_ANON_KEY

export const faltaConfigurar = !endereco || !chave

export const supabase = createClient(endereco ?? 'http://localhost', chave ?? 'sem-chave', {
  auth: { persistSession: true, autoRefreshToken: true },
})
