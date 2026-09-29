import { delay, http } from 'msw';
import type { NovaOcorrencia, NovaSessao, NovoAdendo, Ocorrencia, OcorrenciaSemelhante, PrazoProximo, Sessao } from '../api/contract';
import {
  auditar, auditoria, contexto, erro, escolasDoVinculo, json, novoEvento, paraQuemConsulta, persistir, podeAbrir, resumo,
  semAcento, sessoes, soProprios,
} from './base';
import { handlersCentral } from './central';
import { handlersGestao } from './gestao';
import { gerarProvidencias } from './protocolo';
import { categorias, categoriasSensiveis, ocorrencias, pessoas, redes, usuarios } from './seed';

function validar(n: NovaOcorrencia): string | null {
  const f = n.fato;
  if (!f.categoriaId || !categorias.some((c) => c.id === f.categoriaId)) return 'Escolha a categoria.';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(f.data)) return 'Informe a data do fato.';
  if (new Date(`${f.data}T00:00:00`) > new Date()) return 'A data do fato não pode estar no futuro.';
  if (!/^\d{2}:\d{2}$/.test(f.hora)) return 'Informe o horário aproximado.';
  if (!f.local.trim()) return 'Informe o local.';
  if (f.relato.trim().length < 20) return 'O relato precisa ter pelo menos 20 caracteres.';
  if (n.anexos.some((a) => !a.justificativa.trim())) return 'Todo anexo precisa de uma justificativa.';
  return null;
}

export const handlers = [
  http.get('/api/redes', async () => {
    await delay(200);
    return json(redes);
  }),

  http.get('/api/redes/:redeId/usuarios-demo', async ({ params }) => {
    await delay(200);
    return json(usuarios.filter((u) => u.vinculos.some((v) => v.redeId === params.redeId)));
  }),

  http.post('/api/sessoes', async ({ request }) => {
    await delay(350);
    const corpo = (await request.json()) as NovaSessao;
    const usuario = usuarios.find((u) => u.id === corpo.usuarioId);
    if (!usuario || !usuario.vinculos.some((v) => v.redeId === corpo.redeId)) {
      return erro(403, 'sem_permissao', 'Esta pessoa não tem vínculo com a rede escolhida.');
    }
    const token = `demo-${usuario.id}-${Math.random().toString(36).slice(2, 10)}`;
    sessoes.set(token, usuario.id);
    auditar({ usuario, vinculo: usuario.vinculos.find((v) => v.redeId === corpo.redeId)! }, 'login', 'sessão');
    return json({ token, usuario } satisfies Sessao);
  }),

  http.get('/api/escolas', async ({ request }) => {
    await delay(200);
    const ctx = contexto(request);
    if (ctx instanceof Response) return ctx;
    return json(escolasDoVinculo(ctx.vinculo));
  }),

  http.get('/api/categorias', async ({ request }) => {
    await delay(150);
    const ctx = contexto(request);
    if (ctx instanceof Response) return ctx;
    return json(categorias.filter((c) => c.redeId === ctx.vinculo.redeId));
  }),

  http.get('/api/pessoas', async ({ request }) => {
    await delay(200);
    const ctx = contexto(request);
    if (ctx instanceof Response) return ctx;
    if (!ctx.escolaId) return json([]);
    const busca = semAcento(new URL(request.url).searchParams.get('busca') ?? '').trim();
    const lista = pessoas.filter(
      (p) => p.redeId === ctx.vinculo.redeId && p.escolaId === ctx.escolaId &&
        (!busca || semAcento(p.nome).includes(busca) || semAcento(p.turma ?? '').includes(busca)),
    );
    return json(lista.slice(0, 8));
  }),

  http.get('/api/ocorrencias', async ({ request }) => {
    await delay(300);
    const ctx = contexto(request);
    if (ctx instanceof Response) return ctx;
    if (ctx.vinculo.perfil === 'admin_tecnico') return json([]); // administra o serviço, não lê casos
    const alcance = escolasDoVinculo(ctx.vinculo).map((e) => e.id);
    const lista = ocorrencias.filter(
      (o) =>
        o.redeId === ctx.vinculo.redeId &&
        alcance.includes(o.escolaId) &&
        (!ctx.escolaId || o.escolaId === ctx.escolaId) &&
        (!soProprios.includes(ctx.vinculo.perfil) || o.criadoPorId === ctx.usuario.id),
    );
    return json(lista.map(resumo).sort((a, b) => b.abertaEm.localeCompare(a.abertaEm)));
  }),

  http.get('/api/ocorrencias-semelhantes', async ({ request }) => {
    await delay(250);
    const ctx = contexto(request);
    if (ctx instanceof Response) return ctx;
    const q = new URL(request.url).searchParams;
    const lista: OcorrenciaSemelhante[] = ocorrencias
      .filter((o) => o.redeId === ctx.vinculo.redeId && o.escolaId === ctx.escolaId && o.fato.data === q.get('data') && o.categoriaId === q.get('categoriaId'))
      .map((o) => ({ id: o.id, protocolo: o.protocolo, abertaEm: o.abertaEm, local: o.local, categoriaId: o.categoriaId }));
    return json(lista);
  }),

  http.post('/api/ocorrencias', async ({ request }) => {
    await delay(600);
    const ctx = contexto(request);
    if (ctx instanceof Response) return ctx;
    const corpo = (await request.json()) as NovaOcorrencia;
    if (corpo.escolaId !== ctx.escolaId) return erro(403, 'rede_divergente', 'O registro precisa ser da escola ativa.');
    const problema = validar(corpo);
    if (problema) return erro(422, 'validacao', problema);

    const daRede = ocorrencias.filter((o) => o.redeId === ctx.vinculo.redeId);
    const numero = Math.max(0, ...daRede.map((o) => Number(o.protocolo.slice(5)))) + 1;
    const nova: Ocorrencia = {
      id: `oc-${ctx.vinculo.redeId}-${numero}`,
      redeId: ctx.vinculo.redeId,
      escolaId: corpo.escolaId,
      protocolo: `${new Date().getFullYear()}-${String(numero).padStart(6, '0')}`,
      categoriaId: corpo.fato.categoriaId,
      status: 'recebido',
      prioridade: corpo.fato.riscoImediato ? 'urgente' : categoriasSensiveis.includes(corpo.fato.categoriaId) ? 'alta' : 'media',
      abertaEm: new Date().toISOString(),
      local: corpo.fato.local,
      criadoPorId: ctx.usuario.id,
      criadoPorNome: ctx.usuario.nome,
      registroNaRede: null,
      fato: corpo.fato,
      envolvidos: corpo.envolvidos,
      anexos: corpo.anexos,
      eventos: [
        novoEvento(ctx, 'registro', corpo.fato.riscoImediato ? 'Registro criado com risco imediato. A direção foi avisada.' : 'Registro criado e enviado para triagem.'),
      ],
      plano: [],
      responsavelId: null,
      responsavelNome: null,
      providencias: gerarProvidencias(ctx.vinculo.redeId, corpo.fato.categoriaId, corpo.fato.riscoImediato),
      encaminhamentos: [],
      comunicacoes: [],
      encerramento: null,
    };
    ocorrencias.push(nova);
    persistir();
    auditar(ctx, 'criacao', `caso ${nova.protocolo}`);
    return json(paraQuemConsulta(ctx, nova), 201);
  }),

  http.get('/api/ocorrencias/:id', async ({ request, params }) => {
    await delay(250);
    const ctx = contexto(request);
    if (ctx instanceof Response) return ctx;
    const item = ocorrencias.find((o) => o.id === params.id);
    if (!item) return erro(404, 'nao_encontrado', 'Não encontramos este registro.');
    // Mesmo que o id exista, um registro de outra rede nunca é entregue.
    if (item.redeId !== ctx.vinculo.redeId) {
      auditar(ctx, 'negado', 'caso de outra rede', 'negado', 'rede divergente');
      return erro(403, 'rede_divergente', 'Este registro pertence a outra rede.');
    }
    if (!podeAbrir(ctx, item)) {
      auditar(ctx, 'negado', `caso ${item.protocolo}`, 'negado', 'perfil sem acesso');
      return erro(403, 'sem_permissao', 'Seu perfil não tem acesso a este registro.');
    }
    // A tela recarrega o caso sozinha; uma consulta da mesma pessoa ao mesmo caso
    // em 15 minutos conta uma vez só, para a auditoria não virar ruído.
    const recurso = `caso ${item.protocolo}`;
    const limite = new Date(Date.now() - 15 * 60_000).toISOString();
    const jaConsultou = auditoria.some((r) => r.acao === 'consulta' && r.recurso === recurso && r.ator === ctx.usuario.nome && r.redeId === ctx.vinculo.redeId && r.em > limite);
    if (!jaConsultou) auditar(ctx, 'consulta', recurso);
    return json(paraQuemConsulta(ctx, item));
  }),

  http.post('/api/ocorrencias/:id/adendos', async ({ request, params }) => {
    await delay(400);
    const ctx = contexto(request);
    if (ctx instanceof Response) return ctx;
    const item = ocorrencias.find((o) => o.id === params.id);
    if (!item || item.redeId !== ctx.vinculo.redeId) return erro(404, 'nao_encontrado', 'Não encontramos este registro.');
    if (!podeAbrir(ctx, item)) return erro(403, 'sem_permissao', 'Seu perfil não pode acrescentar informações a este registro.');
    const { texto } = (await request.json()) as NovoAdendo;
    if (!texto?.trim() || texto.trim().length < 10) return erro(422, 'validacao', 'O adendo precisa ter pelo menos 10 caracteres.');
    item.eventos.push(novoEvento(ctx, 'adendo', texto.trim()));
    persistir();
    auditar(ctx, 'alteracao', `caso ${item.protocolo}`, 'permitido', 'adendo');
    return json(paraQuemConsulta(ctx, item), 201);
  }),

  http.get('/api/prazos', async ({ request }) => {
    await delay(250);
    const ctx = contexto(request);
    if (ctx instanceof Response) return ctx;
    const lista: PrazoProximo[] = ocorrencias
      .filter((o) => o.status !== 'encerrado' && (!ctx.escolaId || o.escolaId === ctx.escolaId) && podeAbrir(ctx, o))
      .flatMap((o) => o.plano.filter((a) => a.situacao !== 'concluida').map((a) => ({ ...a, ocorrenciaId: o.id, protocolo: o.protocolo })))
      .sort((a, b) => a.prazo.localeCompare(b.prazo));
    return json(lista.slice(0, 5));
  }),

  ...handlersCentral,
  ...handlersGestao,

  http.get('/api/diagnostico/falha', async () => {
    await delay(300);
    return erro(500, 'erro_interno', 'O servidor não conseguiu concluir o pedido.');
  }),
];
