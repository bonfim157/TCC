import { useCallback, useState } from 'react';
import { api, ErroDaApi, FalhaDeRede } from '../../api/client';
import type { Ocorrencia } from '../../api/contract';

/**
 * Executa uma ação sobre o caso (POST) e devolve o caso atualizado.
 * O erro vem em texto pronto para mostrar dentro do diálogo.
 */
export function useAcaoNoCaso(aoAtualizar: (o: Ocorrencia) => void) {
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const executar = useCallback(
    async (caminho: string, corpo: unknown) => {
      setCarregando(true);
      setErro(null);
      try {
        const o = await api<Ocorrencia>(caminho, { method: 'POST', body: JSON.stringify(corpo) });
        aoAtualizar(o);
        return true;
      } catch (e) {
        setErro(
          e instanceof FalhaDeRede
            ? 'Sem conexão. Nada foi registrado; tente de novo quando a conexão voltar.'
            : e instanceof ErroDaApi
              ? e.message
              : 'Não foi possível registrar. Tente de novo.',
        );
        return false;
      } finally {
        setCarregando(false);
      }
    },
    [aoAtualizar],
  );

  return { executar, carregando, erro, limparErro: () => setErro(null) };
}
