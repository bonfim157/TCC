import { useEffect, useState } from 'react';

/**
 * Contador que avança quando os dados podem ter mudado por ação de outra
 * pessoa: a cada intervalo com a aba visível e ao voltar para a aba. Use o
 * valor como dependência de useApi (com manterAoAtualizar) para recarregar
 * sem piscar a tela.
 *
 * Com o backend real, o intervalo é o que mantém a fila em dia. Na
 * demonstração, a API simulada grava no navegador e o evento "storage"
 * avisa na hora quando outra aba altera os dados.
 */
export function useAtualizacao(intervaloMs = 30_000) {
  const [versao, setVersao] = useState(0);

  useEffect(() => {
    const avancar = () => setVersao((v) => v + 1);
    const aoVoltar = () => { if (document.visibilityState === 'visible') avancar(); };
    const aoGravarOutraAba = (e: StorageEvent) => { if (e.key?.startsWith('demo.banco')) avancar(); };
    const relogio = setInterval(() => { if (document.visibilityState === 'visible') avancar(); }, intervaloMs);
    document.addEventListener('visibilitychange', aoVoltar);
    window.addEventListener('storage', aoGravarOutraAba);
    return () => {
      clearInterval(relogio);
      document.removeEventListener('visibilitychange', aoVoltar);
      window.removeEventListener('storage', aoGravarOutraAba);
    };
  }, [intervaloMs]);

  return versao;
}
