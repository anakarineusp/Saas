// FERRAMENTA DE DESENVOLVIMENTO — não vai para o ar.
//
// Finge ser o Supabase (login + acesso às tabelas) na frente de um PostgreSQL
// comum, para dar para abrir e testar o aplicativo de verdade sem depender de
// nenhuma conta na internet. As regras de quem vê o quê são as mesmas: cada
// pedido roda com o papel "authenticated" ou "anon" e com o usuário do momento,
// exatamente como no Supabase.
//
// Uso: node ferramentas/servidor-local/index.mjs [porta] [banco]

import http from 'node:http'
import { createHash, randomUUID } from 'node:crypto'
import pg from 'pg'

const PORTA = Number(process.argv[2] ?? 54321)
const BANCO = process.argv[3] ?? 'transfer_local'

// O Supabase devolve números como número, não como texto. Sem isto, um
// percentual de 40 chegaria na tela como "40.00".
pg.types.setTypeParser(1700, Number) // numeric
pg.types.setTypeParser(20, Number) // bigint (contagens)
pg.types.setTypeParser(1082, (v) => v) // date: "2026-08-26", sem hora junto

const pool = new pg.Pool({
  host: process.env.PGHOST ?? '127.0.0.1',
  database: BANCO,
  user: process.env.PGUSER ?? 'transfer',
  password: process.env.PGPASSWORD ?? 'transfer',
})

const hash = (senha) => createHash('sha256').update(senha).digest('hex')
const tokenDe = (id) => `local.${id}`
const usuarioDoToken = (token) => (token?.startsWith('local.') ? token.slice(6) : null)

async function prepararBanco() {
  await pool.query(`
    create table if not exists public.local_senhas (
      usuario_id uuid primary key references auth.users(id) on delete cascade,
      senha_hash text not null
    )
  `)
}

/** Roda uma consulta com o papel e o usuário certos, como o Supabase faz. */
async function comoUsuario(usuarioId, executar) {
  const cliente = await pool.connect()
  try {
    await cliente.query('begin')
    await cliente.query(`set local role ${usuarioId ? 'authenticated' : 'anon'}`)
    if (usuarioId) {
      await cliente.query("select set_config('request.jwt.claims', $1, true)", [
        JSON.stringify({ sub: usuarioId, role: 'authenticated' }),
      ])
    }
    const resultado = await executar(cliente)
    await cliente.query('commit')
    return resultado
  } catch (erro) {
    await cliente.query('rollback')
    throw erro
  } finally {
    cliente.release()
  }
}

function responder(res, status, corpo) {
  const texto = corpo === undefined ? '' : JSON.stringify(corpo)
  res.writeHead(status, {
    'content-type': 'application/json',
    'access-control-allow-origin': '*',
    'access-control-allow-headers': '*',
    'access-control-allow-methods': 'GET,POST,PATCH,DELETE,OPTIONS',
  })
  res.end(texto)
}

async function corpoDe(req) {
  const partes = []
  for await (const parte of req) partes.push(parte)
  if (partes.length === 0) return {}
  try {
    return JSON.parse(Buffer.concat(partes).toString())
  } catch {
    return {}
  }
}

const sessao = (id, email) => ({
  access_token: tokenDe(id),
  token_type: 'bearer',
  expires_in: 31536000,
  expires_at: Math.floor(Date.now() / 1000) + 31536000,
  refresh_token: tokenDe(id),
  user: {
    id,
    aud: 'authenticated',
    role: 'authenticated',
    email,
    app_metadata: {},
    user_metadata: {},
    created_at: new Date().toISOString(),
  },
})

// ---------------------------------------------------------------- tradução
// Converte os parâmetros do PostgREST (col=eq.valor, order=col.desc) em SQL.

const OPERADORES = { eq: '=', neq: '<>', gt: '>', gte: '>=', lt: '<', lte: '<=', like: 'like', is: 'is' }

function condicoesDe(params, valores) {
  const condicoes = []
  for (const [chave, bruto] of params.entries()) {
    if (chave === 'select' || chave === 'order' || chave === 'limit' || chave === 'offset') continue
    const ponto = bruto.indexOf('.')
    const op = OPERADORES[bruto.slice(0, ponto)]
    if (!op) continue
    const valor = bruto.slice(ponto + 1)
    valores.push(valor === 'null' ? null : valor)
    condicoes.push(`"${chave}" ${op} $${valores.length}`)
  }
  return condicoes
}

function montarSelect(tabela, params) {
  const valores = []
  const condicoes = condicoesDe(params, valores)

  const ordem = []
  for (const pedaco of params.getAll('order')) {
    for (const parte of pedaco.split(',')) {
      const [coluna, direcao] = parte.split('.')
      ordem.push(`"${coluna}" ${direcao === 'desc' ? 'desc' : 'asc'}`)
    }
  }

  let sql = `select * from public."${tabela}"`
  if (condicoes.length) sql += ` where ${condicoes.join(' and ')}`
  if (ordem.length) sql += ` order by ${ordem.join(', ')}`
  const limite = params.get('limit')
  if (limite) sql += ` limit ${Number(limite)}`
  return { sql, valores }
}

function montarInsert(tabela, corpo) {
  const linhas = Array.isArray(corpo) ? corpo : [corpo]
  const colunas = [...new Set(linhas.flatMap((l) => Object.keys(l)))]
  const valores = []
  const grupos = linhas.map(
    (linha) =>
      `(${colunas
        .map((c) => {
          valores.push(linha[c] ?? null)
          return `$${valores.length}`
        })
        .join(', ')})`,
  )
  return {
    sql: `insert into public."${tabela}" (${colunas.map((c) => `"${c}"`).join(', ')}) values ${grupos.join(', ')} returning *`,
    valores,
  }
}

function montarUpdate(tabela, corpo, params) {
  const valores = []
  const campos = Object.keys(corpo).map((c) => {
    valores.push(corpo[c])
    return `"${c}" = $${valores.length}`
  })
  const condicoes = condicoesDe(params, valores)
  let sql = `update public."${tabela}" set ${campos.join(', ')}`
  if (condicoes.length) sql += ` where ${condicoes.join(' and ')}`
  return { sql: `${sql} returning *`, valores }
}

function montarDelete(tabela, params) {
  const valores = []
  const condicoes = condicoesDe(params, valores)
  let sql = `delete from public."${tabela}"`
  if (condicoes.length) sql += ` where ${condicoes.join(' and ')}`
  return { sql: `${sql} returning *`, valores }
}

// ------------------------------------------------------------------ servidor

const servidor = http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') return responder(res, 204)

  const url = new URL(req.url, `http://localhost:${PORTA}`)
  const caminho = url.pathname
  const token = (req.headers.authorization ?? '').replace(/^Bearer\s+/i, '')
  const usuarioId = usuarioDoToken(token)

  try {
    // ---------------- login ----------------
    if (caminho === '/auth/v1/signup') {
      const { email, password } = await corpoDe(req)
      const existe = await pool.query('select id from auth.users where email = $1', [email])
      if (existe.rowCount) return responder(res, 400, { message: 'User already registered' })
      if ((password ?? '').length < 6) {
        return responder(res, 400, { message: 'Password should be at least 6 characters' })
      }
      const id = randomUUID()
      await pool.query('insert into auth.users (id, email) values ($1, $2)', [id, email])
      await pool.query('insert into public.local_senhas (usuario_id, senha_hash) values ($1, $2)', [id, hash(password)])
      return responder(res, 200, sessao(id, email))
    }

    if (caminho === '/auth/v1/token') {
      const corpo = await corpoDe(req)
      if (url.searchParams.get('grant_type') === 'refresh_token') {
        const id = usuarioDoToken(corpo.refresh_token)
        const u = await pool.query('select id, email from auth.users where id = $1', [id])
        if (!u.rowCount) return responder(res, 401, { message: 'Invalid Refresh Token' })
        return responder(res, 200, sessao(u.rows[0].id, u.rows[0].email))
      }
      const u = await pool.query(
        `select u.id, u.email from auth.users u
           join public.local_senhas s on s.usuario_id = u.id
          where u.email = $1 and s.senha_hash = $2`,
        [corpo.email, hash(corpo.password ?? '')],
      )
      if (!u.rowCount) return responder(res, 400, { message: 'Invalid login credentials' })
      return responder(res, 200, sessao(u.rows[0].id, u.rows[0].email))
    }

    if (caminho === '/auth/v1/user') {
      if (!usuarioId) return responder(res, 401, { message: 'Não autorizado' })
      const u = await pool.query('select id, email from auth.users where id = $1', [usuarioId])
      if (!u.rowCount) return responder(res, 401, { message: 'Não autorizado' })
      return responder(res, 200, sessao(u.rows[0].id, u.rows[0].email).user)
    }

    if (caminho === '/auth/v1/logout') return responder(res, 204)

    // ---------------- funções do banco ----------------
    if (caminho.startsWith('/rest/v1/rpc/')) {
      const nome = caminho.slice('/rest/v1/rpc/'.length)
      const argumentos = await corpoDe(req)
      const chaves = Object.keys(argumentos)
      const sql = `select * from public."${nome}"(${chaves.map((c, i) => `"${c}" => $${i + 1}`).join(', ')})`
      const resultado = await comoUsuario(usuarioId, (c) => c.query(sql, chaves.map((k) => argumentos[k])))

      const colunas = resultado.fields.map((f) => f.name)
      if (colunas.length === 1 && colunas[0] === nome) {
        return responder(res, 200, resultado.rows[0]?.[nome] ?? null)
      }
      return responder(res, 200, resultado.rows)
    }

    // ---------------- tabelas e visões ----------------
    if (caminho.startsWith('/rest/v1/')) {
      const tabela = caminho.slice('/rest/v1/'.length)
      const querUmObjeto = (req.headers.accept ?? '').includes('vnd.pgrst.object')
      const querRetorno = (req.headers.prefer ?? '').includes('return=representation')

      let plano
      if (req.method === 'GET') plano = montarSelect(tabela, url.searchParams)
      else if (req.method === 'POST') plano = montarInsert(tabela, await corpoDe(req))
      else if (req.method === 'PATCH') plano = montarUpdate(tabela, await corpoDe(req), url.searchParams)
      else if (req.method === 'DELETE') plano = montarDelete(tabela, url.searchParams)
      else return responder(res, 405, { message: 'Método não aceito' })

      const resultado = await comoUsuario(usuarioId, (c) => c.query(plano.sql, plano.valores))

      if (req.method !== 'GET' && !querRetorno) return responder(res, 204)
      if (querUmObjeto) {
        if (resultado.rows.length !== 1) return responder(res, 406, { message: 'Esperava exatamente uma linha' })
        return responder(res, 200, resultado.rows[0])
      }
      return responder(res, 200, resultado.rows)
    }

    // ---------------- servidores extras ----------------
    if (caminho === '/functions/v1/assinar') {
      // No desenvolvimento não existe empresa de pagamentos: devolve uma tela de faz de conta.
      return responder(res, 200, { checkout: `http://localhost:${PORTA}/checkout-de-mentira`, assinatura: 'sub_local' })
    }

    if (caminho === '/checkout-de-mentira') {
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' })
      return res.end('<h1>Checkout de mentira</h1><p>No ar, aqui aparece a pagina de pagamento do Asaas.</p>')
    }

    return responder(res, 404, { message: 'Não encontrado' })
  } catch (erro) {
    return responder(res, 400, { message: erro.message, code: erro.code ?? '400', details: null, hint: null })
  }
})

await prepararBanco()
servidor.listen(PORTA, () => {
  console.log(`servidor local de desenvolvimento em http://localhost:${PORTA} (banco ${BANCO})`)
})
