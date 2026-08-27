// A ligação com o banco de dados. As duas informações abaixo são públicas de
// propósito: quem manda em quem vê o quê é o banco, não o aplicativo.
import { createClient } from '@supabase/supabase-js'

/**
 * O painel do Supabase mostra endereços parecidos, e é fácil copiar o da
 * "Data API", que vem com /rest/v1 no fim. O sistema acrescenta essa parte
 * sozinho, então aqui a gente tira: assim os dois endereços funcionam.
 */
export function limparEndereco(valor: string): string {
  return valor
    .trim()
    .replace(/\/+$/, '')
    .replace(/\/(rest|auth|storage|realtime|functions)\/v1$/, '')
    .replace(/\/+$/, '')
}

const bruto = (import.meta.env.VITE_SUPABASE_URL ?? '').trim()

export const enderecoOriginal = bruto
export const endereco = limparEndereco(bruto)
export const chave = (import.meta.env.VITE_SUPABASE_ANON_KEY ?? '').trim()

export const faltaConfigurar = !endereco || !chave

/**
 * Até onde o banco precisa estar montado para este site funcionar.
 * Sobe junto com cada migração nova. Se o banco estiver atrás disso, o site
 * avisa em vez de dar erro solto pelo caminho.
 */
export const VERSAO_DO_BANCO_ESPERADA = 20

export const supabase = createClient(endereco || 'http://localhost', chave || 'sem-chave', {
  auth: { persistSession: true, autoRefreshToken: true },
})
