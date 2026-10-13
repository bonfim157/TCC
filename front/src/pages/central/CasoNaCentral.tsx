import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  acaoEmAberto, rotas, type Canal, type Categoria, type ContatosLocais, type ModeloDeComunicacao, type Ocorrencia, type Orgao,
  type PessoaDaEquipe, type Prioridade,
} from '../../api/contract';
import { CaixaMarcar, CampoAreaTexto, CampoSelecao, CampoTexto, GrupoOpcoes } from '../../components/controles';
import { DialogoFormulario } from '../../components/estrutura';
import { Aviso, EtiquetaPrioridade, EtiquetaStatus, EstadoDaCarga, useNotificar } from '../../components/feedback';
import { nomePerfil } from '../../state/perfis';
import { useSessao } from '../../state/sessao';
import { useApi } from '../../state/useApi';
import { diaPorExtenso, hojeISO, horaLegivel } from '../../util/formato';
import { AbasDoCaso } from './AbasDoCaso';
import { AcoesDoCaso } from './AcoesDoCaso';
import { FormComunicacao } from './FormComunicacao';
import { PainelDaRede } from './PainelDaRede';
import { Providencias } from './Providencias';
import { nomeCanal, nomeOrgao, type Dialogo } from './tipos';
import { useAcaoNoCaso } from './useAcaoNoCaso';

const emDias = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

/** Caso aberto dentro da Central: cabeçalho, ações, abas, providências e os diálogos de cada ação. */
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
        ok = await acao.executar(c('encerrar'), { justificativa: campo('justificativa'), reavaliarEm: campo('reavaliarEm') || null, cancelarAcoesAbertas: campo('cancelarAcoes') === 'sim' });
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
  const acoesAbertas = o.plano.filter(acaoEmAberto);
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

        <AcoesDoCaso o={o} encerrado={encerrado} emTriagem={emTriagem} temCt={temCt} podeEncerrar={podeEncerrar} abrir={abrir} />
      </header>

      <div className="caso-central-grade">
        <div className="caso-central-principal">
          <AbasDoCaso o={o} encerrado={encerrado} abrir={abrir} executar={acao.executar} />
        </div>

        <aside className="caso-central-lado" aria-label="Providências e registro na rede">
          <Providencias o={o} pedir={abrir} pode={!encerrado} />
          <PainelDaRede o={o} redeSP={redeSP} encerrado={encerrado} abrir={abrir} />
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
              {acoesAbertas.length > 0 && (
                <Aviso tipo="atencao" titulo={`${acoesAbertas.length} ${acoesAbertas.length === 1 ? 'ação do plano de apoio ainda em aberto' : 'ações do plano de apoio ainda em aberto'}`}>
                  <ul className="lista-compacta">{acoesAbertas.map((a) => <li key={a.id}>{a.descricao} ({a.responsavel})</li>)}</ul>
                  <p>Depois de encerrado, o caso não aceita mais ações. Conclua o que foi feito ou confirme o cancelamento; ele fica registrado na linha do tempo.</p>
                  <CaixaMarcar
                    rotulo={acoesAbertas.length === 1 ? 'Cancelar esta ação ao encerrar' : `Cancelar estas ${acoesAbertas.length} ações ao encerrar`}
                    checked={campo('cancelarAcoes') === 'sim'}
                    onChange={(e) => setForm((f) => ({ ...f, cancelarAcoes: e.target.checked ? 'sim' : '' }))}
                  />
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

