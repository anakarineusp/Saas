import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { Carregando } from './componentes/Aviso'
import { ProvedorDeAvisos } from './componentes/Avisos'
import { ProvedorDeSessao, useSessao } from './sessao'
import { faltaConfigurar } from './supabase'
import { Painel } from './telas/admin/Painel'
import { Acerto } from './telas/empresa/Acerto'
import { Area } from './telas/empresa/Area'
import { Assinatura } from './telas/empresa/Assinatura'
import { Cadastros } from './telas/empresa/Cadastros'
import { Hoje } from './telas/empresa/Hoje'
import { MeusServicos } from './telas/motorista/MeusServicos'
import { Confirmar } from './telas/publico/Confirmar'
import { Diagnostico } from './telas/publico/Diagnostico'
import { Convite } from './telas/publico/Convite'
import { CriarConta } from './telas/publico/CriarConta'
import { Entrar } from './telas/publico/Entrar'
import { SuaEmpresa } from './telas/publico/SuaEmpresa'
import { Vitrine } from './telas/publico/Vitrine'

/** Manda cada pessoa para a área dela. */
function Protegida({ papel, children }: { papel: 'dono' | 'motorista' | 'admin'; children: React.ReactNode }) {
  const { carregando, entrou, perfil } = useSessao()

  if (carregando) return <Carregando />
  if (!entrou) return <Navigate to="/entrar" replace />
  if (!perfil) return <Navigate to="/sua-empresa" replace />
  if (perfil.papel !== papel) {
    const destino = perfil.papel === 'admin' ? '/admin' : perfil.papel === 'motorista' ? '/motorista' : '/app'
    return <Navigate to={destino} replace />
  }
  return <>{children}</>
}

function FaltaConfigurar() {
  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 text-center">
      <h1 className="text-xl font-bold text-slate-900">Falta ligar o banco de dados</h1>
      <p className="mt-2 text-sm text-slate-600">
        Cadastre o endereço e a chave pública do Supabase em <code>VITE_SUPABASE_URL</code> e{' '}
        <code>VITE_SUPABASE_ANON_KEY</code>, e publique o site de novo.
      </p>
      <p className="mt-4 text-sm">
        <a href="/diagnostico" className="text-slate-900 underline">
          ver a conferência da instalação
        </a>
      </p>
    </div>
  )
}

export default function App() {
  // Sem as chaves, só a página de conferência funciona — é ela que explica o que falta.
  if (faltaConfigurar) {
    return (
      <BrowserRouter>
        <Routes>
          <Route path="/diagnostico" element={<Diagnostico />} />
          <Route path="*" element={<FaltaConfigurar />} />
        </Routes>
      </BrowserRouter>
    )
  }

  return (
    <BrowserRouter>
      <ProvedorDeAvisos>
        <ProvedorDeSessao>
          <Routes>
          <Route path="/" element={<Vitrine />} />
          <Route path="/diagnostico" element={<Diagnostico />} />
          <Route path="/entrar" element={<Entrar />} />
          <Route path="/criar-conta" element={<CriarConta />} />
          <Route path="/sua-empresa" element={<SuaEmpresa />} />
          <Route path="/convite/:token" element={<Convite />} />
          <Route path="/confirmar/:token" element={<Confirmar />} />

          <Route
            path="/app"
            element={
              <Protegida papel="dono">
                <Area />
              </Protegida>
            }
          >
            <Route index element={<Hoje />} />
            <Route path="acerto" element={<Acerto />} />
            <Route path="cadastros" element={<Cadastros />} />
            <Route path="assinatura" element={<Assinatura />} />
          </Route>

          <Route
            path="/motorista"
            element={
              <Protegida papel="motorista">
                <MeusServicos />
              </Protegida>
            }
          />

          <Route
            path="/admin"
            element={
              <Protegida papel="admin">
                <Painel />
              </Protegida>
            }
          />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </ProvedorDeSessao>
      </ProvedorDeAvisos>
    </BrowserRouter>
  )
}
