import { useMemo } from 'react';
import type { Dono } from './rascunhosLocais';
import { useSessao } from './sessao';

/** Pessoa, rede e escola ativas: a "chave" dos rascunhos locais. */
export function useDono(): Dono | null {
  const { sessao, rede, escola } = useSessao();
  const usuarioId = sessao?.usuario.id;
  return useMemo(
    () => (usuarioId && rede && escola ? { usuarioId, redeId: rede.id, escolaId: escola.id } : null),
    [usuarioId, rede, escola],
  );
}
