import { useSyncExternalStore } from 'react';
import { simularSemConexao } from '../api/client';

/* Conexão real do navegador somada à simulação usada nas demonstrações. */
let simulada = false;
const ouvintes = new Set<() => void>();

export function definirSemConexaoSimulada(v: boolean) {
  simulada = v;
  simularSemConexao(v);
  ouvintes.forEach((o) => o());
}

function inscrever(o: () => void) {
  ouvintes.add(o);
  addEventListener('online', o);
  addEventListener('offline', o);
  return () => {
    ouvintes.delete(o);
    removeEventListener('online', o);
    removeEventListener('offline', o);
  };
}

export const useConexao = () => useSyncExternalStore(inscrever, () => navigator.onLine && !simulada);
export const semConexaoSimuladaAtiva = () => simulada;
