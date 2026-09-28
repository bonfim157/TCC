import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api, ErroDaApi, FalhaDeRede } from '../api/client';
import { rotas, type Categoria, type Ocorrencia } from '../api/contract';
import { LinhaDoTempo, situacaoPlano } from '../components/caso';
import { Botao, CampoAreaTexto } from '../components/controles';
import { Painel, Tabela } from '../components/estrutura';
import { Aviso, Etiqueta, EtiquetaPrioridade, EtiquetaStatus, EstadoDaCarga, useNotificar } from '../components/feedback';
import { IconeCadeado } from '../components/icones';
import { useConexao } from '../layout/useConexao';
import { useRascunho } from '../state/rascunhos';
import { useSessao } from '../state/sessao';
import { useApi } from '../state/useApi';
import { dataHoraPorExtenso, diaPorExtenso, horaLegivel } from '../util/formato';
import { nomePapel, nomeTipoPessoa } from './registrar/PassoEnvolvidos';

export function FormAdendo({ id, aoRegistrar }: { id: string; aoRegistrar: (o: Ocorrencia) => void }) {
  const [texto, setTexto] = useState('');
  const [erro, setErro] = useState('');
  const [enviando, setEnviando] = useState(false);
  const online = useConexao();
  const notificar = useNotificar();
  useRascunho(texto.trim().length > 0);

  async function enviar() {
    if (texto.trim().length < 10) return setErro('Escreva o que precisa ser acrescentado ou corrigido, com pelo menos 10 caracteres.');
    setEnviando(true);
    setErro('');
    try {
      const o = await api<Ocorrencia>(rotas.adendos(id), { method: 'POST', body: JSON.stringify({ texto }) });
      setTexto('');
      aoRegistrar(o);
      notificar('Adendo registrado na linha do tempo.');
    } catch (e) {
      setErro(e instanceof FalhaDeRede ? 'Sem conexão. O adendo não foi registrado; tente de novo quando a conexão voltar.' : e instanceof ErroDaApi ? e.message : 'Não foi possível registrar o adendo.');
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="pilha">
      <CampoAreaTexto
        rotulo="Acrescentar ou corrigir informação"
        ajuda="O texto original não muda. Seu adendo entra na linha do tempo com seu nome e horário."
        value={texto}
        maxLength={1000}
        rows={4}
        onChange={(e) => setTexto(e.target.value)}
        erro={erro}
      />
      <div><Botao onClick={enviar} carregando={enviando} disabled={!online}>Registrar adendo</Botao></div>
    </div>
  );
}

/** Tela 6: detalhe do caso. O servidor decide o que este perfil pode ver. */
export function Caso() {
  const { id = '' } = useParams();
  const s = useSessao();
  const carga = useApi<Ocorrencia>(rotas.ocorrencia(id), [s.rede?.id]);
  const categorias = useApi<Categoria[]>(rotas.categorias, [s.rede?.id]);
  const [atual, setAtual] = useState<Ocorrencia | null>(null);

  useEffect(() => {
    if (carga.estado.tipo === 'ok') setAtual(carga.estado.dados);
  }, [carga.estado]);

  return (
    <div className="pagina caso">
      <p><Link to="/meus-registros">Voltar para meus registros</Link></p>
      <EstadoDaCarga estado={carga.estado} tentarDeNovo={carga.tentarDeNovo} rotulo="Carregando o caso">
        {() => {
          const o = atual ?? (carga.estado.tipo === 'ok' ? carga.estado.dados : null);
          if (!o) return null;
          const categoria = categorias.estado.tipo === 'ok' ? categorias.estado.dados.find((c) => c.id === o.categoriaId)?.nome : '';
          const f = o.fato;
          return (
            <>
              <header className="caso-cabeca">
                <div className="pilha-curta">
                  <p className="caso-rotulo">Caso</p>
                  <h1>{o.protocolo}</h1>
                  <p className="caso-meta">
                    {categoria}. Registrado por {o.criadoPorNome} em {dataHoraPorExtenso(o.abertaEm)}.
                  </p>
                </div>
                <div className="acoes-linha">
                  <EtiquetaStatus status={o.status} />
                  <EtiquetaPrioridade prioridade={o.prioridade} />
                </div>
              </header>

              <Aviso tipo="info" titulo="Registro confidencial" icone={<IconeCadeado />}>
                Não copie nem compartilhe este conteúdo fora do sistema. Cada acesso fica registrado.
              </Aviso>

              <div className="caso-grade">
                <div className="pilha-larga">
                  <Painel titulo="O fato">
                    <dl className="resumo">
                      <div><dt>Quando</dt><dd>{diaPorExtenso(f.data)}, {horaLegivel(f.hora)}</dd></div>
                      <div><dt>Onde</dt><dd>{f.local}</dd></div>
                      <div><dt>Relato</dt><dd className="texto-relato">{f.relato}</dd></div>
                      {f.providenciaImediata && <div><dt>O que foi feito no momento</dt><dd className="texto-relato">{f.providenciaImediata}</dd></div>}
                      <div><dt>Risco no momento do registro</dt><dd>{f.riscoImediato ? 'Sim' : 'Não'}</dd></div>
                    </dl>
                  </Painel>

                  <Painel titulo="Linha do tempo">
                    <LinhaDoTempo eventos={o.eventos} />
                    <div className="caso-adendo">
                      <FormAdendo id={o.id} aoRegistrar={setAtual} />
                    </div>
                  </Painel>
                </div>

                <div className="pilha-larga">
                  <Painel titulo="Envolvidos">
                    {o.envolvidos.length === 0 ? (
                      <p>Nenhuma pessoa identificada.</p>
                    ) : (
                      <ul className="lista-revisao">
                        {o.envolvidos.map((e) => (
                          <li key={e.pessoaId}>
                            <strong className={e.restrito ? 'restrito' : undefined}>{e.nome}</strong>
                            <span>{e.restrito ? nomePapel[e.papel] : [nomeTipoPessoa[e.tipo], e.turma, nomePapel[e.papel].toLowerCase()].filter(Boolean).join(', ')}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </Painel>

                  <Painel titulo="Plano de apoio">
                    {o.plano.length === 0 ? (
                      <p>Ainda sem ações. A coordenação define o plano depois da triagem.</p>
                    ) : (
                      <Tabela
                        legenda="Ações do plano de apoio"
                        chaveLinha={(a) => a.id}
                        linhas={o.plano}
                        colunas={[
                          { chave: 'd', titulo: 'Ação', celula: (a) => a.descricao },
                          { chave: 'r', titulo: 'Responsável', celula: (a) => a.responsavel },
                          { chave: 'p', titulo: 'Prazo', celula: (a) => diaPorExtenso(a.prazo) },
                          { chave: 's', titulo: 'Situação', celula: (a) => <Etiqueta tipo={situacaoPlano[a.situacao][1]}>{situacaoPlano[a.situacao][0]}</Etiqueta> },
                        ]}
                      />
                    )}
                  </Painel>

                  <Painel titulo="Registro na rede">
                    <p>
                      {o.registroNaRede
                        ? `Lançado no sistema oficial da rede: ${o.registroNaRede}.`
                        : s.rede?.id === 'rede-sp'
                          ? 'Ainda não lançado no Conviva SP. A coordenação faz esse lançamento na triagem.'
                          : 'Ainda não lançado no sistema oficial da rede.'}
                    </p>
                  </Painel>

                  {o.anexos.length > 0 && (
                    <Painel titulo="Anexos">
                      <ul className="lista-revisao">
                        {o.anexos.map((a) => <li key={a.id}><strong>{a.nome}</strong><span>{a.justificativa}</span></li>)}
                      </ul>
                    </Painel>
                  )}
                </div>
              </div>
            </>
          );
        }}
      </EstadoDaCarga>
    </div>
  );
}
