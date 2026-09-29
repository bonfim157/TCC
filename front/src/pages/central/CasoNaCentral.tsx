import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  rotas, type Canal, type Categoria, type ContatosLocais, type Encaminhamento, type ModeloDeComunicacao, type Ocorrencia, type Orgao,
  type PessoaDaEquipe, type Prioridade, type Providencia, type TipoComunicacao,
} from '../../api/contract';
import { LinhaDoTempo, situacaoPlano } from '../../components/caso';
import { Botao, CampoAreaTexto, CampoSelecao, CampoTexto, GrupoOpcoes } from '../../components/controles';
import { Abas, DialogoFormulario, Painel } from '../../components/estrutura';
import { Aviso, Etiqueta, EtiquetaPrioridade, EtiquetaStatus, EstadoDaCarga, useNotificar } from '../../components/feedback';
import { nomePerfil } from '../../state/perfis';
import { useSessao } from '../../state/sessao';
import { useApi } from '../../state/useApi';
import { dataHoraCurta, diaPorExtenso, diasAte, hojeISO, horaLegivel } from '../../util/formato';
import { nomePapel } from '../registrar/PassoEnvolvidos';
import { useAcaoNoCaso } from './useAcaoNoCaso';

type Dialogo =
  | { tipo: 'triagem' }
  | { tipo: 'registro' }
  | { tipo: 'encaminhar' }
  | { tipo: 'devolutiva'; enc: Encaminhamento }
  | { tipo: 'plano' }
  | { tipo: 'comunicar'; para: TipoComunicacao }
  | { tipo: 'providencia'; prov: Providencia; acao: 'feita' | 'dispensada' | 'pendente' }
  | { tipo: 'rede' }
  | { tipo: 'encerrar' }
  | null;

const nomeOrgao: Record<Orgao, string> = {
  conselho_tutelar: 'Conselho Tutelar', policia: 'Polícia', samu: 'SAMU', cras: 'CRAS', creas: 'CREAS', saude: 'Serviço de saúde', outro: 'Outro órgão',
};
const nomeCanal: Record<Canal, string> = { oficio: 'Ofício', telefone: 'Telefone', email: 'E-mail', presencial: 'Presencial', sistema: 'Sistema do órgão' };

const emDias = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

/* ---------- Providências ---------- */
function Providencias({ o, pedir, pode }: { o: Ocorrencia; pedir: (d: Dialogo) => void; pode: boolean }) {
  const pendentes = o.providencias.filter((p) => p.obrigatoria && p.situacao === 'pendente').length;
  return (
    <Painel titulo="Providências" className="providencias">
      <p className="campo-ajuda">
        Sugeridas pelo protocolo da rede para este tipo de caso. O sistema sugere; quem conduz decide.
        {pendentes > 0 && <strong> {pendentes} {pendentes === 1 ? 'obrigatória pendente' : 'obrigatórias pendentes'}.</strong>}
      </p>
      <ul className="lista-providencias">
        {o.providencias.map((p) => (
          <li key={p.id} className={`providencia providencia-${p.situacao}`}>
            <span className="providencia-marca" aria-hidden="true" />
            <div className="providencia-texto">
              <p>
                <strong>{p.descricao}</strong>
                <span className="visualmente-oculto">. Situação: {p.situacao === 'feita' ? 'cumprida' : p.situacao === 'dispensada' ? 'dispensada' : 'pendente'}.</span>
              </p>
              <p className="providencia-base">
                {p.obrigatoria ? 'Obrigatória' : 'Recomendada'}. {p.base}
              </p>
              {p.situacao !== 'pendente' && (
                <p className="providencia-registro">
                  {p.situacao === 'feita' ? 'Cumprida' : 'Dispensada'} por {p.registradaPor}{p.registradaEm ? `, ${dataHoraCurta(p.registradaEm)}` : ''}.
                  {p.observacao ? ` ${p.observacao}` : ''}
                </p>
              )}
              {pode && (
                <div className="acoes-linha">
                  {p.situacao === 'pendente' ? (
                    <>
                      <Botao variante="secundario" onClick={() => pedir({ tipo: 'providencia', prov: p, acao: 'feita' })}>
                        Marcar como cumprida<span className="visualmente-oculto">: {p.descricao}</span>
                      </Botao>
                      <Botao variante="texto" onClick={() => pedir({ tipo: 'providencia', prov: p, acao: 'dispensada' })}>
                        Não se aplica<span className="visualmente-oculto">: {p.descricao}</span>
                      </Botao>
                    </>
                  ) : (
                    <Botao variante="texto" onClick={() => pedir({ tipo: 'providencia', prov: p, acao: 'pendente' })}>
                      Reabrir<span className="visualmente-oculto">: {p.descricao}</span>
                    </Botao>
                  )}
                </div>
              )}
            </div>
          </li>
        ))}
      </ul>
    </Painel>
  );
}

/* ---------- Comunicação a partir de modelo ---------- */
function FormComunicacao({ o, para, modelos, escola, autor, valor, setValor }: {
  o: Ocorrencia;
  para: TipoComunicacao;
  modelos: ModeloDeComunicacao[];
  escola: string;
  autor: string;
  valor: { estudanteId: string; destinatario: string; resumo: string; texto: string };
  setValor: (v: { estudanteId: string; destinatario: string; resumo: string; texto: string }) => void;
}) {
  const estudantes = o.envolvidos.filter((e) => e.tipo === 'estudante' && !e.restrito);
  const modelo = modelos.find((m) => m.tipo === para);
  const estudante = estudantes.find((e) => e.pessoaId === valor.estudanteId);

  // Monta o texto a partir do modelo sempre que estudante ou resumo mudam.
  useEffect(() => {
    if (!modelo) return;
    const [a, m, d] = o.fato.data.split('-').map(Number);
    const texto = modelo.texto
      .replaceAll('{estudante}', estudante?.nome ?? '[estudante]')
      .replaceAll('{escola}', escola)
      .replaceAll('{data}', diaPorExtenso(`${a}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`))
      .replaceAll('{protocolo}', o.protocolo)
      .replaceAll('{resumo}', valor.resumo.trim() || '[resumo do que aconteceu]')
      .replaceAll('{responsavel}', autor);
    if (texto !== valor.texto) setValor({ ...valor, texto });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [valor.estudanteId, valor.resumo, modelo]);

  const outros = o.envolvidos.filter((e) => e.pessoaId !== valor.estudanteId && !e.restrito && e.tipo === 'estudante');
  const vazados = outros.filter((e) => valor.texto.includes(e.nome));

  return (
    <div className="pilha">
      {!modelo && <Aviso tipo="atencao">A rede ainda não cadastrou um modelo para esta comunicação.</Aviso>}
      <CampoSelecao
        rotulo={para === 'familia' ? 'Família de qual estudante' : 'Estudante a que o ofício se refere'}
        value={valor.estudanteId}
        onChange={(e) => {
          const est = estudantes.find((x) => x.pessoaId === e.target.value);
          setValor({ ...valor, estudanteId: e.target.value, destinatario: para === 'familia' ? `Família de ${est?.nome ?? ''}` : valor.destinatario });
        }}
      >
        <option value="" disabled>Escolha</option>
        {estudantes.map((e) => <option key={e.pessoaId} value={e.pessoaId}>{e.nome}{e.turma ? `, ${e.turma}` : ''}</option>)}
      </CampoSelecao>
      <CampoTexto rotulo="Destinatário" value={valor.destinatario} onChange={(e) => setValor({ ...valor, destinatario: e.target.value })} />
      <CampoAreaTexto
        rotulo="Resumo do que aconteceu"
        ajuda={para === 'familia' ? 'Escreva só o que diz respeito a este estudante. Não cite outros estudantes nem detalhes que a família não precisa saber.' : 'Descreva os fatos observados que motivam a comunicação.'}
        value={valor.resumo}
        rows={3}
        maxLength={800}
        onChange={(e) => setValor({ ...valor, resumo: e.target.value })}
      />
      <CampoAreaTexto
        rotulo={para === 'familia' ? 'Texto que a família vai receber' : 'Texto do ofício'}
        ajuda="Gerado pelo modelo aprovado da rede. Você pode ajustar antes de enviar."
        value={valor.texto}
        rows={10}
        onChange={(e) => setValor({ ...valor, texto: e.target.value })}
      />
      {vazados.length > 0 && (
        <Aviso tipo="erro" titulo="O texto cita outro estudante">
          Retire {vazados.map((v) => v.nome).join(' e ')} antes de enviar. Cada família só recebe o que diz respeito ao próprio filho ou filha.
        </Aviso>
      )}
    </div>
  );
}

/* ---------- Caso na Central ---------- */
export function CasoNaCentral({ id, externo = 0, aoMudar }: { id: string; externo?: number; aoMudar: () => void }) {
  const s = useSessao();
  const notificar = useNotificar();
  // Recarrega quando outra pessoa altera o caso, sem fechar diálogos abertos.
  const carga = useApi<Ocorrencia>(rotas.ocorrencia(id), [s.rede?.id, externo], { manterAoAtualizar: true });
  const categorias = useApi<Categoria[]>(rotas.categorias, [s.rede?.id]);
  const equipe = useApi<PessoaDaEquipe[]>(rotas.equipe, [s.escola?.id]);
  const modelos = useApi<ModeloDeComunicacao[]>(rotas.modelos, [s.rede?.id]);
  const contatosCarga = useApi<ContatosLocais>(rotas.admin.contatos, [s.escola?.id]);
  const contatos = contatosCarga.estado.tipo === 'ok' ? contatosCarga.estado.dados : null;
  // Nome da unidade local para cada órgão, vindo dos contatos da escola (Administração).
  const unidadeLocal = (o: Orgao) =>
    ({ conselho_tutelar: contatos?.conselhoTutelar, cras: contatos?.cras, creas: contatos?.creas, policia: contatos?.delegacia, saude: contatos?.saude, samu: 'SAMU 192', outro: '' } as Record<Orgao, string | undefined>)[o] || nomeOrgao[o];
  const [o, setO] = useState<Ocorrencia | null>(null);
  const [dialogo, setDialogo] = useState<Dialogo>(null);
  const [form, setForm] = useState<Record<string, string>>({});
  const [comunicacao, setComunicacao] = useState({ estudanteId: '', destinatario: '', resumo: '', texto: '' });

  useEffect(() => {
    if (carga.estado.tipo === 'ok') setO(carga.estado.dados);
  }, [carga.estado]);

  const atualizado = useCallback((novo: Ocorrencia) => {
    setO(novo);
    aoMudar();
  }, [aoMudar]);
  const acao = useAcaoNoCaso(atualizado);

  const cats = categorias.estado.tipo === 'ok' ? categorias.estado.dados : [];
  const pessoas = equipe.estado.tipo === 'ok' ? equipe.estado.dados : [];
  const listaModelos = modelos.estado.tipo === 'ok' ? modelos.estado.dados : [];
  const campo = (k: string) => form[k] ?? '';
  const muda = (k: string) => (e: { target: { value: string } }) => setForm((f) => ({ ...f, [k]: e.target.value }));

  function abrir(d: Dialogo) {
    acao.limparErro();
    if (!o || !d) return setDialogo(d);
    if (d.tipo === 'triagem') setForm({ categoriaId: o.categoriaId, prioridade: o.prioridade, responsavelId: o.responsavelId ?? '', observacao: '' });
    else if (d.tipo === 'encaminhar') setForm({ orgao: 'conselho_tutelar', orgaoNome: unidadeLocal('conselho_tutelar'), canal: 'oficio', protocoloExterno: '', devolutivaAte: emDias(10) });
    else if (d.tipo === 'registro') setForm({ tipo: 'escuta', texto: '' });
    else if (d.tipo === 'plano') setForm({ descricao: '', responsavel: '', prazo: emDias(7) });
    else if (d.tipo === 'encerrar') setForm({ justificativa: '', reavaliarEm: '' });
    else setForm({});
    if (d.tipo === 'comunicar') {
      const primeiro = o.envolvidos.find((e) => e.tipo === 'estudante' && !e.restrito);
      setComunicacao({
        estudanteId: primeiro?.pessoaId ?? '',
        destinatario: d.para === 'familia' ? `Família de ${primeiro?.nome ?? ''}` : unidadeLocal('conselho_tutelar'),
        resumo: '',
        texto: '',
      });
    }
    setDialogo(d);
  }

  async function enviar() {
    if (!o || !dialogo) return;
    const c = (a: string) => rotas.acao(o.id, a);
    let ok = false;
    let aviso = '';
    switch (dialogo.tipo) {
      case 'triagem':
        ok = await acao.executar(c('triagem'), { categoriaId: campo('categoriaId'), prioridade: campo('prioridade') as Prioridade, responsavelId: campo('responsavelId'), observacao: campo('observacao') });
        aviso = 'Triagem concluída. O caso está em acompanhamento.';
        break;
      case 'registro':
        ok = await acao.executar(c('registros'), { tipo: campo('tipo'), texto: campo('texto') });
        aviso = campo('tipo') === 'escuta' ? 'Escuta registrada.' : 'Reavaliação registrada.';
        break;
      case 'encaminhar':
        ok = await acao.executar(c('encaminhamentos'), { orgao: campo('orgao'), orgaoNome: campo('orgaoNome'), canal: campo('canal'), protocoloExterno: campo('protocoloExterno'), devolutivaAte: campo('devolutivaAte') });
        aviso = 'Encaminhamento registrado. A devolutiva entrou na agenda.';
        break;
      case 'devolutiva':
        ok = await acao.executar(c(`encaminhamentos/${dialogo.enc.id}/devolutiva`), { texto: campo('texto') });
        aviso = 'Devolutiva registrada.';
        break;
      case 'plano':
        ok = await acao.executar(c('plano'), { descricao: campo('descricao'), responsavel: campo('responsavel'), prazo: campo('prazo') });
        aviso = 'Ação incluída no plano de apoio.';
        break;
      case 'comunicar': {
        const outros = o.envolvidos.filter((e) => e.pessoaId !== comunicacao.estudanteId && !e.restrito && e.tipo === 'estudante');
        if (outros.some((e) => comunicacao.texto.includes(e.nome))) return;
        ok = await acao.executar(c('comunicacoes'), { tipo: dialogo.para, destinatario: comunicacao.destinatario, texto: comunicacao.texto, estudanteId: comunicacao.estudanteId || undefined });
        aviso = dialogo.para === 'familia' ? 'Comunicação enviada. A ciência da família aparece no caso quando ela confirmar.' : 'Ofício registrado. A devolutiva do Conselho Tutelar entrou na agenda.';
        break;
      }
      case 'providencia':
        ok = await acao.executar(c(`providencias/${dialogo.prov.id}`), { situacao: dialogo.acao, observacao: campo('observacao') });
        aviso = dialogo.acao === 'feita' ? 'Providência cumprida.' : dialogo.acao === 'dispensada' ? 'Providência dispensada, com justificativa.' : 'Providência reaberta.';
        break;
      case 'rede':
        ok = await acao.executar(c('registro-rede'), { codigo: campo('codigo') });
        aviso = 'Código do sistema da rede registrado.';
        break;
      case 'encerrar':
        ok = await acao.executar(c('encerrar'), { justificativa: campo('justificativa'), reavaliarEm: campo('reavaliarEm') || null });
        aviso = 'Caso encerrado. O histórico continua disponível.';
        break;
    }
    if (ok) {
      setDialogo(null);
      notificar(aviso);
    }
  }

  if (carga.estado.tipo !== 'ok' || !o) {
    return <EstadoDaCarga estado={carga.estado} tentarDeNovo={carga.tentarDeNovo} rotulo="Carregando o caso">{() => null}</EstadoDaCarga>;
  }

  const podeEncerrar = s.perfil === 'coordenacao' || s.perfil === 'direcao';
  const encerrado = o.status === 'encerrado';
  const emTriagem = o.status === 'recebido' || o.status === 'em_triagem';
  const temCt = o.providencias.some((p) => p.id.endsWith('-ct'));
  const pendentesObrig = o.providencias.filter((p) => p.obrigatoria && p.situacao === 'pendente');
  const nomeCategoria = cats.find((x) => x.id === o.categoriaId)?.nome ?? '';
  const redeSP = o.redeId === 'rede-sp';

  const tituloDialogo: Record<NonNullable<Dialogo>['tipo'], string> = {
    triagem: 'Concluir triagem', registro: 'Registrar escuta ou reavaliação', encaminhar: 'Encaminhar a outro órgão', devolutiva: 'Registrar devolutiva',
    plano: 'Incluir ação no plano de apoio', comunicar: dialogo?.tipo === 'comunicar' && dialogo.para === 'conselho_tutelar' ? 'Ofício ao Conselho Tutelar' : 'Comunicar a família',
    providencia: dialogo?.tipo === 'providencia' ? (dialogo.acao === 'feita' ? 'Marcar providência como cumprida' : dialogo.acao === 'dispensada' ? 'Providência que não se aplica' : 'Reabrir providência') : '',
    rede: redeSP ? 'Código do Conviva SP' : 'Código no sistema da rede', encerrar: 'Encerrar caso',
  };
  const enviarRotulo: Record<NonNullable<Dialogo>['tipo'], string> = {
    triagem: 'Concluir triagem', registro: 'Registrar', encaminhar: 'Registrar encaminhamento', devolutiva: 'Registrar devolutiva', plano: 'Incluir ação',
    comunicar: dialogo?.tipo === 'comunicar' && dialogo.para === 'conselho_tutelar' ? 'Registrar envio do ofício' : 'Enviar à família',
    providencia: dialogo?.tipo === 'providencia' ? (dialogo.acao === 'feita' ? 'Marcar como cumprida' : dialogo.acao === 'dispensada' ? 'Dispensar com justificativa' : 'Reabrir') : '',
    rede: 'Registrar código', encerrar: 'Encerrar caso',
  };

  return (
    <article className="caso-central" aria-labelledby="t-caso">
      <header className="caso-central-cabeca">
        <p className="central-voltar"><Link to="/central">Voltar para a fila</Link></p>
        <div className="caso-central-titulo">
          <div>
            <h2 id="t-caso">Caso {o.protocolo}</h2>
            <p className="caso-meta">
              {nomeCategoria}. {o.local}, {diaPorExtenso(o.fato.data)}, {horaLegivel(o.fato.hora)}. Registrado por {o.criadoPorNome}.
            </p>
          </div>
          <div className="acoes-linha">
            <EtiquetaStatus status={o.status} />
            <EtiquetaPrioridade prioridade={o.prioridade} />
          </div>
        </div>
        <p className="caso-meta">
          {o.responsavelNome ? <>Conduzido por <strong>{o.responsavelNome}</strong>.</> : <strong>Sem responsável definido.</strong>}{' '}
          <Link to={`/casos/${o.id}`}>Abrir página completa do caso</Link>
        </p>

        {encerrado && o.encerramento ? (
          <Aviso tipo="sucesso" titulo={`Encerrado em ${dataHoraCurta(o.encerramento.em)} por ${o.encerramento.por}`}>
            <p>{o.encerramento.justificativa}</p>
            {o.encerramento.reavaliarEm && <p>Reavaliação marcada para {diaPorExtenso(o.encerramento.reavaliarEm)}.</p>}
          </Aviso>
        ) : (
          <div className="barra-acoes" role="group" aria-label="Ações do caso">
            {emTriagem && <Botao onClick={() => abrir({ tipo: 'triagem' })}>Concluir triagem</Botao>}
            <Botao variante="secundario" onClick={() => abrir({ tipo: 'registro' })}>Registrar escuta</Botao>
            <Botao variante="secundario" onClick={() => abrir({ tipo: 'comunicar', para: 'familia' })}>Comunicar família</Botao>
            {temCt && <Botao variante="secundario" onClick={() => abrir({ tipo: 'comunicar', para: 'conselho_tutelar' })}>Ofício ao Conselho Tutelar</Botao>}
            <Botao variante="secundario" onClick={() => abrir({ tipo: 'encaminhar' })}>Encaminhar</Botao>
            <Botao variante="secundario" onClick={() => abrir({ tipo: 'plano' })}>Incluir no plano</Botao>
            {podeEncerrar && <Botao variante="texto" onClick={() => abrir({ tipo: 'encerrar' })}>Encerrar caso</Botao>}
          </div>
        )}
      </header>

      <div className="caso-central-grade">
        <div className="caso-central-principal">
          <Abas
            rotulo="Informações do caso"
            abas={[
              {
                id: 'resumo',
                titulo: 'Resumo',
                conteudo: (
                  <div className="pilha">
                    <p className="texto-relato">{o.fato.relato}</p>
                    {o.fato.providenciaImediata && <p><strong>Feito no momento:</strong> {o.fato.providenciaImediata}</p>}
                    {o.fato.riscoImediato && <Aviso tipo="erro" titulo="Registrado com risco imediato">Confira se a emergência foi acionada e registrada nas providências.</Aviso>}
                    <h3 className="titulo-bloco">Envolvidos</h3>
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
                      const sit = a.situacao !== 'concluida' && a.prazo < hojeISO() ? 'atrasada' : a.situacao;
                      return (
                        <li key={a.id}>
                          <div>
                            <strong>{a.descricao}</strong>
                            <span>{a.responsavel}, até {diaPorExtenso(a.prazo)}</span>
                          </div>
                          <div className="acoes-linha">
                            <Etiqueta tipo={situacaoPlano[sit][1]}>{situacaoPlano[sit][0]}</Etiqueta>
                            {sit !== 'concluida' && !encerrado && (
                              <Botao variante="texto" onClick={() => acao.executar(rotas.acao(o.id, `plano/${a.id}/concluir`), {}).then((ok) => ok && notificar('Ação concluída.'))}>
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
        </div>

        <aside className="caso-central-lado" aria-label="Providências e registro na rede">
          <Providencias o={o} pedir={abrir} pode={!encerrado} />
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
        </aside>
      </div>

      {dialogo && (
        <DialogoFormulario
          aberto
          largo={dialogo.tipo === 'comunicar'}
          titulo={tituloDialogo[dialogo.tipo]}
          enviar={enviarRotulo[dialogo.tipo]}
          carregando={acao.carregando}
          erro={acao.erro}
          perigoso={dialogo.tipo === 'encerrar'}
          aoCancelar={() => setDialogo(null)}
          aoEnviar={enviar}
        >
          {dialogo.tipo === 'triagem' && (
            <>
              <CampoSelecao rotulo="Tipo de ocorrência" ajuda="Corrija se o registro veio com o tipo errado. As providências se ajustam." value={campo('categoriaId')} onChange={muda('categoriaId')}>
                {cats.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
              </CampoSelecao>
              <GrupoOpcoes
                rotulo="Prioridade"
                opcoes={[{ valor: 'urgente', rotulo: 'Urgente' }, { valor: 'alta', rotulo: 'Alta' }, { valor: 'media', rotulo: 'Média' }, { valor: 'baixa', rotulo: 'Baixa' }]}
                valor={campo('prioridade')}
                aoMudar={(v) => setForm((f) => ({ ...f, prioridade: v }))}
              />
              <CampoSelecao rotulo="Quem vai conduzir o caso" value={campo('responsavelId')} onChange={muda('responsavelId')}>
                <option value="" disabled>Escolha</option>
                {pessoas.map((p) => <option key={p.id} value={p.id}>{p.nome}, {nomePerfil[p.perfil].toLowerCase()}</option>)}
              </CampoSelecao>
              <CampoAreaTexto rotulo="Observação da triagem" opcional rows={3} maxLength={500} value={campo('observacao')} onChange={muda('observacao')} />
            </>
          )}

          {dialogo.tipo === 'registro' && (
            <>
              <GrupoOpcoes
                rotulo="O que você está registrando"
                opcoes={[{ valor: 'escuta', rotulo: 'Escuta com envolvidos' }, { valor: 'reavaliacao', rotulo: 'Reavaliação do caso' }]}
                valor={campo('tipo')}
                aoMudar={(v) => setForm((f) => ({ ...f, tipo: v }))}
              />
              <CampoAreaTexto
                rotulo="Registro"
                ajuda="Registre o que foi feito e combinado. Na escuta, não transcreva perguntas nem detalhes íntimos: isso cabe à rede de proteção."
                rows={5}
                maxLength={1500}
                value={campo('texto')}
                onChange={muda('texto')}
              />
            </>
          )}

          {dialogo.tipo === 'encaminhar' && (
            <>
              <CampoSelecao
                rotulo="Para qual órgão"
                value={campo('orgao')}
                onChange={(e) => setForm((f) => ({ ...f, orgao: e.target.value, orgaoNome: unidadeLocal(e.target.value as Orgao) }))}
              >
                {(Object.keys(nomeOrgao) as Orgao[]).map((k) => <option key={k} value={k}>{nomeOrgao[k]}</option>)}
              </CampoSelecao>
              <CampoTexto rotulo="Nome da unidade" ajuda="Ex.: Conselho Tutelar de Limeira, CRAS Ouro Verde." value={campo('orgaoNome')} onChange={muda('orgaoNome')} />
              <div className="grade-2">
                <CampoSelecao rotulo="Como foi enviado" value={campo('canal')} onChange={muda('canal')}>
                  {(Object.keys(nomeCanal) as Canal[]).map((k) => <option key={k} value={k}>{nomeCanal[k]}</option>)}
                </CampoSelecao>
                <CampoTexto rotulo="Número de protocolo do órgão" opcional value={campo('protocoloExterno')} onChange={muda('protocoloExterno')} />
              </div>
              <CampoTexto rotulo="Esperar devolutiva até" type="date" min={hojeISO()} value={campo('devolutivaAte')} onChange={muda('devolutivaAte')} />
            </>
          )}

          {dialogo.tipo === 'devolutiva' && (
            <CampoAreaTexto rotulo={`O que ${dialogo.enc.orgaoNome} informou`} rows={5} maxLength={1500} value={campo('texto')} onChange={muda('texto')} />
          )}

          {dialogo.tipo === 'plano' && (
            <>
              <CampoTexto rotulo="Ação" ajuda="Ex.: mediação entre os estudantes, conversa com a família." value={campo('descricao')} onChange={muda('descricao')} />
              <div className="grade-2">
                <CampoTexto rotulo="Responsável" value={campo('responsavel')} onChange={muda('responsavel')} list="responsaveis-plano" />
                <CampoTexto rotulo="Prazo" type="date" value={campo('prazo')} onChange={muda('prazo')} />
              </div>
              <datalist id="responsaveis-plano">
                {['Coordenação', 'Direção', 'Orientação de convivência', 'Professor(a) da turma', ...pessoas.map((p) => p.nome)].map((n) => <option key={n} value={n} />)}
              </datalist>
            </>
          )}

          {dialogo.tipo === 'comunicar' && (
            <FormComunicacao
              o={o}
              para={dialogo.para}
              modelos={listaModelos}
              escola={s.escola?.nome ?? ''}
              autor={`${s.sessao?.usuario.nome}, ${s.perfil ? nomePerfil[s.perfil].toLowerCase() : ''}`}
              valor={comunicacao}
              setValor={setComunicacao}
            />
          )}

          {dialogo.tipo === 'providencia' && (
            <>
              <p><strong>{dialogo.prov.descricao}</strong></p>
              <p className="campo-ajuda">{dialogo.prov.obrigatoria ? 'Obrigatória' : 'Recomendada'}. {dialogo.prov.base}</p>
              {dialogo.acao !== 'pendente' && (
                <CampoAreaTexto
                  rotulo={dialogo.acao === 'feita' ? 'O que foi feito' : 'Por que não se aplica a este caso'}
                  opcional={dialogo.acao === 'feita'}
                  ajuda={dialogo.acao === 'dispensada' && dialogo.prov.obrigatoria ? 'Esta providência é obrigatória. A justificativa fica registrada no histórico do caso.' : undefined}
                  rows={3}
                  maxLength={600}
                  value={campo('observacao')}
                  onChange={muda('observacao')}
                />
              )}
            </>
          )}

          {dialogo.tipo === 'rede' && (
            <CampoTexto
              rotulo={redeSP ? 'Código do registro no Conviva SP' : 'Código no sistema da rede'}
              ajuda="Copie o número que o sistema oficial mostrou ao salvar o registro."
              value={campo('codigo')}
              onChange={muda('codigo')}
            />
          )}

          {dialogo.tipo === 'encerrar' && (
            <>
              {pendentesObrig.length > 0 && (
                <Aviso tipo="atencao" titulo={`${pendentesObrig.length} ${pendentesObrig.length === 1 ? 'providência obrigatória pendente' : 'providências obrigatórias pendentes'}`}>
                  <ul className="lista-compacta">{pendentesObrig.map((p) => <li key={p.id}>{p.descricao}</li>)}</ul>
                  <p>Cumpra ou marque “não se aplica” com justificativa antes de encerrar.</p>
                </Aviso>
              )}
              <CampoAreaTexto rotulo="Resultado e motivo do encerramento" rows={4} maxLength={1000} value={campo('justificativa')} onChange={muda('justificativa')} />
              <CampoTexto rotulo="Reavaliar em" opcional type="date" min={hojeISO()} ajuda="A data entra na agenda da Central." value={campo('reavaliarEm')} onChange={muda('reavaliarEm')} />
            </>
          )}
        </DialogoFormulario>
      )}
    </article>
  );
}

