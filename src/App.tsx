import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { Carregando } from './componentes/Aviso'
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
        Coloque o endereço e a chave pública do Supabase no arquivo <code>.env</code> e publique de novo.
        O arquivo <code>.env.exemplo</code> mostra o formato.
      </p>
    </div>
  )
}

export default function App() {
  if (faltaConfigurar) return <FaltaConfigurar />

  return (
    <BrowserRouter>
      <ProvedorDeSessao>
        <Routes>
          <Route path="/" element={<Vitrine />} />
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
    </BrowserRouter>
  )
}
