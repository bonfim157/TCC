import { useState } from 'react';
import { Link } from 'react-router-dom';
import { rotas, type OcorrenciaResumo, type Perfil, type PrazoProximo } from '../api/contract';
import { Painel } from '../components/estrutura';
import { Aviso, Etiqueta, EstadoDaCarga, EtiquetaStatus } from '../components/feedback';
import { IconeMais } from '../components/icones';
import { nomePerfil, perfisDeEscola, podeAcessar } from '../state/perfis';
import { useRascunhosLocais } from '../state/rascunhosLocais';
import { useDono } from '../state/useDono';
import { useSessao } from '../state/sessao';
import { useApi } from '../state/useApi';
import { dataHoraCurta, diasAte, diaPorExtenso } from '../util/formato';

const conduzCasos: Perfil[] = ['coordenacao', 'direcao', 'referente_protecao'];

function quandoVence(prazo: string) {
  const d = diasAte(prazo);
  if (d < 0) return { texto: `Venceu há ${-d} ${d === -1 ? 'dia' : 'dias'}`, tipo: 'urgente' as const };
  if (d === 0) return { texto: 'Vence hoje', tipo: 'atencao' as const };
  if (d === 1) return { texto: 'Vence amanhã', tipo: 'atencao' as const };
  return { texto: `Em ${d} dias`, tipo: 'neutra' as const };
}

const CHAVE_TOUR = 'pref.tourVisto';
function lerTourVisto() {
  try { return localStorage.getItem(CHAVE_TOUR) === '1'; } catch { return false; }
}

/** Dica de boas-vindas numa linha: aponta o guia até a pessoa dispensar. */
function ConhecaOSistema() {
  const [visto, setVisto] = useState(lerTourVisto);
  if (visto) return null;
  const dispensar = () => {
    setVisto(true);
    try { localStorage.setItem(CHAVE_TOUR, '1'); } catch { /* vale só nesta visita */ }
  };
  return (
    <section className="boas-vindas" aria-labelledby="t-boas-vindas">
      <p>
        <strong id="t-boas-vindas">Primeira vez por aqui?</strong> O guia mostra em poucos minutos como registrar e
        acompanhar uma ocorrência.
      </p>
      <div className="acoes-linha">
        <Link className="btn btn-secundario" to="/guia" onClick={dispensar}>Ver o guia</Link>
        <button type="button" className="btn btn-texto" onClick={dispensar}>Agora não</button>
      </div>
    </section>
  );
}

/** Tela 3: início. Mostra o que pede ação agora, conforme o perfil. */
export function Inicio() {
  const s = useSessao();
  const dono = useDono();
  const rascunhos = useRascunhosLocais(dono);
  const lista = useApi<OcorrenciaResumo[]>(rotas.ocorrencias, [s.rede?.id, s.escola?.id]);
  const prazos = useApi<PrazoProximo[]>(rotas.prazos, [s.rede?.id, s.escola?.id]);
  if (!s.perfil || !s.rede) return null;

  const perfil = s.perfil;
  const perfilReal = s.vinculo?.perfil ?? perfil;
  const primeiroNome = s.sessao?.usuario.nome.split(' ')[0];
  const hora = new Date().getHours();
  const saudacao = hora < 12 ? 'Bom dia' : hora < 18 ? 'Boa tarde' : 'Boa noite';
  const deEscola = perfisDeEscola.includes(perfil);
  const registra = podeAcessar(perfil, 'registrar');
  // O que a tela mostra segue o perfil exibido; os dados seguem o vínculo real (o servidor decide).
  const conduz = conduzCasos.includes(perfil);

  return (
    <div className="pagina">
      <div className="inicio-cabeca">
        <div className="pagina-cabeca">
          <h1>{saudacao}, {primeiroNome}!</h1>
          <p>
            {nomePerfil[perfil]}
            {deEscola && s.escola ? <>, {s.escola.nome}</> : <>, {s.rede.nome}</>}.
          </p>
        </div>
        {registra && (
          <Link className="btn btn-primario btn-grande" to="/registrar"><IconeMais />Registrar ocorrência</Link>
        )}
      </div>

      <ConhecaOSistema />

      {s.perfilDemo && (
        <Aviso tipo="atencao" titulo="Você está vendo como outro perfil">
          “Ver como” muda os menus e as telas liberadas. Os dados continuam limitados pelo vínculo real de{' '}
          {s.sessao?.usuario.nome} ({nomePerfil[perfilReal].toLowerCase()}), porque quem decide o que cada pessoa vê é o
          servidor, não a tela.
        </Aviso>
      )}

      {registra && rascunhos.length > 0 && (
        <Aviso tipo="info" titulo={rascunhos.length === 1 ? 'Você tem 1 rascunho não enviado' : `Você tem ${rascunhos.length} rascunhos não enviados`}>
          <p>
            <Link to={`/registrar/${rascunhos[0].id}`}>Continuar o último</Link>
            {rascunhos.length > 1 && <> ou <Link to="/meus-registros">ver todos</Link></>}.
          </p>
        </Aviso>
      )}

      <div className="inicio-grade">
        {conduz && (
          <Painel titulo="Situação da escola" acao={podeAcessar(perfil, 'central') ? <Link to="/central">Abrir central de gestão</Link> : undefined}>
            <EstadoDaCarga estado={lista.estado} tentarDeNovo={lista.tentarDeNovo} rotulo="Carregando situação">
              {(dados) => {
                const aguardando = dados.filter((o) => o.status === 'recebido' || o.status === 'em_triagem');
                const urgentes = dados.filter((o) => o.prioridade === 'urgente' && o.status !== 'encerrado');
                const acompanhando = dados.filter((o) => o.status === 'em_acompanhamento');
                return (
                  <>
                    <ul className="contagens">
                      <li className={urgentes.length ? 'contagem contagem-urgente' : 'contagem'}><strong>{urgentes.length}</strong> urgentes</li>
                      <li className="contagem"><strong>{aguardando.length}</strong> aguardando triagem</li>
                      <li className="contagem"><strong>{acompanhando.length}</strong> em acompanhamento</li>
                    </ul>
                    {urgentes.length > 0 && (
                      <ul className="lista-registros">
                        {urgentes.map((o) => (
                          <li key={o.id}>
                            <Link to={`/casos/${o.id}`}>{o.protocolo}</Link> <span>{o.local}, {dataHoraCurta(o.abertaEm)}</span> <EtiquetaStatus status={o.status} />
                          </li>
                        ))}
                      </ul>
                    )}
                  </>
                );
              }}
            </EstadoDaCarga>
          </Painel>
        )}

        {deEscola && (
          <Painel titulo="Prazos próximos">
            <EstadoDaCarga estado={prazos.estado} tentarDeNovo={prazos.tentarDeNovo} rotulo="Carregando prazos">
              {(dados) =>
                dados.length === 0 ? (
                  <p>Nenhuma ação com prazo nos casos que você acompanha.</p>
                ) : (
                  <ul className="lista-prazos">
                    {dados.map((a) => {
                      const v = quandoVence(a.prazo);
                      return (
                        <li key={`${a.ocorrenciaId}-${a.id}`}>
                          <div>
                            <strong>{a.descricao}</strong>
                            <span>
                              <Link to={`/casos/${a.ocorrenciaId}`}>Caso {a.protocolo}</Link>, {a.responsavel.toLowerCase()}, até {diaPorExtenso(a.prazo)}
                            </span>
                          </div>
                          <Etiqueta tipo={v.tipo}>{v.texto}</Etiqueta>
                        </li>
                      );
                    })}
                  </ul>
                )
              }
            </EstadoDaCarga>
          </Painel>
        )}

        {registra && (
          <Painel titulo="Meus registros recentes" acao={<Link to="/meus-registros">Ver todos</Link>}>
            <EstadoDaCarga estado={lista.estado} tentarDeNovo={lista.tentarDeNovo} rotulo="Carregando registros">
              {(dados) => {
                const meus = dados.filter((o) => o.criadoPorId === s.sessao?.usuario.id).slice(0, 3);
                return meus.length === 0 ? (
                  <p>Você ainda não enviou registros nesta escola.</p>
                ) : (
                  <ul className="lista-registros">
                    {meus.map((o) => (
                      <li key={o.id}>
                        <Link to={`/casos/${o.id}`}>{o.protocolo}</Link> <span>{dataHoraCurta(o.abertaEm)}</span> <EtiquetaStatus status={o.status} />
                      </li>
                    ))}
                  </ul>
                );
              }}
            </EstadoDaCarga>
          </Painel>
        )}

        {!deEscola && (
          <Painel titulo="Visão da rede">
            <EstadoDaCarga estado={lista.estado} tentarDeNovo={lista.tentarDeNovo} rotulo="Carregando números">
              {(dados) => (
                <div className="pilha">
                  <p>
                    {dados.length === 0
                      ? 'Nenhum registro no seu alcance.'
                      : `${dados.length} ${dados.length === 1 ? 'registro' : 'registros'} no seu alcance, sem acesso ao conteúdo individual.`}
                  </p>
                  {podeAcessar(perfil, 'relatorios') && <p><Link to="/relatorios">Ver relatórios por período e tipo</Link></p>}
                </div>
              )}
            </EstadoDaCarga>
          </Painel>
        )}
      </div>
    </div>
  );
}
