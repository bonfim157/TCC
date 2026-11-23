import { useState } from 'react';
import { api, ErroDaApi, FalhaDeRede } from '../api/client';
import { rotas, type Evento, type Ocorrencia, type TipoEvento } from '../api/contract';
import { Botao, CampoAreaTexto } from './controles';
import { useConexao } from '../layout/useConexao';
import { nomePerfil } from '../state/perfis';
import { useSessao } from '../state/sessao';
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

/** Só quem escreveu o adendo corrige. O servidor confere de novo; aqui é só para não mostrar o botão. */
function CorrigirAdendo({ ocorrenciaId, evento, aoCorrigir }: { ocorrenciaId: string; evento: Evento; aoCorrigir: (o: Ocorrencia) => void }) {
  const [editando, setEditando] = useState(false);
  const [texto, setTexto] = useState(evento.texto);
  const [erro, setErro] = useState('');
  const [enviando, setEnviando] = useState(false);
  const online = useConexao();

  if (!editando) {
    return (
      <div>
        <Botao variante="texto" onClick={() => { setTexto(evento.texto); setErro(''); setEditando(true); }}>Corrigir o que escrevi</Botao>
      </div>
    );
  }

  async function salvar() {
    if (texto.trim().length < 10) return setErro('O adendo precisa ter pelo menos 10 caracteres.');
    setEnviando(true);
    setErro('');
    try {
      const o = await api<Ocorrencia>(rotas.corrigirAdendo(ocorrenciaId, evento.id), { method: 'POST', body: JSON.stringify({ texto }) });
      aoCorrigir(o);
      setEditando(false);
    } catch (e) {
      setErro(e instanceof FalhaDeRede ? 'Sem conexão. A correção não foi salva.' : e instanceof ErroDaApi ? e.message : 'Não foi possível salvar a correção.');
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="pilha">
      <CampoAreaTexto
        rotulo="Corrigir o adendo"
        ajuda="A versão atual vai para o histórico. Ela continua visível para quem acompanha o caso."
        value={texto}
        maxLength={1000}
        rows={3}
        onChange={(e) => setTexto(e.target.value)}
        erro={erro}
      />
      <div className="acoes-linha">
        <Botao onClick={salvar} carregando={enviando} disabled={!online}>Salvar correção</Botao>
        <Botao variante="texto" onClick={() => setEditando(false)}>Cancelar</Botao>
      </div>
    </div>
  );
}

/** Linha do tempo: nada é apagado; adendos aparecem marcados na margem e guardam as versões anteriores. */
export function LinhaDoTempo({ eventos, maisRecentesPrimeiro = false, ocorrenciaId, aoCorrigir }: {
  eventos: Evento[];
  maisRecentesPrimeiro?: boolean;
  /** Com estes dois, o autor de um adendo pode corrigi-lo nesta tela. */
  ocorrenciaId?: string;
  aoCorrigir?: (o: Ocorrencia) => void;
}) {
  const usuarioId = useSessao().sessao?.usuario.id;
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
            {e.editadoEm && <p className="evento-editado">Corrigido em {dataHoraCurta(e.editadoEm)}</p>}
            {e.anteriores && e.anteriores.length > 0 && (
              <details className="evento-versoes">
                <summary>Versões anteriores ({e.anteriores.length})</summary>
                <ol>
                  {e.anteriores.map((v, i) => (
                    <li key={`${v.em}-${i}`}>
                      <time dateTime={v.em}>{dataHoraCurta(v.em)}</time>
                      <p>{v.texto}</p>
                    </li>
                  ))}
                </ol>
              </details>
            )}
            {ocorrenciaId && aoCorrigir && e.tipo === 'adendo' && e.autorId && e.autorId === usuarioId && (
              <CorrigirAdendo ocorrenciaId={ocorrenciaId} evento={e} aoCorrigir={aoCorrigir} />
            )}
          </div>
        </li>
      ))}
    </ol>
  );
}
