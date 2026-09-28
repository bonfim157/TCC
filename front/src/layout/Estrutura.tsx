import { useEffect, useRef, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { Botao } from '../components/controles';
import { Brasao, DialogoConfirmacao } from '../components/estrutura';
import { IconeSemConexao } from '../components/icones';
import { navegacao, nomePerfil, podeAcessar } from '../state/perfis';
import { useGuardaDeRascunho } from '../state/rascunhos';
import { useSessao } from '../state/sessao';
import { BarraDeContexto } from './BarraDeContexto';
import { MenuAparencia } from './MenuAparencia';
import { useConexao } from './useConexao';

/** Cabeçalho em forma de timbre de ofício: brasão, secretaria e rede. */
export function Timbre({ children }: { children?: React.ReactNode }) {
  const { rede, redePrevia, redeDoEndereco } = useSessao();
  const r = rede ?? redePrevia ?? redeDoEndereco;
  return (
    <header className="timbre">
      <div className="timbre-linha">
        <div className="timbre-identidade">
          <Brasao sigla={r?.sigla ?? 'CR'} />
          <div>
            <p className="timbre-secretaria">{r ? r.secretaria : 'Sistema de ocorrências escolares'}</p>
            <p className="timbre-rede">{r?.nome ?? 'Cuidar e Registrar'}</p>
          </div>
        </div>
        {children}
      </div>
    </header>
  );
}

export function Estrutura() {
  const s = useSessao();
  const { haRascunho } = useGuardaDeRascunho();
  const online = useConexao();
  const [confirmarSaida, setConfirmarSaida] = useState(false);
  const local = useLocation();
  const principal = useRef<HTMLElement>(null);

  // Ao navegar, leva o foco ao conteúdo, como numa troca de página.
  // Na primeira carga o foco fica no início do documento.
  const primeiraCarga = useRef(true);
  useEffect(() => {
    if (primeiraCarga.current) {
      primeiraCarga.current = false;
      return;
    }
    principal.current?.focus({ preventScroll: true });
    window.scrollTo(0, 0);
  }, [local.pathname]);

  const itens = navegacao.filter((n) => s.perfil && podeAcessar(s.perfil, n.area));
  const sair = () => (haRascunho ? setConfirmarSaida(true) : s.sair());

  return (
    <div className="app">
      <a className="pular-conteudo" href="#conteudo">Pular para o conteúdo</a>

      <Timbre>
        <div className="timbre-usuario">
          <p>
            <strong>{s.sessao?.usuario.nome}</strong>
            <span>{s.perfil ? nomePerfil[s.perfil] : ''}</span>
          </p>
          <MenuAparencia />
          <Botao variante="secundario" onClick={sair}>Sair</Botao>
        </div>
      </Timbre>

      <BarraDeContexto />

      {!online && (
        <div className="faixa-offline" role="status">
          <IconeSemConexao />
          <p>
            <strong>Sem conexão.</strong> Você pode continuar preenchendo; o envio será liberado quando a conexão voltar.
          </p>
        </div>
      )}

      {/* No celular, a navegação vira um menu que abre sob demanda: cabe qualquer
          número de itens em qualquer tamanho de texto. */}
      <nav className="nav-movel" aria-label="Principal">
        <details key={local.pathname}>
          <summary>
            <span>Menu</span>
            <span className="nav-movel-atual">
              {itens.find((n) => (n.caminho === '/' ? local.pathname === '/' : local.pathname.startsWith(n.caminho)))?.rotulo ?? ''}
            </span>
          </summary>
          <ul>
            {itens.map((n) => (
              <li key={n.area}>
                <NavLink to={n.caminho} end={n.caminho === '/'}>{n.rotulo}</NavLink>
              </li>
            ))}
            <li><NavLink to="/guia">Guia da interface</NavLink></li>
          </ul>
        </details>
      </nav>

      <div className="app-corpo">
        <nav className="navegacao" aria-label="Principal">
          <ul>
            {itens.map((n) => (
              <li key={n.area}>
                <NavLink to={n.caminho} end={n.caminho === '/'}>{n.rotulo}</NavLink>
              </li>
            ))}
          </ul>
          <p className="navegacao-rodape">
            <NavLink to="/guia">Guia da interface</NavLink>
          </p>
        </nav>

        <main id="conteudo" ref={principal} tabIndex={-1}>
          <Outlet />
        </main>
      </div>

      <footer className="rodape">
        Protótipo acadêmico (TCC), sem vínculo oficial com a Secretaria da Educação. Pessoas e casos são fictícios.
      </footer>

      <DialogoConfirmacao
        aberto={confirmarSaida}
        titulo="Sair do sistema?"
        confirmar="Descartar e sair"
        cancelar="Continuar editando"
        perigoso
        aoCancelar={() => setConfirmarSaida(false)}
        aoConfirmar={() => {
          setConfirmarSaida(false);
          s.sair();
        }}
      >
        Há um formulário com alterações não enviadas. Ao sair, elas serão descartadas.
      </DialogoConfirmacao>
    </div>
  );
}
