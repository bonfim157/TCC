import { useCallback, useEffect, useState } from 'react';
import { api, ErroDaApi, FalhaDeRede } from '../api/client';

export type EstadoCarga<T> =
  | { tipo: 'carregando' }
  | { tipo: 'ok'; dados: T }
  | { tipo: 'sem-conexao' }
  | { tipo: 'erro'; status: number; mensagem: string };

/** Busca um recurso e expõe os quatro estados que toda tela precisa tratar. */
export function useApi<T>(caminho: string | null, deps: unknown[] = [], opcoes: { manterAoAtualizar?: boolean } = {}) {
  const [estado, setEstado] = useState<EstadoCarga<T>>({ tipo: 'carregando' });
  const [tentativa, setTentativa] = useState(0);

  useEffect(() => {
    if (!caminho) return;
    let vivo = true;
    // Ao atualizar a mesma tela, mantém o que já está visível até a resposta chegar.
    // Não use ao trocar de rede ou escola: dados do contexto anterior não podem aparecer.
    setEstado((atual) => (opcoes.manterAoAtualizar && atual.tipo === 'ok' ? atual : { tipo: 'carregando' }));
    api<T>(caminho)
      .then((dados) => vivo && setEstado({ tipo: 'ok', dados }))
      .catch((e: unknown) => {
        if (!vivo) return;
        if (e instanceof FalhaDeRede) setEstado({ tipo: 'sem-conexao' });
        else if (e instanceof ErroDaApi) setEstado({ tipo: 'erro', status: e.status, mensagem: e.dados.mensagem });
        else setEstado({ tipo: 'erro', status: 0, mensagem: 'Algo inesperado aconteceu.' });
      });
    return () => {
      vivo = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [caminho, tentativa, ...deps]);

  const tentarDeNovo = useCallback(() => setTentativa((n) => n + 1), []);
  return { estado, tentarDeNovo };
}
