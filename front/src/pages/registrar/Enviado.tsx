import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import type { Ocorrencia } from '../../api/contract';
import { Botao } from '../../components/controles';
import { EtiquetaPrioridade } from '../../components/feedback';

/** Confirmação do envio: o protocolo é o que a pessoa precisa guardar. */
export function Enviado({ ocorrencia, aoNovo }: { ocorrencia: Ocorrencia; aoNovo: () => void }) {
  const titulo = useRef<HTMLHeadingElement>(null);
  useEffect(() => titulo.current?.focus(), []);
  const urgente = ocorrencia.prioridade === 'urgente';

  return (
    <div className="pagina pagina-estreita">
      <section className="protocolo" aria-labelledby="t-enviado">
        <h1 id="t-enviado" ref={titulo} tabIndex={-1}>
          {urgente ? 'Registro enviado. A direção foi avisada.' : 'Registro enviado para triagem'}
        </h1>
        <p className="protocolo-rotulo">Número de protocolo</p>
        <p className="protocolo-numero">{ocorrencia.protocolo}</p>
        <EtiquetaPrioridade prioridade={ocorrencia.prioridade} />
        <p>
          {urgente
            ? 'Continue acompanhando o estudante até a direção assumir. Se ainda não avisou pessoalmente, avise agora.'
            : 'A coordenação vai conferir o registro e definir os próximos passos. Você pode acompanhar a situação pelo protocolo.'}
        </p>
      </section>
      <div className="acoes-linha">
        <Link className="btn btn-primario" to={`/casos/${ocorrencia.id}`}>Acompanhar este caso</Link>
        <Botao variante="secundario" onClick={aoNovo}>Registrar outra ocorrência</Botao>
      </div>
    </div>
  );
}
