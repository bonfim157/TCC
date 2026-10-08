import { useEffect, useState } from 'react';

/** Telas em que a navegação vira menu e o contexto recolhe. Igual ao ponto de quebra do layout.css. */
export const CELULAR = '(max-width: 980px)';

/**
 * Acompanha uma media query. Lê o valor já na primeira renderização, para o celular
 * não piscar a versão de computador, e reage à rotação da tela.
 */
export function useMidia(consulta: string) {
  const [casa, setCasa] = useState(() => matchMedia(consulta).matches);
  useEffect(() => {
    const mq = matchMedia(consulta);
    const ouvir = () => setCasa(mq.matches);
    ouvir();
    mq.addEventListener('change', ouvir);
    return () => mq.removeEventListener('change', ouvir);
  }, [consulta]);
  return casa;
}
