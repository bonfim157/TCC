import { useEffect, useRef, useState, type JSX, type SVGProps } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { Brasao, DialogoConfirmacao } from '../components/estrutura';
import {
  IconeAjuda, IconeCasa, IconeDocumento, IconeEngrenagem, IconeGrafico, IconeLapis, IconeLupa, IconePainel,
  IconeSair, IconeSemConexao, IconeTelefone,
} from '../components/icones';
import { navegacao, nomePerfil, podeAcessar, type Area } from '../state/perfis';
import { useGuardaDeRascunho } from '../state/rascunhos';
import { useSessao } from '../state/sessao';
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
 * Cabeçalho de portal de serviço público: faixa escura com a secretaria,
 * atalhos de acessibilidade à esquerda, brasão e nome ao centro e a pessoa à direita.
 */
export function Timbre({ esquerda, children }: { esquerda?: React.ReactNode; children?: React.ReactNode }) {
  const { rede, redePrevia, redeDoEndereco } = useSessao();
  const r = rede ?? redePrevia ?? redeDoEndereco;
  return (
    <header className="timbre">
      <p className="faixa-topo">{r ? r.secretaria : 'Sistema de ocorrências escolares'}</p>
      <div className="timbre-linha">
        <div className="timbre-lado">{esquerda}</div>
        <div className="timbre-identidade">
          <Brasao sigla={r?.sigla ?? 'CR'} />
          <div>
            <p className="timbre-produto">Cuidar e Registrar</p>
            <p className="timbre-rede">{r?.nome ?? 'Ocorrências escolares'}</p>
          </div>
        </div>
        <div className="timbre-lado timbre-lado-fim">{children}</div>
      </div>
    </header>
  );
}

/** Marca centralizada das telas de acesso: brasão grande, secretaria e nome. */
export function MarcaDaRede() {
  const { rede, redePrevia, redeDoEndereco } = useSessao();
  const r = rede ?? redePrevia ?? redeDoEndereco;
  return (
    <div className="marca">
      <Brasao sigla={r?.sigla ?? 'CR'} tamanho={64} />
      <p className="marca-secretaria">{r ? r.secretaria : 'Sistema de ocorrências escolares'}</p>
      <p className="timbre-produto">Cuidar e Registrar</p>
      <p className="timbre-rede">{r?.nome ?? 'Ocorrências escolares'}</p>
    </div>
  );
}

/** Telefones de ajuda que valem em qualquer escola do país. */
const contatos: [string, string][] = [
  ['100', 'Disque Direitos Humanos'],
  ['190', 'Polícia Militar'],
  ['192', 'SAMU'],
  ['180', 'Central de Atendimento à Mulher'],
  ['188', 'Centro de Valorização da Vida'],
];

/** Rodapé: telefones de ajuda, links úteis e a faixa final. */
export function Rodape({ links = true }: { links?: boolean }) {
  const { demonstracao } = useSessao();
  return (
    <footer className="rodape">
      <section className="rodape-contatos" aria-labelledby="t-contatos">
        <h2 id="t-contatos"><IconeTelefone /> Telefones para ajuda</h2>
        <ul>
          {contatos.map(([n, r]) => (
            <li key={n}><strong>{n}</strong><span>{r}</span></li>
          ))}
        </ul>
      </section>
      {links && (
        <div className="rodape-colunas">
          <div>
            <h2>Sobre</h2>
            <p>Registro e acompanhamento de ocorrências escolares, do relato à devolutiva.</p>
          </div>
          <nav aria-label="Ajuda">
            <h2>Ajuda</h2>
            <ul>
              <li><Link to="/guia">Guia da interface</Link></li>
              <li><Link to="/duvidas">Dúvidas frequentes</Link></li>
              <li><Link to="/acessibilidade">Acessibilidade</Link></li>
            </ul>
          </nav>
          <div>
            <h2>Em caso de risco agora</h2>
            <p>Acolha o estudante, chame a direção e ligue para o 190 ou o 192. Registre depois.</p>
          </div>
        </div>
      )}
      <p className="rodape-faixa">
        Protótipo acadêmico (TCC), sem vínculo oficial com a Secretaria da Educação.{demonstracao ? ' Pessoas e casos são fictícios.' : ''}
      </p>
    </footer>
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

      {/* No computador, a navegação é uma linha com ícones; registrar vira o botão de destaque. */}
      <nav className="navegacao" aria-label="Principal">
        <ul>
          {itens.filter((n) => n.area !== 'registrar').map((n) => {
            const Icone = icones[n.area];
            return (
              <li key={n.area}>
                <NavLink to={n.caminho} end={n.caminho === '/'}><Icone />{n.rotulo}</NavLink>
              </li>
            );
          })}
          <li><NavLink to="/guia"><IconeAjuda />Guia</NavLink></li>
        </ul>
        {s.perfil && podeAcessar(s.perfil, 'registrar') && (
          <NavLink className="btn btn-primario navegacao-destaque" to="/registrar"><IconeLapis width={20} height={20} />Registrar ocorrência</NavLink>
        )}
      </nav>

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
            {itens.map((n) => {
              const Icone = icones[n.area];
              return (
                <li key={n.area}>
                  <NavLink to={n.caminho} end={n.caminho === '/'}><Icone />{n.rotulo}</NavLink>
                </li>
              );
            })}
            <li><NavLink to="/guia"><IconeAjuda />Guia da interface</NavLink></li>
          </ul>
        </details>
      </nav>

      <BarraDeContexto />

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
