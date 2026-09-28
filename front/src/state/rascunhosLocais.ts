import { useCallback, useSyncExternalStore } from 'react';
import type { Anexo, DadosDoFato, Envolvimento } from '../api/contract';

/*
 * Rascunhos de registro guardados neste aparelho, a cada alteração.
 * Sobrevivem a recarregar a página e à queda de conexão. Ficam separados
 * por pessoa, rede e escola: nunca aparecem em outro contexto.
 *
 * Observação para a versão real: o aparelho pode ser compartilhado na sala
 * dos professores. Os rascunhos são apagados ao enviar e ao descartar; o
 * backend poderá oferecer rascunho no servidor como alternativa.
 */

export type RascunhoRegistro = {
  id: string;
  atualizadoEm: string;
  passo: number;
  fato: DadosDoFato;
  /** Resposta à pergunta de risco; nula enquanto a pessoa não responde. */
  risco: 'sim' | 'nao' | null;
  envolvidos: Envolvimento[];
  anexos: Anexo[];
};

export type Dono = { usuarioId: string; redeId: string; escolaId: string };

const chave = (d: Dono) => `rascunhos:${d.usuarioId}:${d.redeId}:${d.escolaId}`;
const ouvintes = new Set<() => void>();
const avisar = () => ouvintes.forEach((o) => o());
const cache = new Map<string, { bruto: string | null; lista: RascunhoRegistro[] }>();

function ler(d: Dono): RascunhoRegistro[] {
  let bruto: string | null = null;
  try {
    bruto = localStorage.getItem(chave(d));
  } catch {
    /* armazenamento indisponível */
  }
  const c = cache.get(chave(d));
  if (c && c.bruto === bruto) return c.lista;
  let lista: RascunhoRegistro[] = [];
  try {
    lista = bruto ? (JSON.parse(bruto) as RascunhoRegistro[]) : [];
  } catch {
    lista = [];
  }
  cache.set(chave(d), { bruto, lista });
  return lista;
}

function gravar(d: Dono, lista: RascunhoRegistro[]) {
  try {
    localStorage.setItem(chave(d), JSON.stringify(lista));
    avisar();
    return true;
  } catch {
    avisar();
    return false;
  }
}

export function salvarRascunho(d: Dono, r: RascunhoRegistro) {
  const lista = ler(d).filter((x) => x.id !== r.id);
  return gravar(d, [{ ...r, atualizadoEm: new Date().toISOString() }, ...lista]);
}

export function apagarRascunho(d: Dono, id: string) {
  gravar(d, ler(d).filter((x) => x.id !== id));
}

export function obterRascunho(d: Dono, id: string) {
  return ler(d).find((x) => x.id === id) ?? null;
}

/** Lista reativa dos rascunhos do contexto atual. */
export function useRascunhosLocais(d: Dono | null) {
  const inscrever = useCallback((o: () => void) => {
    ouvintes.add(o);
    addEventListener('storage', o);
    return () => {
      ouvintes.delete(o);
      removeEventListener('storage', o);
    };
  }, []);
  return useSyncExternalStore(inscrever, () => (d ? ler(d) : vazio));
}
const vazio: RascunhoRegistro[] = [];

export const novoIdRascunho = () => `r-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
