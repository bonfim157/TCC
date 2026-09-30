import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { aoExpirarSessao, api, apiReal, configurarCliente } from '../api/client';
import { rotas, type Ambiente, type Escola, type Perfil, type Rede, type Sessao, type Usuario, type Vinculo } from '../api/contract';
import { useTemaDaRede } from './preferencias';

type EstadoSessao = {
  sessao: Sessao | null;
  redes: Rede[];
  rede: Rede | null;
  vinculo: Vinculo | null;
  perfil: Perfil | null;
  perfilDemo: Perfil | null;
  escolas: Escola[];
  escola: Escola | null;
  carregandoEscolas: boolean;
  entrar: (redeId: string, usuarioId: string) => Promise<void>;
  /** Conclui o login por senha: a sessão está no cookie; aqui só guardamos quem é a pessoa. */
  entrarComUsuario: (usuario: Usuario) => void;
  /**
   * Ambiente de demonstração: login escolhendo uma pessoa fictícia e seletor "ver como".
   * Sempre verdadeiro com a API simulada; no servidor real, só fora de produção.
   */
  demonstracao: boolean;
  /** A sessão venceu durante o uso e a pessoa foi levada ao login. */
  sessaoExpirada: boolean;
  /** Enquanto confere com o servidor se já existe sessão (cookie) ao abrir a página. */
  conferindoSessao: boolean;
  sair: () => void;
  trocarRede: (redeId: string) => void;
  trocarEscola: (escolaId: string) => void;
  definirPerfilDemo: (p: Perfil | null) => void;
  /** Rede pré-selecionada pelo endereço (subdomínio ou ?rede=). */
  redeDoEndereco: Rede | null;
  /** Rede escolhida na tela de entrada, antes do login. */
  redePrevia: Rede | null;
  definirRedePrevia: (id: string | null) => void;
};

const Ctx = createContext<EstadoSessao | null>(null);
const CHAVE = 'sessao.demo';

type Guardado = { sessao: Sessao; redeId: string; escolaId: string | null; perfilDemo: Perfil | null };

function lerGuardado(): Guardado | null {
  try {
    const v = sessionStorage.getItem(CHAVE);
    return v ? (JSON.parse(v) as Guardado) : null;
  } catch {
    return null;
  }
}

function redeDoEndereco(redes: Rede[]): Rede | null {
  const porQuery = new URLSearchParams(location.search).get('rede');
  const subdominio = location.hostname.split('.')[0];
  return redes.find((r) => r.subdominio === porQuery || r.subdominio === subdominio) ?? null;
}

export function SessaoProvider({ children }: { children: ReactNode }) {
  const guardado = useMemo(lerGuardado, []);
  const [redes, setRedes] = useState<Rede[]>([]);
  const [sessao, setSessao] = useState<Sessao | null>(guardado?.sessao ?? null);
  const [redeId, setRedeId] = useState<string | null>(guardado?.redeId ?? null);
  const [escolaId, setEscolaId] = useState<string | null>(guardado?.escolaId ?? null);
  const [perfilDemo, setPerfilDemo] = useState<Perfil | null>(guardado?.perfilDemo ?? null);
  const [escolas, setEscolas] = useState<Escola[]>([]);
  const [carregandoEscolas, setCarregandoEscolas] = useState(false);
  const [redePreviaId, setRedePreviaId] = useState<string | null>(null);
  const [sessaoExpirada, setSessaoExpirada] = useState(false);
  const [demonstracao, setDemonstracao] = useState<boolean | null>(apiReal ? null : true);
  const [conferindoSessao, setConferindoSessao] = useState(apiReal && !guardado);

  useEffect(() => {
    api<Rede[]>(rotas.redes).then(setRedes).catch(() => setRedes([]));
    if (apiReal) api<Ambiente>(rotas.ambiente).then((a) => setDemonstracao(a.loginDemo)).catch(() => setDemonstracao(false));
  }, []);

  const rede = redes.find((r) => r.id === redeId) ?? null;
  const vinculo = sessao?.usuario.vinculos.find((v) => v.redeId === redeId) ?? null;
  const perfil = (demonstracao ? perfilDemo : null) ?? vinculo?.perfil ?? null;
  const escola = escolas.find((e) => e.id === escolaId) ?? null;
  const doEndereco = useMemo(() => redeDoEndereco(redes), [redes]);

  const redePrevia = redes.find((r) => r.id === redePreviaId) ?? null;
  // Único lugar que aplica o tema: rede ativa, senão a escolhida no login, senão a do endereço.
  useTemaDaRede(redeId ?? redePreviaId ?? doEndereco?.id ?? null);

  // Sincroniza o cliente HTTP durante a renderização: os efeitos das telas
  // filhas rodam antes dos efeitos deste provedor e já precisam dos cabeçalhos.
  configurarCliente({ token: sessao?.token || null, redeId, escolaId });

  // Carrega as escolas alcançadas pelo vínculo sempre que a rede muda.
  useEffect(() => {
    if (!sessao || !redeId) {
      setEscolas([]);
      return;
    }
    let vivo = true;
    setCarregandoEscolas(true);
    configurarCliente({ token: sessao.token || null, redeId, escolaId: null });
    api<Escola[]>(rotas.escolas)
      .then((lista) => {
        if (!vivo) return;
        setEscolas(lista);
        setEscolaId((atual) => (lista.some((e) => e.id === atual) ? atual : lista[0]?.id ?? null));
      })
      .catch(() => vivo && setEscolas([]))
      .finally(() => vivo && setCarregandoEscolas(false));
    return () => {
      vivo = false;
    };
  }, [sessao, redeId]);

  useEffect(() => {
    try {
      if (sessao && redeId) sessionStorage.setItem(CHAVE, JSON.stringify({ sessao, redeId, escolaId, perfilDemo }));
      else sessionStorage.removeItem(CHAVE);
    } catch {
      /* sem armazenamento: a sessão vale até recarregar */
    }
  }, [sessao, redeId, escolaId, perfilDemo]);

  const entrar = useCallback(async (novaRede: string, usuarioId: string) => {
    const s = await api<Sessao>(rotas.sessoes, { method: 'POST', body: JSON.stringify({ redeId: novaRede, usuarioId }) });
    setPerfilDemo(null);
    setEscolaId(null);
    setRedeId(novaRede);
    setSessao(s);
  }, []);

  const limpar = useCallback(() => {
    setSessao(null);
    setRedeId(null);
    setEscolaId(null);
    setPerfilDemo(null);
  }, []);

  const sair = useCallback(() => {
    // No servidor real a sessão é um cookie: só o servidor consegue apagá-la.
    if (apiReal) api(rotas.sair, { method: 'POST' }).catch(() => {});
    setSessaoExpirada(false);
    limpar();
  }, [limpar]);

  const entrarComUsuario = useCallback((usuario: Usuario) => {
    // Rede: a do endereço, se a pessoa tiver vínculo com ela; senão, a primeira.
    const preferida = redeDoEndereco(redes)?.id;
    const redeInicial = usuario.vinculos.find((v) => v.redeId === preferida)?.redeId ?? usuario.vinculos[0]?.redeId ?? null;
    setSessaoExpirada(false);
    setPerfilDemo(null);
    setEscolaId(null);
    setRedeId(redeInicial);
    setSessao({ token: '', usuario });
  }, [redes]);

  // Sessão vencida: o servidor respondeu 401 a quem estava logado. O que estava
  // sendo digitado continua salvo como rascunho neste aparelho.
  useEffect(() => {
    aoExpirarSessao(sessao ? () => { setSessaoExpirada(true); limpar(); } : null);
    return () => aoExpirarSessao(null);
  }, [sessao, limpar]);

  // Ao abrir a página no modo real sem nada guardado (outra aba, por exemplo),
  // pergunta ao servidor se o cookie de sessão ainda vale.
  useEffect(() => {
    if (!conferindoSessao) return;
    let vivo = true;
    api<{ usuario: Usuario }>(rotas.sessao)
      .then(({ usuario }) => vivo && entrarComUsuario(usuario))
      .catch(() => {})
      .finally(() => vivo && setConferindoSessao(false));
    return () => {
      vivo = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const valor: EstadoSessao = {
    sessao,
    redes,
    rede,
    vinculo,
    perfil,
    perfilDemo,
    escolas,
    escola,
    carregandoEscolas,
    entrar,
    entrarComUsuario,
    demonstracao: demonstracao ?? false,
    sessaoExpirada,
    conferindoSessao: conferindoSessao || demonstracao === null,
    sair,
    trocarRede: (id) => {
      setPerfilDemo(null);
      setEscolaId(null);
      setRedeId(id);
    },
    trocarEscola: setEscolaId,
    definirPerfilDemo: setPerfilDemo,
    redeDoEndereco: doEndereco,
    redePrevia,
    definirRedePrevia: setRedePreviaId,
  };
  return <Ctx.Provider value={valor}>{children}</Ctx.Provider>;
}

export function useSessao() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useSessao fora do provedor');
  return v;
}
