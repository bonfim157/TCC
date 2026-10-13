import { Link } from 'react-router-dom';
import { acaoEmAberto, rotas, type Ocorrencia } from '../../api/contract';
import { LinhaDoTempo, situacaoPlano } from '../../components/caso';
import { Botao } from '../../components/controles';
import { Abas } from '../../components/estrutura';
import { Etiqueta, useNotificar } from '../../components/feedback';
import { dataHoraCurta, diaPorExtenso, diasAte, hojeISO } from '../../util/formato';
import { nomePapel } from '../registrar/PassoEnvolvidos';
import type { Dialogo } from './tipos';
import { nomeCanal } from './tipos';

/** Resumo, linha do tempo, encaminhamentos, plano e comunicações do caso. */
export function AbasDoCaso({ o, encerrado, abrir, executar }: {
  o: Ocorrencia;
  encerrado: boolean;
  abrir: (d: Dialogo) => void;
  executar: (rota: string, corpo: object) => Promise<boolean>;
}) {
  const notificar = useNotificar();
  return (
    <Abas
      rotulo="Informações do caso"
      abas={[
        {
          id: 'envolvidos',
          titulo: `Envolvidos (${o.envolvidos.length})`,
          conteudo: (
            <div className="pilha">
              {o.envolvidos.length === 0 ? <p>Nenhuma pessoa identificada.</p> : (
                <ul className="lista-revisao">
                  {o.envolvidos.map((e) => (
                    <li key={e.pessoaId}>
                      <p><strong className={e.restrito ? 'restrito' : undefined}>{e.nome}</strong>{e.turma ? `, ${e.turma}` : ''}</p>
                      <span>{nomePapel[e.papel]}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ),
        },
        { id: 'tempo', titulo: 'Linha do tempo', conteudo: <LinhaDoTempo eventos={o.eventos} maisRecentesPrimeiro /> },
        {
          id: 'enc',
          titulo: `Encaminhamentos (${o.encaminhamentos.length})`,
          conteudo: o.encaminhamentos.length === 0 ? <p>Nenhum encaminhamento externo.</p> : (
            <ul className="lista-encaminhamentos">
              {o.encaminhamentos.map((e) => {
                const atraso = !e.devolutiva ? -diasAte(e.devolutivaAte) : 0;
                return (
                  <li key={e.id} className="painel">
                    <div className="envolvido-cabeca">
                      <div>
                        <h3>{e.orgaoNome}</h3>
                        <p>{nomeCanal[e.canal]}{e.protocoloExterno ? `, ${e.protocoloExterno}` : ''}. Enviado em {dataHoraCurta(e.em)} por {e.registradoPor}.</p>
                      </div>
                      {e.devolutiva ? <Etiqueta tipo="ok">Devolutiva recebida</Etiqueta> : atraso > 0 ? <Etiqueta tipo="urgente">Atrasada há {atraso} {atraso === 1 ? 'dia' : 'dias'}</Etiqueta> : <Etiqueta tipo="info">Aguardando até {diaPorExtenso(e.devolutivaAte).replace(/ de \d{4}$/, '')}</Etiqueta>}
                    </div>
                    {e.devolutiva ? (
                      <p><strong>Devolutiva ({dataHoraCurta(e.devolutiva.em)}):</strong> {e.devolutiva.texto}</p>
                    ) : !encerrado && (
                      <div><Botao variante="secundario" onClick={() => abrir({ tipo: 'devolutiva', enc: e })}>Registrar devolutiva<span className="visualmente-oculto"> de {e.orgaoNome}</span></Botao></div>
                    )}
                  </li>
                );
              })}
            </ul>
          ),
        },
        {
          id: 'plano',
          titulo: `Plano de apoio (${o.plano.length})`,
          conteudo: o.plano.length === 0 ? <p>Nenhuma ação. Use “Incluir no plano”.</p> : (
            <ul className="lista-plano">
              {o.plano.map((a) => {
                const sit = acaoEmAberto(a) && a.prazo < hojeISO() ? 'atrasada' : a.situacao;
                return (
                  <li key={a.id}>
                    <div>
                      <strong>{a.descricao}</strong>
                      <span>{a.responsavel}, até {diaPorExtenso(a.prazo)}</span>
                    </div>
                    <div className="acoes-linha">
                      <Etiqueta tipo={situacaoPlano[sit][1]}>{situacaoPlano[sit][0]}</Etiqueta>
                      {acaoEmAberto(a) && !encerrado && (
                        <Botao variante="texto" onClick={() => executar(rotas.acao(o.id, `plano/${a.id}/concluir`), {}).then((ok) => ok && notificar('Ação concluída.'))}>
                          Concluir<span className="visualmente-oculto"> {a.descricao}</span>
                        </Botao>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          ),
        },
        {
          id: 'com',
          titulo: `Comunicações (${o.comunicacoes.length})`,
          conteudo: o.comunicacoes.length === 0 ? <p>Nenhuma comunicação enviada.</p> : (
            <ul className="lista-encaminhamentos">
              {o.comunicacoes.map((c) => (
                <li key={c.id} className="painel">
                  <div className="envolvido-cabeca">
                    <div>
                      <h3>{c.destinatario}</h3>
                      <p>{c.tipo === 'familia' ? 'Comunicação à família' : 'Ofício'}, {dataHoraCurta(c.em)}, por {c.registradaPor}.</p>
                    </div>
                    {c.tipo === 'familia' && (c.ciencia ? <Etiqueta tipo="ok">Ciência confirmada</Etiqueta> : <Etiqueta tipo="atencao">Aguardando ciência</Etiqueta>)}
                  </div>
                  {c.ciencia && <p>Confirmada por {c.ciencia.nome} em {dataHoraCurta(c.ciencia.em)}.</p>}
                  {c.linkCiencia && !c.ciencia && (
                    <p className="campo-ajuda">
                      Na versão real, a família recebe o link por mensagem. Demonstração: <Link to={c.linkCiencia} target="_blank">abrir a página que a família verá</Link>.
                    </p>
                  )}
                  <details>
                    <summary>Ver texto enviado</summary>
                    <p className="texto-relato">{c.texto}</p>
                  </details>
                </li>
              ))}
            </ul>
          ),
        },
      ]}
    />
  );
}
