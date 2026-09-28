import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { rotas, type Categoria, type ItemDaAgenda, type ItemDaFila, type Prioridade } from '../../api/contract';
import { CaixaMarcar, CampoSelecao } from '../../components/controles';
import { Painel } from '../../components/estrutura';
import { Etiqueta, EtiquetaPrioridade, EtiquetaStatus, EstadoDaCarga, Vazio } from '../../components/feedback';
import { useSessao } from '../../state/sessao';
import { useApi } from '../../state/useApi';
import { dataHoraCurta, diaPorExtenso, diasAte, hojeISO } from '../../util/formato';
import { CasoNaCentral } from './CasoNaCentral';

type Filtro = 'todos' | 'novas' | 'urgentes' | 'ct' | 'devolutivas';
type Situacao = 'abertos' | 'encerrados' | 'todos';

const pesoPrioridade: Record<Prioridade, number> = { urgente: 0, alta: 1, media: 2, baixa: 3 };

function ordenar(a: ItemDaFila, b: ItemDaFila) {
  const atencao = (i: ItemDaFila) => (i.ctPendente ? 2 : 0) + (i.devolutivasAtrasadas ? 1 : 0);
  return (
    pesoPrioridade[a.prioridade] - pesoPrioridade[b.prioridade] ||
    atencao(b) - atencao(a) ||
    (a.proximoPrazo ?? '9999').localeCompare(b.proximoPrazo ?? '9999') ||
    b.abertaEm.localeCompare(a.abertaEm)
  );
}

function Indicador({ ativo, valor, rotulo, destaque, aoClicar }: { ativo: boolean; valor: number; rotulo: string; destaque?: boolean; aoClicar: () => void }) {
  return (
    <button type="button" className={`indicador${destaque && valor > 0 ? ' indicador-alerta' : ''}`} aria-pressed={ativo} onClick={aoClicar}>
      <strong>{valor}</strong>
      <span>{rotulo}</span>
    </button>
  );
}

function Agenda({ versao }: { versao: number }) {
  const s = useSessao();
  const agenda = useApi<ItemDaAgenda[]>(rotas.agenda, [s.escola?.id, versao], { manterAoAtualizar: true });
  const nomeTipo = { prazo_plano: 'Plano de apoio', devolutiva: 'Devolutiva', reavaliacao: 'Reavaliação' };
  return (
    <Painel titulo="Agenda" className="central-agenda">
      <EstadoDaCarga estado={agenda.estado} tentarDeNovo={agenda.tentarDeNovo} rotulo="Carregando agenda">
        {(itens) =>
          itens.length === 0 ? (
            <p>Nada agendado nos casos da escola.</p>
          ) : (
            <ul className="lista-agenda">
              {itens.slice(0, 8).map((i, n) => {
                const d = diasAte(i.data);
                return (
                  <li key={`${i.ocorrenciaId}-${n}`} className={d < 0 ? 'agenda-atrasada' : undefined}>
                    <span className="agenda-data">{diaPorExtenso(i.data).replace(/ de \d{4}$/, '')}</span>
                    <span>
                      <strong>{i.descricao}</strong>
                      <span>
                        {nomeTipo[i.tipo]}, <Link to={`/central/${i.ocorrenciaId}`}>caso {i.protocolo}</Link>
                        {d < 0 ? `, atrasada há ${-d} ${d === -1 ? 'dia' : 'dias'}` : d === 0 ? ', hoje' : ''}
                      </span>
                    </span>
                  </li>
                );
              })}
            </ul>
          )
        }
      </EstadoDaCarga>
    </Painel>
  );
}

/**
 * Tela 7: Central de Gestão. Fila, caso, providências e agenda em um só lugar,
 * para quem conduz os casos da escola.
 */
export function Central() {
  // Trocar de escola remonta a tela: nada da escola anterior continua visível.
  const { escola } = useSessao();
  return <CentralDaEscola key={escola?.id ?? ''} />;
}

function CentralDaEscola() {
  const { id } = useParams();
  const s = useSessao();
  const [versao, setVersao] = useState(0);
  const fila = useApi<ItemDaFila[]>(rotas.fila, [s.escola?.id, versao], { manterAoAtualizar: true });
  const categorias = useApi<Categoria[]>(rotas.categorias, [s.rede?.id]);
  const [filtro, setFiltro] = useState<Filtro>('todos');
  const [situacao, setSituacao] = useState<Situacao>('abertos');
  const [soMeus, setSoMeus] = useState(false);

  const nomeCategoria = useMemo(() => {
    const lista = categorias.estado.tipo === 'ok' ? categorias.estado.dados : [];
    return (cid: string) => lista.find((c) => c.id === cid)?.nome ?? '';
  }, [categorias.estado]);

  const alternar = (f: Filtro) => setFiltro((atual) => (atual === f ? 'todos' : f));

  return (
    <div className={id ? 'central central-com-caso' : 'central'}>
      <div className="pagina-cabeca central-cabeca">
        <h1>Central de gestão</h1>
        <p>{s.escola?.nome}</p>
      </div>

      <EstadoDaCarga estado={fila.estado} tentarDeNovo={fila.tentarDeNovo} rotulo="Carregando a fila">
        {(itens) => {
          const hoje = hojeISO();
          const abertos = itens.filter((i) => i.status !== 'encerrado');
          const contagem = {
            novas: abertos.filter((i) => i.abertaEm.slice(0, 10) === hoje || i.status === 'recebido').length,
            urgentes: abertos.filter((i) => i.prioridade === 'urgente').length,
            ct: abertos.filter((i) => i.ctPendente).length,
            devolutivas: abertos.filter((i) => i.devolutivasAtrasadas > 0).length,
          };
          const visiveis = itens
            .filter((i) => (situacao === 'todos' ? true : situacao === 'abertos' ? i.status !== 'encerrado' : i.status === 'encerrado'))
            .filter((i) => !soMeus || i.responsavelNome === s.sessao?.usuario.nome)
            .filter((i) =>
              filtro === 'novas' ? i.abertaEm.slice(0, 10) === hoje || i.status === 'recebido'
                : filtro === 'urgentes' ? i.prioridade === 'urgente'
                  : filtro === 'ct' ? i.ctPendente
                    : filtro === 'devolutivas' ? i.devolutivasAtrasadas > 0
                      : true,
            )
            .sort(ordenar);

          return (
            <>
              <div className="indicadores" role="group" aria-label="Filtrar a fila pelo que pede atenção">
                <Indicador ativo={filtro === 'novas'} valor={contagem.novas} rotulo="novas ou sem triagem" aoClicar={() => alternar('novas')} />
                <Indicador ativo={filtro === 'urgentes'} valor={contagem.urgentes} rotulo="urgentes" destaque aoClicar={() => alternar('urgentes')} />
                <Indicador ativo={filtro === 'ct'} valor={contagem.ct} rotulo="a comunicar ao Conselho Tutelar" destaque aoClicar={() => alternar('ct')} />
                <Indicador ativo={filtro === 'devolutivas'} valor={contagem.devolutivas} rotulo="com devolutiva atrasada" destaque aoClicar={() => alternar('devolutivas')} />
              </div>

              <div className="central-corpo">
                <section className="central-fila" aria-labelledby="t-fila">
                  <div className="central-fila-cabeca">
                    <h2 id="t-fila">Fila da escola</h2>
                    <CampoSelecao rotulo="Situação" value={situacao} onChange={(e) => setSituacao(e.target.value as Situacao)}>
                      <option value="abertos">Em aberto</option>
                      <option value="encerrados">Encerrados</option>
                      <option value="todos">Todos</option>
                    </CampoSelecao>
                    <CaixaMarcar rotulo="Só os que eu conduzo" checked={soMeus} onChange={(e) => setSoMeus(e.target.checked)} />
                  </div>
                  <p className="visualmente-oculto" aria-live="polite">{visiveis.length} casos na fila.</p>
                  {visiveis.length === 0 ? (
                    <Vazio titulo="Nenhum caso com esses filtros">
                      {filtro !== 'todos' || soMeus ? 'Limpe os filtros para ver toda a fila.' : 'Quando alguém registrar uma ocorrência nesta escola, ela aparece aqui.'}
                    </Vazio>
                  ) : (
                    <ul className="fila">
                      {visiveis.map((i) => (
                        <li key={i.id}>
                          <Link to={`/central/${i.id}`} className="fila-item" aria-current={i.id === id ? 'true' : undefined}>
                            <span className="fila-linha">
                              <strong>{i.protocolo}</strong>
                              <EtiquetaPrioridade prioridade={i.prioridade} />
                            </span>
                            <span className="fila-tipo">{nomeCategoria(i.categoriaId)}, {i.local}</span>
                            <span className="fila-meta">{dataHoraCurta(i.abertaEm)}{i.responsavelNome ? `. Com ${i.responsavelNome}` : '. Sem responsável'}</span>
                            <span className="fila-sinais">
                              <EtiquetaStatus status={i.status} />
                              {i.ctPendente && <Etiqueta tipo="urgente">Comunicar Conselho Tutelar</Etiqueta>}
                              {i.devolutivasAtrasadas > 0 && <Etiqueta tipo="atencao">Devolutiva atrasada</Etiqueta>}
                              {!i.ctPendente && i.obrigatoriasPendentes > 0 && i.status !== 'encerrado' && (
                                <Etiqueta tipo="neutra">{i.obrigatoriasPendentes} {i.obrigatoriasPendentes === 1 ? 'providência pendente' : 'providências pendentes'}</Etiqueta>
                              )}
                            </span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>

                <div className="central-detalhe">
                  {id ? (
                    <CasoNaCentral key={id} id={id} aoMudar={() => setVersao((v) => v + 1)} />
                  ) : (
                    <Vazio titulo="Escolha um caso na fila">
                      O caso abre aqui com o resumo, as providências exigidas pelo tipo, os encaminhamentos e a linha do tempo.
                    </Vazio>
                  )}
                </div>
              </div>

              <Agenda versao={versao} />
            </>
          );
        }}
      </EstadoDaCarga>
    </div>
  );
}
