import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { api, configurarCliente } from '../api/client';
import { rotas, type Escola, type Perfil, type Rede, type Sessao, type Vinculo } from '../api/contract';
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

  useEffect(() => {
    api<Rede[]>(rotas.redes).then(setRedes).catch(() => setRedes([]));
  }, []);

  const rede = redes.find((r) => r.id === redeId) ?? null;
  const vinculo = sessao?.usuario.vinculos.find((v) => v.redeId === redeId) ?? null;
  const perfil = perfilDemo ?? vinculo?.perfil ?? null;
  const escola = escolas.find((e) => e.id === escolaId) ?? null;
  const doEndereco = useMemo(() => redeDoEndereco(redes), [redes]);

  const redePrevia = redes.find((r) => r.id === redePreviaId) ?? null;
  // Único lugar que aplica o tema: rede ativa, senão a escolhida no login, senão a do endereço.
  useTemaDaRede(redeId ?? redePreviaId ?? doEndereco?.id ?? null);

  // Sincroniza o cliente HTTP durante a renderização: os efeitos das telas
  // filhas rodam antes dos efeitos deste provedor e já precisam dos cabeçalhos.
  configurarCliente({ token: sessao?.token ?? null, redeId, escolaId });

  // Carrega as escolas alcançadas pelo vínculo sempre que a rede muda.
  useEffect(() => {
    if (!sessao || !redeId) {
      setEscolas([]);
      return;
    }
    let vivo = true;
    setCarregandoEscolas(true);
    configurarCliente({ token: sessao.token, redeId, escolaId: null });
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

  const sair = useCallback(() => {
    setSessao(null);
    setRedeId(null);
    setEscolaId(null);
    setPerfilDemo(null);
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
