import type { Ocorrencia } from '../../api/contract';
import { Botao } from '../../components/controles';
import { Painel } from '../../components/estrutura';
import type { Dialogo } from './tipos';

/** Registro do caso no sistema oficial da rede (Conviva SP, na rede estadual). */
export function PainelDaRede({ o, redeSP, encerrado, abrir }: { o: Ocorrencia; redeSP: boolean; encerrado: boolean; abrir: (d: Dialogo) => void }) {
  return (
    <Painel titulo={redeSP ? 'Conviva SP' : 'Sistema da rede'}>
      {o.registroNaRede ? (
        <p>Lançado: <strong>{o.registroNaRede}</strong>.</p>
      ) : (
        <div className="pilha">
          <p>{redeSP ? 'Ainda não lançado no Conviva SP (Placon).' : 'Ainda não lançado no sistema oficial da rede.'}</p>
          {!encerrado && <div><Botao variante="secundario" onClick={() => abrir({ tipo: 'rede' })}>Registrar código</Botao></div>}
        </div>
      )}
    </Painel>
  );
}
