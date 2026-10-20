import { useEffect, useRef, useState, type JSX, type SVGProps } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { DialogoConfirmacao } from '../components/estrutura';
import {
  IconeCasa, IconeCoracao, IconeDocumento, IconeGrafico, IconeLapis, IconeLupa, IconePessoas,
  IconeSemConexao, IconeTelefone,
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
  central: IconeCoracao,
  buscar: IconeLupa,
  relatorios: IconeGrafico,
  administracao: IconePessoas,
};

/** Iniciais para o avatar: primeira e última palavra do nome. */
export const iniciais = (nome = '') => {
  const p = nome.trim().split(/\s+/);
  return ((p[0]?.[0] ?? '') + (p.length > 1 ? p[p.length - 1][0] : '')).toUpperCase();
};

/** Nome do sistema, com o coração que é a marca. Na lousa das telas de acesso e no topo das páginas públicas. */
export function Marca() {
  return (
    <span className="marca">
      <IconeCoracao width={26} height={26} aria-hidden="true" />
      Cuidar e Registrar
    </span>
  );
}

/** Telefones de ajuda que valem em qualquer escola do país, do mais urgente ao de apoio. */
export const contatos: [string, string][] = [
  ['192', 'SAMU'],
  ['190', 'Polícia Militar'],
  ['188', 'CVV'],
  ['100', 'Direitos Humanos'],
  ['180', 'Atendimento à Mulher'],
];

/** Rodapé discreto: o que fazer em caso de risco e o aviso do protótipo. */
export function Rodape() {
  const { demonstracao } = useSessao();
  return (
    <footer className="rodape">
      <section className="rodape-risco" aria-labelledby="t-risco">
        <h2 id="t-risco"><IconeTelefone width={18} height={18} /> Alguém corre risco agora?</h2>
        <p>Acolha o estudante e chame a direção. Registre depois.</p>
        <ul className="rodape-telefones">
          {contatos.map(([n, r]) => (
            <li key={n}><strong>{n}</strong> {r}</li>
          ))}
        </ul>
      </section>
      {/* Na demonstração, a faixa do topo já diz isso em toda tela. */}
      {!demonstracao && (
        <p className="rodape-nota">Protótipo acadêmico (TCC), sem vínculo oficial com a Secretaria da Educação.</p>
      )}
    </footer>
  );
}

/** Estrutura das páginas públicas (ajuda, acessibilidade) para quem ainda não entrou. */
export function EstruturaPublica() {
  return (
    <div className="app app-publica">
      <a className="pular-conteudo" href="#conteudo">Pular para o conteúdo</a>
      <header className="topo-publico">
        <Link to="/entrar" className="topo-publico-marca"><Marca /></Link>
        <ControlesDeAcessibilidade />
        <Link className="btn btn-primario" to="/entrar">Entrar</Link>
      </header>
      <main id="conteudo" tabIndex={-1}>
        <Outlet />
        <Rodape />
      </main>
    </div>
  );
}

/** "Minha conta": sempre no mesmo lugar, com o nome e o perfil de quem está usando. */
function LinkDaConta({ compacto }: { compacto?: boolean }) {
  const s = useSessao();
  const nome = s.sessao?.usuario.nome;
  if (compacto) {
    return (
      <NavLink to="/conta" className="avatar avatar-link" aria-label={`Minha conta, ${nome}`}>{iniciais(nome)}</NavLink>
    );
  }
  return (
    <NavLink to="/conta" className="lateral-conta">
      <span className="avatar" aria-hidden="true">{iniciais(nome)}</span>
      <span>
        <strong>Minha conta</strong>
        <span>{nome}{s.perfil ? `, ${nomePerfil[s.perfil].toLowerCase()}` : ''}</span>
      </span>
    </NavLink>
  );
}

export function Estrutura() {
  const s = useSessao();
  const { haRascunho } = useGuardaDeRascunho();
  const online = useConexao();
  const [confirmarSaida, setConfirmarSaida] = useState(false);
  const local = useLocation();
  const principal = useRef<HTMLElement>(null);
  const celular = useMidia(CELULAR);

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

  const pode = (a: Area) => !!s.perfil && podeAcessar(s.perfil, a);
  // A busca mora dentro de Acompanhamentos; só aparece sozinha para quem não acompanha casos.
  const itens = navegacao.filter((n) => pode(n.area) && n.area !== 'registrar' && !(n.area === 'buscar' && pode('central')));
  const sair = () => (haRascunho ? setConfirmarSaida(true) : s.sair());

  const offline = !online && (
    <div className="faixa-offline" role="status">
      <IconeSemConexao />
      <p>
        <strong>Sem internet agora.</strong> Pode continuar escrevendo: fica salvo neste aparelho e o envio volta quando a conexão voltar.
      </p>
    </div>
  );

  const link = (n: (typeof navegacao)[number], curto?: boolean) => {
    const Icone = icones[n.area];
    return (
      <li key={n.area}>
        <NavLink to={n.caminho} end={n.caminho === '/'}><Icone aria-hidden="true" />{curto ? n.curto ?? n.rotulo : n.rotulo}</NavLink>
      </li>
    );
  };

  return (
    <div className={celular ? 'app app-celular' : 'app app-lateral'}>
      <a className="pular-conteudo" href="#conteudo">Pular para o conteúdo</a>

      {celular ? (
        <header className="topo-celular">
          <BarraDeContexto />
          <LinkDaConta compacto />
        </header>
      ) : (
        <nav className="lateral" aria-label="Principal">
          <BarraDeContexto />
          {pode('registrar') && (
            <NavLink className="lateral-registrar" to="/registrar"><IconeLapis aria-hidden="true" />Registrar ocorrência</NavLink>
          )}
          <ul className="lateral-itens">{itens.map((n) => link(n))}</ul>
          <LinkDaConta />
        </nav>
      )}

      <div className="area-conteudo">
        {offline}
        <main id="conteudo" ref={principal} tabIndex={-1}>
          <Outlet context={{ sair }} />
        </main>
        <Rodape />
      </div>

      {celular && (
        <nav className="abas-celular" aria-label="Principal">
          <ul>
            {/* No máximo cinco abas: a matriz de acesso nunca dá mais que isso a um perfil. */}
            {navegacao.filter((n) => pode(n.area) && !(n.area === 'buscar' && pode('central'))).map((n) => link(n, true))}
          </ul>
        </nav>
      )}

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
