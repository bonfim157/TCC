import { useEffect, useId, useRef, useState, type JSX, type ReactNode, type SVGProps } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { Brasao, DialogoConfirmacao } from '../components/estrutura';
import {
  IconeAcessibilidade, IconeAjuda, IconeCasa, IconeDocumento, IconeEngrenagem, IconeGrafico, IconeLapis, IconeLupa, IconePainel,
  IconeFechar, IconeMenu, IconeSair, IconeSemConexao, IconeTelefone,
} from '../components/icones';
import { navegacao, nomePerfil, podeAcessar, type Area } from '../state/perfis';
import { useGuardaDeRascunho } from '../state/rascunhos';
import { useSessao } from '../state/sessao';
import { CELULAR, useMidia } from '../state/useMidia';
import { BarraDeContexto } from './BarraDeContexto';
import { ControlesDeAcessibilidade } from './MenuAparencia';
import { useConexao } from './useConexao';

const icones: Record<Area, (p: SVGProps<SVGSVGElement>) => JSX.Element> = {
  inicio: IconeCasa,
  registrar: IconeLapis,
  'meus-registros': IconeDocumento,
  central: IconePainel,
  buscar: IconeLupa,
  relatorios: IconeGrafico,
  administracao: IconeEngrenagem,
};

/** Iniciais para o avatar: primeira e última palavra do nome. */
const iniciais = (nome = '') => {
  const p = nome.trim().split(/\s+/);
  return ((p[0]?.[0] ?? '') + (p.length > 1 ? p[p.length - 1][0] : '')).toUpperCase();
};

/**
 * Cabeçalho enxuto: marca e rede à esquerda; atalhos de acessibilidade e a
 * pessoa à direita. Sem faixa institucional: é uma ferramenta da escola.
 */
export function Timbre({ esquerda, children, menu }: { esquerda?: ReactNode; children?: ReactNode; menu?: ReactNode }) {
  const { rede, redePrevia, redeDoEndereco, escola } = useSessao();
  const r = rede ?? redePrevia ?? redeDoEndereco;
  const identidade = (
    <div className="timbre-identidade">
      <Brasao sigla={r?.sigla ?? 'CR'} />
      <div>
        <p className="timbre-produto">Cuidar e Registrar</p>
        <p className="timbre-rede">{escola?.nome ?? r?.nome ?? 'Ocorrências escolares'}</p>
      </div>
    </div>
  );
  // No celular: uma linha só, com a marca e o botão de menu; o resto vai para o menu.
  if (menu) {
    return (
      <header className="timbre timbre-celular">
        <div className="timbre-linha">
          {identidade}
          {menu}
        </div>
      </header>
    );
  }
  return (
    <header className="timbre">
      <div className="timbre-linha">
        {identidade}
        <div className="timbre-lado timbre-lado-fim">
          {esquerda}
          {children}
        </div>
      </div>
    </header>
  );
}

/** Marca das telas de acesso: sigla, nome do sistema e rede, numa linha. */
export function MarcaDaRede() {
  const { rede, redePrevia, redeDoEndereco } = useSessao();
  const r = rede ?? redePrevia ?? redeDoEndereco;
  return (
    <div className="marca">
      <Brasao sigla={r?.sigla ?? 'CR'} tamanho={44} />
      <div>
        <p className="timbre-produto">Cuidar e Registrar</p>
        <p className="timbre-rede">{r?.nome ?? 'Ocorrências escolares'}</p>
      </div>
    </div>
  );
}

/** Telefones de ajuda que valem em qualquer escola do país, do mais urgente ao de apoio. */
const contatos: [string, string][] = [
  ['192', 'SAMU'],
  ['190', 'Polícia Militar'],
  ['188', 'CVV'],
  ['100', 'Direitos Humanos'],
  ['180', 'Atendimento à Mulher'],
];

/** Rodapé discreto: o que fazer em caso de risco, links de ajuda e o aviso do protótipo. */
export function Rodape({ links = true }: { links?: boolean }) {
  const { demonstracao } = useSessao();
  return (
    <footer className="rodape">
      <div className="rodape-linha">
        <section className="rodape-risco" aria-labelledby="t-risco">
          <h2 id="t-risco"><IconeTelefone width={18} height={18} /> Em caso de risco agora</h2>
          <p>Acolha o estudante e chame a direção. Registre depois.</p>
          <ul className="rodape-telefones">
            {contatos.map(([n, r]) => (
              <li key={n}><strong>{n}</strong> {r}</li>
            ))}
          </ul>
        </section>
        {links && (
          <nav className="rodape-links" aria-label="Ajuda">
            <ul>
              <li><Link to="/guia">Guia da interface</Link></li>
              <li><Link to="/duvidas">Dúvidas frequentes</Link></li>
              <li><Link to="/acessibilidade">Acessibilidade</Link></li>
            </ul>
          </nav>
        )}
      </div>
      {/* Na demonstração, a faixa do topo já diz isso em toda tela. */}
      {!demonstracao && (
        <p className="rodape-nota">Protótipo acadêmico (TCC), sem vínculo oficial com a Secretaria da Educação.</p>
      )}
    </footer>
  );
}

/**
 * Menu do celular: um botão que mostra e esconde o painel logo abaixo do cabeçalho.
 * Fecha ao trocar de página, com Esc (devolvendo o foco ao botão) e ao tocar fora.
 */
function MenuCelular({ children }: { children: ReactNode }) {
  const [aberto, setAberto] = useState(false);
  const local = useLocation();
  const id = useId();
  const botao = useRef<HTMLButtonElement>(null);
  const painel = useRef<HTMLDivElement>(null);

  useEffect(() => setAberto(false), [local.pathname]);
  useEffect(() => {
    if (!aberto) return;
    const esc = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      setAberto(false);
      botao.current?.focus();
    };
    const fora = (e: PointerEvent) => {
      const alvo = e.target as Node;
      if (!painel.current?.contains(alvo) && !botao.current?.contains(alvo)) setAberto(false);
    };
    document.addEventListener('keydown', esc);
    document.addEventListener('pointerdown', fora);
    return () => {
      document.removeEventListener('keydown', esc);
      document.removeEventListener('pointerdown', fora);
    };
  }, [aberto]);

  return (
    <>
      <button
        ref={botao}
        type="button"
        className="btn btn-secundario botao-menu"
        aria-expanded={aberto}
        aria-controls={`${id}-menu`}
        onClick={() => setAberto((a) => !a)}
      >
        {aberto ? <IconeFechar /> : <IconeMenu />}
        {aberto ? 'Fechar' : 'Menu'}
      </button>
      <div ref={painel} id={`${id}-menu`} className="menu-celular" hidden={!aberto}>
        {children}
      </div>
    </>
  );
}

/** Estrutura das páginas públicas (dúvidas, acessibilidade) para quem ainda não entrou. */
export function EstruturaPublica() {
  const celular = useMidia(CELULAR);
  const links = (
    <ul>
      <li><NavLink to="/entrar"><IconeCasa />Página inicial</NavLink></li>
      <li><NavLink to="/duvidas"><IconeAjuda />Dúvidas frequentes</NavLink></li>
      <li><NavLink to="/acessibilidade"><IconeAcessibilidade />Acessibilidade</NavLink></li>
    </ul>
  );
  return (
    <div className="app">
      <a className="pular-conteudo" href="#conteudo">Pular para o conteúdo</a>
      {celular ? (
        <Timbre
          menu={
            <MenuCelular>
              <Link className="btn btn-primario btn-largo" to="/entrar">Entrar</Link>
              <nav className="menu-celular-links" aria-label="Principal">{links}</nav>
              <ControlesDeAcessibilidade />
            </MenuCelular>
          }
        />
      ) : (
        <>
          <Timbre esquerda={<ControlesDeAcessibilidade />}>
            <Link className="btn btn-primario" to="/entrar">Entrar</Link>
          </Timbre>
          <nav className="navegacao" aria-label="Principal">{links}</nav>
        </>
      )}
      <main id="conteudo" tabIndex={-1}>
        <Outlet />
      </main>
      <Rodape />
    </div>
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
  const registra = !!s.perfil && podeAcessar(s.perfil, 'registrar');
  const celular = useMidia(CELULAR);

  return (
    <div className="app">
      <a className="pular-conteudo" href="#conteudo">Pular para o conteúdo</a>

      {celular ? (
        <Timbre
          menu={
            <MenuCelular>
              <div className="menu-celular-pessoa">
                <span className="avatar" aria-hidden="true">{iniciais(s.sessao?.usuario.nome)}</span>
                <p>
                  <strong>{s.sessao?.usuario.nome}</strong>
                  <span>{s.perfil ? nomePerfil[s.perfil] : ''}</span>
                </p>
              </div>
              {registra && (
                <NavLink className="btn btn-primario btn-largo" to="/registrar"><IconeLapis width={20} height={20} />Registrar ocorrência</NavLink>
              )}
              <nav className="menu-celular-links" aria-label="Principal">
                <ul>
                  {itens.filter((n) => n.area !== 'registrar').map((n) => {
                    const Icone = icones[n.area];
                    return (
                      <li key={n.area}>
                        <NavLink to={n.caminho} end={n.caminho === '/'}><Icone />{n.rotulo}</NavLink>
                      </li>
                    );
                  })}
                  <li><NavLink to="/guia"><IconeAjuda />Guia da interface</NavLink></li>
                  <li><NavLink to="/duvidas"><IconeAjuda />Dúvidas frequentes</NavLink></li>
                </ul>
              </nav>
              <ControlesDeAcessibilidade />
              <button type="button" className="btn btn-secundario btn-largo" onClick={sair}>
                <IconeSair width={18} height={18} /> Sair
              </button>
            </MenuCelular>
          }
        />
      ) : (
        <>
          <Timbre esquerda={<ControlesDeAcessibilidade />}>
            <div className="timbre-usuario">
              <span className="avatar" aria-hidden="true">{iniciais(s.sessao?.usuario.nome)}</span>
              <p>
                <strong>{s.sessao?.usuario.nome}</strong>
                <span>{s.perfil ? nomePerfil[s.perfil] : ''}</span>
              </p>
              <button type="button" className="btn btn-secundario btn-sair" onClick={sair}>
                <IconeSair width={18} height={18} /> Sair
              </button>
            </div>
          </Timbre>

          {/* No computador, abas simples com a escola ao lado; o destaque de "registrar" fica no Início. */}
          <div className="barra-navegacao">
            <nav className="navegacao" aria-label="Principal">
              <ul>
                {itens.map((n) => {
                  const Icone = icones[n.area];
                  return (
                    <li key={n.area}>
                      <NavLink to={n.caminho} end={n.caminho === '/'}><Icone />{n.rotulo}</NavLink>
                    </li>
                  );
                })}
                <li><NavLink to="/guia"><IconeAjuda />Guia</NavLink></li>
              </ul>
            </nav>
            <BarraDeContexto />
          </div>
        </>
      )}

      {celular && <BarraDeContexto />}

      {!online && (
        <div className="faixa-offline" role="status">
          <IconeSemConexao />
          <p>
            <strong>Sem conexão.</strong> Você pode continuar preenchendo; o envio será liberado quando a conexão voltar.
          </p>
        </div>
      )}

      <main id="conteudo" ref={principal} tabIndex={-1}>
        <Outlet />
      </main>

      <Rodape />

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
