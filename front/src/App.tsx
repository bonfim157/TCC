import type { ReactNode } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { Esqueleto } from './components/feedback';
import { Estrutura, EstruturaPublica } from './layout/Estrutura';
import { Acessibilidade } from './pages/Acessibilidade';
import { Duvidas } from './pages/Duvidas';
import { Entrar } from './pages/Entrar';
import { ErroGeral, NaoEncontrada, SemPermissao } from './pages/Estados';
import { Guia } from './pages/Guia';
import { Administracao } from './pages/Administracao';
import { Buscar } from './pages/Buscar';
import { Caso } from './pages/Caso';
import { Central } from './pages/central/Central';
import { Ciencia } from './pages/Ciencia';
import { Inicio } from './pages/Inicio';
import { MeusRegistros } from './pages/MeusRegistros';
import { Registrar } from './pages/registrar/Registrar';
import { Relatorios } from './pages/Relatorios';
import { podeAcessar, type Area } from './state/perfis';
import { useSessao } from './state/sessao';

/** Exige sessão; sem ela, vai para Entrar e volta depois. */
function ComSessao({ children }: { children: ReactNode }) {
  const s = useSessao();
  const local = useLocation();
  if (!s.sessao && s.conferindoSessao) return <main className="pagina"><Esqueleto rotulo="Conferindo seu acesso" /></main>;
  if (!s.sessao) return <Navigate to="/entrar" replace state={{ de: local.pathname }} />;
  if (!s.rede || !s.perfil) return <main className="pagina"><Esqueleto rotulo="Preparando sua rede" /></main>;
  return <>{children}</>;
}

/** Mostra "sem permissão" no lugar da tela quando o perfil não alcança a área. */
function Area_({ area, children }: { area: Area; children: ReactNode }) {
  const { perfil } = useSessao();
  return perfil && podeAcessar(perfil, area) ? <>{children}</> : <SemPermissao />;
}

export function App() {
  const s = useSessao();
  return (
    <Routes>
      <Route path="/entrar" element={s.sessao ? <Navigate to="/" replace /> : <Entrar />} />
      <Route path="/ciencia/:token" element={<Ciencia />} />
      {/* Páginas públicas: com sessão, aparecem dentro da estrutura completa. */}
      <Route element={s.sessao ? <ComSessao><Estrutura /></ComSessao> : <EstruturaPublica />}>
        <Route path="duvidas" element={<Duvidas />} />
        <Route path="acessibilidade" element={<Acessibilidade />} />
      </Route>
      <Route element={<ComSessao><Estrutura /></ComSessao>}>
        <Route index element={<Inicio />} />
        <Route path="registrar/:rascunhoId?" element={<Area_ area="registrar"><Registrar /></Area_>} />
        <Route path="meus-registros" element={<Area_ area="meus-registros"><MeusRegistros /></Area_>} />
        <Route path="casos/:id" element={<Caso />} />
        <Route path="central/:id?" element={<Area_ area="central"><Central /></Area_>} />
        <Route path="buscar" element={<Area_ area="buscar"><Buscar /></Area_>} />
        <Route path="relatorios" element={<Area_ area="relatorios"><Relatorios /></Area_>} />
        <Route path="administracao" element={<Area_ area="administracao"><Administracao /></Area_>} />
        <Route path="guia" element={<Guia />} />
        <Route path="sem-permissao" element={<SemPermissao />} />
        <Route path="erro" element={<ErroGeral />} />
        <Route path="*" element={<NaoEncontrada />} />
      </Route>
    </Routes>
  );
}
