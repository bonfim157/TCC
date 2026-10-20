import type { Evento, TipoEvento } from '../api/contract';
import { nomePerfil } from '../state/perfis';
import { dataHoraCurta } from '../util/formato';

/* Peças do caso usadas no detalhe (F2) e na Central de Gestão (F3). */

export const nomeEvento: Record<TipoEvento, string> = {
  registro: 'Registro criado',
  triagem: 'A coordenação leu e assumiu',
  escuta: 'Conversa com os estudantes',
  comunicacao_familia: 'Comunicação com a família',
  encaminhamento: 'Pedido de apoio à rede',
  adendo: 'Informação acrescentada',
  reavaliacao: 'Reavaliação',
  providencia: 'Próximo passo',
  encerramento: 'Acompanhamento concluído',
};

export const situacaoPlano = {
  no_prazo: ['No prazo', 'info'],
  atrasada: ['Atrasada', 'urgente'],
  concluida: ['Concluída', 'ok'],
  cancelada: ['Cancelada no encerramento', 'neutra'],
} as const;

/** Linha do tempo: nada é apagado; adendos aparecem marcados na margem. */
export function LinhaDoTempo({ eventos, maisRecentesPrimeiro = false }: { eventos: Evento[]; maisRecentesPrimeiro?: boolean }) {
  const lista = maisRecentesPrimeiro ? [...eventos].reverse() : eventos;
  return (
    <ol className="linha-tempo">
      {lista.map((e) => (
        <li key={e.id} className={e.tipo === 'adendo' ? 'evento evento-adendo' : 'evento'}>
          <p className="evento-quando"><time dateTime={e.em}>{dataHoraCurta(e.em)}</time></p>
          <div className="evento-corpo">
            <h3>{nomeEvento[e.tipo]}</h3>
            <p className="evento-autor">{e.autorNome}{e.tipo === 'comunicacao_familia' && e.texto.startsWith('Ciência') ? ', família' : `, ${nomePerfil[e.autorPerfil].toLowerCase()}`}</p>
            <p>{e.texto}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}
