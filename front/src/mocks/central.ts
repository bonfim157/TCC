import { delay, http } from 'msw';
import type {
  CienciaPublica, Encaminhamento, ItemDaAgenda, ItemDaFila, Ocorrencia, PedidoAcaoPlano, PedidoComunicacao,
  PedidoDevolutiva, PedidoEncaminhamento, PedidoEncerramento, PedidoProvidencia, PedidoRegistroEscola,
  PedidoRegistroRede, PedidoTriagem, PessoaDaEquipe,
} from '../api/contract';
import {
  auditar, casoParaAgir, conduz, recarregar, conduzCasos, contexto, erro, hojeISO, json, novoEvento, paraQuemConsulta, persistir, podeAbrir, resumo,
} from './base';
import { gerarProvidencias, modelos } from './protocolo';
import { categorias, escolas, ocorrencias, redes, usuarios } from './seed';

/* API da Central de Gestão (F3). Só quem conduz casos na escola usa estas rotas. */

const nomeOrgao = { conselho_tutelar: 'Conselho Tutelar', policia: 'Polícia', samu: 'SAMU', cras: 'CRAS', creas: 'CREAS', saude: 'Serviço de saúde', outro: 'Outro órgão' };

/** Marca providências cujo id termina com a chave, quando a própria ação já as cumpre. */
function cumprir(o: Ocorrencia, chave: string, por: string, observacao: string) {
  o.providencias = o.providencias.map((p) =>
    p.id.endsWith(`-${chave}`) && p.situacao === 'pendente'
      ? { ...p, situacao: 'feita', registradaPor: por, registradaEm: new Date().toISOString(), observacao }
      : p,
  );
}

function itemDaFila(o: Ocorrencia): ItemDaFila {
  const hoje = hojeISO();
  const prazos = [
    ...o.plano.filter((a) => a.situacao !== 'concluida').map((a) => a.prazo),
    ...o.encaminhamentos.filter((e) => !e.devolutiva).map((e) => e.devolutivaAte),
    ...(o.encerramento?.reavaliarEm ? [o.encerramento.reavaliarEm] : []),
  ].sort();
  return {
    ...resumo(o),
    responsavelNome: o.responsavelNome,
    obrigatoriasPendentes: o.providencias.filter((p) => p.obrigatoria && p.situacao === 'pendente').length,
    ctPendente: o.providencias.some((p) => p.id.endsWith('-ct') && p.situacao === 'pendente'),
    devolutivasAtrasadas: o.encaminhamentos.filter((e) => !e.devolutiva && e.devolutivaAte < hoje).length,
    proximoPrazo: prazos[0] ?? null,
  };
}

const salvar = (o: Ocorrencia, ctx: Parameters<typeof paraQuemConsulta>[0], status = 200) => {
  persistir();
  auditar(ctx, 'alteracao', `caso ${o.protocolo}`, 'permitido', o.eventos.at(-1)?.tipo);
  return json(paraQuemConsulta(ctx, o), status);
};

const somaDias = (dias: number) => {
  const d = new Date();
  d.setDate(d.getDate() + dias);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export const handlersCentral = [
  http.get('/api/central/fila', async ({ request }) => {
    await delay(300);
    const ctx = contexto(request);
    if (ctx instanceof Response) return ctx;
    if (!conduz(ctx)) return erro(403, 'sem_permissao', 'A Central de Gestão é para quem conduz casos na escola.');
    const lista = ocorrencias.filter((o) => o.escolaId === ctx.escolaId && podeAbrir(ctx, o)).map(itemDaFila);
    return json(lista);
  }),

  http.get('/api/central/agenda', async ({ request }) => {
    await delay(250);
    const ctx = contexto(request);
    if (ctx instanceof Response) return ctx;
    if (!conduz(ctx)) return erro(403, 'sem_permissao', 'A agenda é para quem conduz casos na escola.');
    const itens: ItemDaAgenda[] = ocorrencias
      .filter((o) => o.escolaId === ctx.escolaId && podeAbrir(ctx, o))
      // Caso encerrado só entra na agenda pela data de reavaliação.
      .flatMap((o) => o.status === 'encerrado' ? (o.encerramento?.reavaliarEm ? [{ data: o.encerramento.reavaliarEm, tipo: 'reavaliacao' as const, descricao: 'Reavaliar caso encerrado', ocorrenciaId: o.id, protocolo: o.protocolo }] : []) : [
        ...o.plano.filter((a) => a.situacao !== 'concluida').map((a) => ({ data: a.prazo, tipo: 'prazo_plano' as const, descricao: a.descricao, ocorrenciaId: o.id, protocolo: o.protocolo })),
        ...o.encaminhamentos.filter((e) => !e.devolutiva).map((e) => ({ data: e.devolutivaAte, tipo: 'devolutiva' as const, descricao: `Devolutiva de ${e.orgaoNome}`, ocorrenciaId: o.id, protocolo: o.protocolo })),
        ...(o.encerramento?.reavaliarEm ? [{ data: o.encerramento.reavaliarEm, tipo: 'reavaliacao' as const, descricao: 'Reavaliar caso encerrado', ocorrenciaId: o.id, protocolo: o.protocolo }] : []),
      ])
      .sort((a, b) => a.data.localeCompare(b.data));
    return json(itens);
  }),

  http.get('/api/equipe', async ({ request }) => {
    await delay(150);
    const ctx = contexto(request);
    if (ctx instanceof Response) return ctx;
    const equipe: PessoaDaEquipe[] = usuarios.flatMap((u) =>
      u.vinculos
        .filter((v) => v.redeId === ctx.vinculo.redeId && conduzCasos.includes(v.perfil) && (!ctx.escolaId || v.escolaIds.includes(ctx.escolaId)))
        .map((v) => ({ id: u.id, nome: u.nome, perfil: v.perfil })),
    );
    return json(equipe);
  }),

  http.get('/api/modelos', async ({ request }) => {
    await delay(150);
    const ctx = contexto(request);
    if (ctx instanceof Response) return ctx;
    return json(modelos.filter((m) => m.redeId === ctx.vinculo.redeId));
  }),

  http.post('/api/ocorrencias/:id/triagem', async ({ request, params }) => {
    await delay(400);
    const r = casoParaAgir(request, String(params.id));
    if (r instanceof Response) return r;
    const { ctx, o } = r;
    const p = (await request.json()) as PedidoTriagem;
    const resp = usuarios.find((u) => u.id === p.responsavelId);
    if (!resp) return erro(422, 'validacao', 'Escolha quem vai conduzir o caso.');
    if (!categorias.some((c) => c.id === p.categoriaId && c.redeId === o.redeId)) return erro(422, 'validacao', 'Tipo de ocorrência inválido.');
    if (p.categoriaId !== o.categoriaId) {
      // Nova categoria: novas providências, mantendo o que já foi feito.
      const feitas = o.providencias.filter((x) => x.situacao !== 'pendente');
      const novas = gerarProvidencias(o.redeId, p.categoriaId, o.fato.riscoImediato).filter((n) => !feitas.some((f) => f.id === n.id));
      o.providencias = [...feitas, ...novas];
      o.categoriaId = p.categoriaId;
    }
    o.prioridade = p.prioridade;
    o.responsavelId = resp.id;
    o.responsavelNome = resp.nome;
    o.status = 'em_acompanhamento';
    o.eventos.push(novoEvento(ctx, 'triagem', `Triagem concluída. Responsável: ${resp.nome}.${p.observacao.trim() ? ` ${p.observacao.trim()}` : ''}`));
    return salvar(o, ctx);
  }),

  http.post('/api/ocorrencias/:id/providencias/:pid', async ({ request, params }) => {
    await delay(300);
    const r = casoParaAgir(request, String(params.id));
    if (r instanceof Response) return r;
    const { ctx, o } = r;
    const p = (await request.json()) as PedidoProvidencia;
    const prov = o.providencias.find((x) => x.id === params.pid);
    if (!prov) return erro(404, 'nao_encontrado', 'Providência não encontrada.');
    if (p.situacao === 'dispensada' && p.observacao.trim().length < 15) {
      return erro(422, 'validacao', 'Explique por que esta providência não se aplica (pelo menos 15 caracteres).');
    }
    Object.assign(prov, {
      situacao: p.situacao,
      observacao: p.observacao.trim() || undefined,
      registradaPor: p.situacao === 'pendente' ? undefined : ctx.usuario.nome,
      registradaEm: p.situacao === 'pendente' ? undefined : new Date().toISOString(),
    });
    const verbo = p.situacao === 'feita' ? 'Providência cumprida' : p.situacao === 'dispensada' ? 'Providência dispensada' : 'Providência reaberta';
    o.eventos.push(novoEvento(ctx, 'providencia', `${verbo}: ${prov.descricao.toLowerCase()}.${p.observacao.trim() ? ` ${p.observacao.trim()}` : ''}`));
    return salvar(o, ctx);
  }),

  http.post('/api/ocorrencias/:id/encaminhamentos', async ({ request, params }) => {
    await delay(400);
    const r = casoParaAgir(request, String(params.id));
    if (r instanceof Response) return r;
    const { ctx, o } = r;
    const p = (await request.json()) as PedidoEncaminhamento;
    if (!p.devolutivaAte) return erro(422, 'validacao', 'Informe até quando a escola espera uma devolutiva.');
    const enc: Encaminhamento = {
      id: `enc-${Date.now()}`, ...p, orgaoNome: p.orgaoNome.trim() || nomeOrgao[p.orgao],
      em: new Date().toISOString(), devolutiva: null, registradoPor: ctx.usuario.nome,
    };
    o.encaminhamentos.push(enc);
    if (p.orgao === 'conselho_tutelar') cumprir(o, 'ct', ctx.usuario.nome, `Encaminhado a ${enc.orgaoNome}${p.protocoloExterno ? `, ${p.protocoloExterno}` : ''}.`);
    if (['samu', 'policia'].includes(p.orgao)) cumprir(o, 'emergencia', ctx.usuario.nome, `Acionado: ${enc.orgaoNome}.`);
    o.eventos.push(novoEvento(ctx, 'encaminhamento', `Encaminhado a ${enc.orgaoNome}${p.protocoloExterno ? ` (${p.protocoloExterno})` : ''}. Devolutiva esperada até ${p.devolutivaAte.split('-').reverse().join('/')}.`));
    return salvar(o, ctx, 201);
  }),

  http.post('/api/ocorrencias/:id/encaminhamentos/:eid/devolutiva', async ({ request, params }) => {
    await delay(300);
    const r = casoParaAgir(request, String(params.id));
    if (r instanceof Response) return r;
    const { ctx, o } = r;
    const { texto } = (await request.json()) as PedidoDevolutiva;
    const enc = o.encaminhamentos.find((e) => e.id === params.eid);
    if (!enc) return erro(404, 'nao_encontrado', 'Encaminhamento não encontrado.');
    if (texto.trim().length < 10) return erro(422, 'validacao', 'Descreva a devolutiva recebida.');
    enc.devolutiva = { em: new Date().toISOString(), texto: texto.trim() };
    o.eventos.push(novoEvento(ctx, 'encaminhamento', `Devolutiva de ${enc.orgaoNome}: ${texto.trim()}`));
    return salvar(o, ctx);
  }),

  http.post('/api/ocorrencias/:id/registros', async ({ request, params }) => {
    await delay(300);
    const r = casoParaAgir(request, String(params.id));
    if (r instanceof Response) return r;
    const { ctx, o } = r;
    const p = (await request.json()) as PedidoRegistroEscola;
    if (p.texto.trim().length < 15) return erro(422, 'validacao', 'Descreva o que foi feito, com pelo menos 15 caracteres.');
    o.eventos.push(novoEvento(ctx, p.tipo, p.texto.trim()));
    if (p.tipo === 'escuta') {
      cumprir(o, 'escuta', ctx.usuario.nome, 'Escuta registrada na linha do tempo.');
      cumprir(o, 'acolhimento', ctx.usuario.nome, 'Acolhimento feito na escuta.');
    }
    if (o.status === 'recebido') o.status = 'em_triagem';
    return salvar(o, ctx, 201);
  }),

  http.post('/api/ocorrencias/:id/plano', async ({ request, params }) => {
    await delay(300);
    const r = casoParaAgir(request, String(params.id));
    if (r instanceof Response) return r;
    const { ctx, o } = r;
    const p = (await request.json()) as PedidoAcaoPlano;
    if (p.descricao.trim().length < 5 || !p.responsavel.trim() || !p.prazo) return erro(422, 'validacao', 'Informe a ação, o responsável e o prazo.');
    o.plano.push({ id: `a-${Date.now()}`, descricao: p.descricao.trim(), responsavel: p.responsavel.trim(), prazo: p.prazo, situacao: p.prazo < hojeISO() ? 'atrasada' : 'no_prazo' });
    cumprir(o, 'plano', ctx.usuario.nome, 'Plano de apoio definido.');
    o.eventos.push(novoEvento(ctx, 'providencia', `Ação incluída no plano de apoio: ${p.descricao.trim()}.`));
    return salvar(o, ctx, 201);
  }),

  http.post('/api/ocorrencias/:id/plano/:aid/concluir', async ({ request, params }) => {
    await delay(300);
    const r = casoParaAgir(request, String(params.id));
    if (r instanceof Response) return r;
    const { ctx, o } = r;
    const acao = o.plano.find((a) => a.id === params.aid);
    if (!acao) return erro(404, 'nao_encontrado', 'Ação não encontrada.');
    acao.situacao = 'concluida';
    o.eventos.push(novoEvento(ctx, 'providencia', `Ação do plano concluída: ${acao.descricao}.`));
    return salvar(o, ctx);
  }),

  http.post('/api/ocorrencias/:id/comunicacoes', async ({ request, params }) => {
    await delay(500);
    const r = casoParaAgir(request, String(params.id));
    if (r instanceof Response) return r;
    const { ctx, o } = r;
    const p = (await request.json()) as PedidoComunicacao;
    if (p.texto.trim().length < 30 || !p.destinatario.trim()) return erro(422, 'validacao', 'Revise o destinatário e o texto da comunicação.');
    const token = `c${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
    o.comunicacoes.push({
      id: `com-${Date.now()}`, tipo: p.tipo, destinatario: p.destinatario.trim(), texto: p.texto.trim(), em: new Date().toISOString(),
      registradaPor: ctx.usuario.nome, linkCiencia: p.tipo === 'familia' ? `/ciencia/${token}` : null, ciencia: null,
    });
    if (p.tipo === 'familia') {
      cumprir(o, 'familia', ctx.usuario.nome, `Comunicação enviada a ${p.destinatario.trim()}.`);
      o.eventos.push(novoEvento(ctx, 'comunicacao_familia', `Comunicação enviada a ${p.destinatario.trim()}, com pedido de ciência.`));
    } else {
      o.encaminhamentos.push({
        id: `enc-${Date.now()}`, orgao: 'conselho_tutelar', orgaoNome: p.destinatario.trim(), canal: 'oficio', em: new Date().toISOString(),
        protocoloExterno: '', devolutivaAte: somaDias(10), devolutiva: null, registradoPor: ctx.usuario.nome,
      });
      cumprir(o, 'ct', ctx.usuario.nome, `Ofício enviado a ${p.destinatario.trim()}.`);
      o.eventos.push(novoEvento(ctx, 'encaminhamento', `Ofício enviado a ${p.destinatario.trim()}. Devolutiva esperada em até 10 dias.`));
    }
    return salvar(o, ctx, 201);
  }),

  http.post('/api/ocorrencias/:id/registro-rede', async ({ request, params }) => {
    await delay(300);
    const r = casoParaAgir(request, String(params.id));
    if (r instanceof Response) return r;
    const { ctx, o } = r;
    const { codigo } = (await request.json()) as PedidoRegistroRede;
    if (codigo.trim().length < 3) return erro(422, 'validacao', 'Informe o código do registro no sistema da rede.');
    o.registroNaRede = codigo.trim();
    cumprir(o, 'conviva', ctx.usuario.nome, `Código ${codigo.trim()}.`);
    o.eventos.push(novoEvento(ctx, 'providencia', `Lançado no sistema oficial da rede: ${codigo.trim()}.`));
    return salvar(o, ctx);
  }),

  http.post('/api/ocorrencias/:id/encerrar', async ({ request, params }) => {
    await delay(400);
    const r = casoParaAgir(request, String(params.id));
    if (r instanceof Response) return r;
    const { ctx, o } = r;
    if (!['coordenacao', 'direcao'].includes(ctx.vinculo.perfil)) return erro(403, 'sem_permissao', 'Só coordenação ou direção encerram casos.');
    const p = (await request.json()) as PedidoEncerramento;
    const pendentes = o.providencias.filter((x) => x.obrigatoria && x.situacao === 'pendente');
    if (pendentes.length) {
      return erro(409, 'conflito', `Faltam ${pendentes.length} providências obrigatórias: ${pendentes.map((x) => x.descricao.toLowerCase()).join('; ')}. Cumpra ou dispense cada uma com justificativa.`);
    }
    if (p.justificativa.trim().length < 20) return erro(422, 'validacao', 'Explique o resultado e por que o caso pode ser encerrado (pelo menos 20 caracteres).');
    o.status = 'encerrado';
    o.encerramento = { em: new Date().toISOString(), por: ctx.usuario.nome, justificativa: p.justificativa.trim(), reavaliarEm: p.reavaliarEm };
    o.eventos.push(novoEvento(ctx, 'encerramento', `${p.justificativa.trim()}${p.reavaliarEm ? ` Reavaliação marcada para ${p.reavaliarEm.split('-').reverse().join('/')}.` : ''}`));
    return salvar(o, ctx);
  }),

  /* ---------- Ciência da família: rota pública, só com o link ---------- */
  http.get('/api/ciencia/:token', async ({ params }) => {
    await delay(300);
    recarregar();
    const achado = ocorrencias.flatMap((o) => o.comunicacoes.map((c) => ({ o, c }))).find(({ c }) => c.linkCiencia === `/ciencia/${params.token}`);
    if (!achado) return erro(404, 'nao_encontrado', 'Este link não é válido ou já expirou. Procure a secretaria da escola.');
    const { o, c } = achado;
    const publica: CienciaPublica = {
      escola: escolas.find((e) => e.id === o.escolaId)?.nome ?? '',
      rede: redes.find((x) => x.id === o.redeId)?.nome ?? '',
      redeId: o.redeId,
      destinatario: c.destinatario,
      texto: c.texto,
      enviadaEm: c.em,
      ciencia: c.ciencia,
    };
    return json(publica);
  }),

  http.post('/api/ciencia/:token', async ({ request, params }) => {
    await delay(400);
    recarregar();
    const achado = ocorrencias.flatMap((o) => o.comunicacoes.map((c) => ({ o, c }))).find(({ c }) => c.linkCiencia === `/ciencia/${params.token}`);
    if (!achado) return erro(404, 'nao_encontrado', 'Este link não é válido ou já expirou.');
    const { nome } = (await request.json()) as { nome: string };
    if (nome.trim().length < 3) return erro(422, 'validacao', 'Escreva seu nome para confirmar.');
    achado.c.ciencia = { em: new Date().toISOString(), nome: nome.trim() };
    achado.o.eventos.push({
      id: `ev-${Date.now()}`, tipo: 'comunicacao_familia', autorNome: nome.trim(), autorPerfil: 'professor',
      em: new Date().toISOString(), texto: `Ciência confirmada por ${nome.trim()} (${achado.c.destinatario}).`,
    });
    persistir();
    return json({ ok: true });
  }),
];
