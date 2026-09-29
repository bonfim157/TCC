import { delay, http } from 'msw';
import type {
  Contagem, ContatosLocais, Exportacao, ModeloDeComunicacao, PedidoExportacao, PedidoNovaPessoa, Perfil, Relatorio,
  RegraDoProtocolo, ResultadoDeBusca, UsuarioDaRede,
} from '../api/contract';
import { rotuloStatus } from '../components/feedback';
import { auditar, auditoria, contexto, conduz, erro, escolasDoVinculo, json, podeAbrir, resumo, semAcento, type Contexto } from './base';
import { modelos, regras } from './protocolo';
import { categorias, contatos, escolas, ocorrencias, pessoas, regionais, usuarios } from './seed';

/* API de busca, relatórios, auditoria e administração (F4). */

/** Grupos com menos casos que isso aparecem suprimidos, para não identificar pessoas. */
const LIMITE_MINIMO = 3;

const podeBuscar = (ctx: Contexto) => conduz(ctx) || ctx.vinculo.perfil === 'diretoria_regional';
const podeRelatorio = (ctx: Contexto) => (['direcao', 'diretoria_regional', 'secretaria'] as Perfil[]).includes(ctx.vinculo.perfil);
const administraRede = (ctx: Contexto) => ctx.vinculo.perfil === 'secretaria' || ctx.vinculo.perfil === 'admin_tecnico';
const administraEscola = (ctx: Contexto) => ctx.vinculo.perfil === 'direcao';
const podeAdministrar = (ctx: Contexto) => administraRede(ctx) || administraEscola(ctx);

const meses = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

function negar(ctx: Contexto, recurso: string, mensagem: string) {
  auditar(ctx, 'negado', recurso, 'negado', 'perfil sem acesso');
  return erro(403, 'sem_permissao', mensagem);
}

/** Casos no alcance do vínculo, filtrados por período e escola. */
function noAlcance(ctx: Contexto, q: URLSearchParams) {
  const alcance = escolasDoVinculo(ctx.vinculo).map((e) => e.id);
  const escolaId = q.get('escolaId') || (ctx.vinculo.escolaIds.length ? ctx.escolaId : '') || '';
  const de = q.get('de') || '0000';
  const ate = q.get('ate') || '9999';
  return ocorrencias.filter(
    (o) => o.redeId === ctx.vinculo.redeId && alcance.includes(o.escolaId) && (!escolaId || o.escolaId === escolaId) &&
      o.fato.data >= de && o.fato.data <= ate,
  );
}

const suprimir = (n: number) => (n < LIMITE_MINIMO ? null : n);

function montarRelatorio(ctx: Contexto, q: URLSearchParams): Relatorio {
  const categoriaId = q.get('categoriaId') || '';
  const lista = noAlcance(ctx, q).filter((o) => !categoriaId || o.categoriaId === categoriaId);
  const cats = categorias.filter((c) => c.redeId === ctx.vinculo.redeId && (!categoriaId || c.id === categoriaId));
  const porCategoria: Contagem[] = cats
    .map((c) => ({ chave: c.id, rotulo: c.nome, total: suprimir(lista.filter((o) => o.categoriaId === c.id).length) }))
    .filter((c) => c.total !== 0);
  const chavesMes = [...new Set(lista.map((o) => o.fato.data.slice(0, 7)))].sort();
  const porMes: Contagem[] = chavesMes.map((m) => ({
    chave: m, rotulo: `${meses[Number(m.slice(5, 7)) - 1]} ${m.slice(0, 4)}`, total: suprimir(lista.filter((o) => o.fato.data.startsWith(m)).length),
  }));
  const status = [...new Set(lista.map((o) => o.status))];
  const porSituacao: Contagem[] = status.map((st) => ({ chave: st, rotulo: rotuloStatus[st][0], total: suprimir(lista.filter((o) => o.status === st).length) }));
  const escolaId = q.get('escolaId') || (ctx.vinculo.escolaIds.length ? ctx.escolaId : '');
  const escolasNoEscopo = escolaId ? [] : escolasDoVinculo(ctx.vinculo);
  const porEscola: Contagem[] = escolasNoEscopo.length > 1
    ? escolasNoEscopo.map((e) => ({ chave: e.id, rotulo: e.sigla ?? e.nome, total: suprimir(lista.filter((o) => o.escolaId === e.id).length) }))
    : [];
  const escopo = escolaId
    ? escolas.find((e) => e.id === escolaId)?.nome ?? ''
    : ctx.vinculo.regionalId
      ? regionais.find((r) => r.id === ctx.vinculo.regionalId)?.nome ?? ''
      : 'Toda a rede';
  return {
    limiteMinimo: LIMITE_MINIMO,
    periodo: { de: q.get('de') || '', ate: q.get('ate') || '' },
    escopo,
    total: lista.length,
    porCategoria,
    porMes,
    porSituacao,
    porEscola,
  };
}

const csv = (linhas: (string | number)[][]) => linhas.map((l) => l.map((c) => `"${String(c).replaceAll('"', '""')}"`).join(';')).join('\r\n');

export const handlersGestao = [
  /* ---------- Busca ---------- */
  http.get('/api/busca', async ({ request }) => {
    await delay(300);
    const ctx = contexto(request);
    if (ctx instanceof Response) return ctx;
    if (!podeBuscar(ctx)) return negar(ctx, 'busca', 'Seu perfil não faz buscas de casos.');
    const q = new URL(request.url).searchParams;
    const texto = semAcento(q.get('texto') ?? '').trim();
    const lista: ResultadoDeBusca[] = noAlcance(ctx, q)
      .filter((o) => (!q.get('categoriaId') || o.categoriaId === q.get('categoriaId')) &&
        (!q.get('status') || o.status === q.get('status')) &&
        (!q.get('prioridade') || o.prioridade === q.get('prioridade')) &&
        (!texto || o.protocolo.includes(texto) || semAcento(o.local).includes(texto)))
      .sort((a, b) => b.abertaEm.localeCompare(a.abertaEm))
      .map((o) => ({ ...resumo(o), podeAbrir: podeAbrir(ctx, o), escolaNome: escolas.find((e) => e.id === o.escolaId)?.sigla ?? escolas.find((e) => e.id === o.escolaId)?.nome ?? '' }));
    auditar(ctx, 'busca', 'busca de casos', 'permitido', `${lista.length} resultados`);
    return json(lista.slice(0, 200));
  }),

  /* ---------- Relatório agregado ---------- */
  http.get('/api/relatorios', async ({ request }) => {
    await delay(400);
    const ctx = contexto(request);
    if (ctx instanceof Response) return ctx;
    if (!podeRelatorio(ctx)) return negar(ctx, 'relatório agregado', 'Seu perfil não acessa relatórios.');
    return json(montarRelatorio(ctx, new URL(request.url).searchParams));
  }),

  http.post('/api/exportacoes', async ({ request }) => {
    await delay(500);
    const ctx = contexto(request);
    if (ctx instanceof Response) return ctx;
    if (!podeRelatorio(ctx)) return negar(ctx, 'exportação', 'Seu perfil não exporta relatórios.');
    const p = (await request.json()) as PedidoExportacao;
    if (p.motivo.trim().length < 20) return erro(422, 'validacao', 'Explique para que serve a exportação (pelo menos 20 caracteres). O motivo fica registrado.');
    const q = new URLSearchParams({ de: p.de, ate: p.ate, escolaId: p.escolaId, categoriaId: p.somenteCategoriaId });
    const r = montarRelatorio(ctx, q);
    const valor = (c: Contagem) => (c.total === null ? `menos de ${r.limiteMinimo}` : c.total);
    const conteudo = csv([
      ['Relatório agregado de ocorrências'],
      ['Escopo', r.escopo],
      ['Período', r.periodo.de || 'início', r.periodo.ate || 'hoje'],
      ['Grupos com menos de', r.limiteMinimo, 'casos aparecem suprimidos'],
      [],
      ['Tipo de ocorrência', 'Casos'],
      ...r.porCategoria.map((c) => [c.rotulo, valor(c)]),
      [],
      ['Mês', 'Casos'],
      ...r.porMes.map((c) => [c.rotulo, valor(c)]),
      ...(r.porEscola.length ? [[], ['Escola', 'Casos'], ...r.porEscola.map((c) => [c.rotulo, valor(c)])] : []),
    ]);
    auditar(ctx, 'exportacao', `relatório agregado (${r.escopo})`, 'permitido', p.motivo.trim());
    const data = new Date().toISOString().slice(0, 10);
    return json({ nomeArquivo: `relatorio-ocorrencias-${data}.csv`, conteudoCsv: conteudo } satisfies Exportacao, 201);
  }),

  /* ---------- Auditoria ---------- */
  http.get('/api/auditoria', async ({ request }) => {
    await delay(300);
    const ctx = contexto(request);
    if (ctx instanceof Response) return ctx;
    if (!podeAdministrar(ctx)) return negar(ctx, 'auditoria', 'Seu perfil não consulta a auditoria.');
    // A direção vê os registros de quem atua na sua escola; a secretaria, os da rede.
    const daEscola = new Set(usuarios.filter((u) => u.vinculos.some((v) => v.redeId === ctx.vinculo.redeId && ctx.escolaId && v.escolaIds.includes(ctx.escolaId))).map((u) => u.nome));
    const lista = auditoria.filter((a) => a.redeId === ctx.vinculo.redeId && (administraRede(ctx) || daEscola.has(a.ator) || a.perfil === null));
    return json(lista.slice(0, 300));
  }),

  /* ---------- Administração: protocolo, tipos e modelos (nível da rede) ---------- */
  http.get('/api/admin/regras', async ({ request }) => {
    await delay(200);
    const ctx = contexto(request);
    if (ctx instanceof Response) return ctx;
    if (!podeAdministrar(ctx)) return negar(ctx, 'protocolo da rede', 'Seu perfil não acessa a administração.');
    return json(regras.filter((r) => r.redeId === ctx.vinculo.redeId));
  }),

  http.put('/api/admin/regras/:id', async ({ request, params }) => {
    await delay(300);
    const ctx = contexto(request);
    if (ctx instanceof Response) return ctx;
    if (!administraRede(ctx)) return negar(ctx, 'protocolo da rede', 'Só a secretaria altera o protocolo da rede.');
    const regra = regras.find((r) => r.id === params.id && r.redeId === ctx.vinculo.redeId);
    if (!regra) return erro(404, 'nao_encontrado', 'Regra não encontrada.');
    const p = (await request.json()) as Partial<RegraDoProtocolo>;
    if (p.descricao !== undefined && p.descricao.trim().length < 10) return erro(422, 'validacao', 'Descreva a providência com pelo menos 10 caracteres.');
    Object.assign(regra, {
      descricao: p.descricao?.trim() ?? regra.descricao,
      base: p.base?.trim() ?? regra.base,
      obrigatoria: p.obrigatoria ?? regra.obrigatoria,
    });
    auditar(ctx, 'administracao', `protocolo: ${regra.descricao}`);
    return json(regra);
  }),

  http.put('/api/admin/categorias/:id', async ({ request, params }) => {
    await delay(300);
    const ctx = contexto(request);
    if (ctx instanceof Response) return ctx;
    if (!administraRede(ctx)) return negar(ctx, 'tipos de ocorrência', 'Só a secretaria altera os tipos de ocorrência.');
    const c = categorias.find((x) => x.id === params.id && x.redeId === ctx.vinculo.redeId);
    if (!c) return erro(404, 'nao_encontrado', 'Tipo não encontrado.');
    const p = (await request.json()) as { ativa: boolean; nome?: string };
    c.ativa = p.ativa;
    if (p.nome?.trim()) c.nome = p.nome.trim();
    auditar(ctx, 'administracao', `tipo de ocorrência: ${c.nome}`, 'permitido', c.ativa ? 'ativado' : 'desativado');
    return json(c);
  }),

  http.put('/api/admin/modelos/:id', async ({ request, params }) => {
    await delay(300);
    const ctx = contexto(request);
    if (ctx instanceof Response) return ctx;
    if (!administraRede(ctx)) return negar(ctx, 'modelos de comunicação', 'Só a secretaria altera os modelos.');
    const m = modelos.find((x) => x.id === params.id && x.redeId === ctx.vinculo.redeId);
    if (!m) return erro(404, 'nao_encontrado', 'Modelo não encontrado.');
    const p = (await request.json()) as Partial<ModeloDeComunicacao>;
    if (!p.texto || !p.texto.includes('{estudante}')) return erro(422, 'validacao', 'O modelo precisa ter o campo {estudante}.');
    m.texto = p.texto;
    auditar(ctx, 'administracao', `modelo: ${m.nome}`);
    return json(m);
  }),

  /* ---------- Administração: contatos e pessoas (nível da escola) ---------- */
  http.get('/api/admin/contatos', async ({ request }) => {
    await delay(200);
    const ctx = contexto(request);
    if (ctx instanceof Response) return ctx;
    const c = contatos.find((x) => x.escolaId === ctx.escolaId);
    return c ? json(c) : erro(404, 'nao_encontrado', 'Escola sem contatos cadastrados.');
  }),

  http.put('/api/admin/contatos', async ({ request }) => {
    await delay(300);
    const ctx = contexto(request);
    if (ctx instanceof Response) return ctx;
    if (!administraEscola(ctx)) return negar(ctx, 'contatos locais', 'Só a direção da escola altera os contatos locais.');
    const c = contatos.find((x) => x.escolaId === ctx.escolaId);
    if (!c) return erro(404, 'nao_encontrado', 'Escola sem contatos cadastrados.');
    const p = (await request.json()) as ContatosLocais;
    Object.assign(c, { conselhoTutelar: p.conselhoTutelar, cras: p.cras, creas: p.creas, delegacia: p.delegacia, saude: p.saude });
    auditar(ctx, 'administracao', 'contatos locais da escola');
    return json(c);
  }),

  http.get('/api/admin/pessoas', async ({ request }) => {
    await delay(200);
    const ctx = contexto(request);
    if (ctx instanceof Response) return ctx;
    if (!podeAdministrar(ctx)) return negar(ctx, 'pessoas da escola', 'Seu perfil não acessa a administração.');
    return json(pessoas.filter((p) => p.redeId === ctx.vinculo.redeId && p.escolaId === ctx.escolaId));
  }),

  http.post('/api/admin/pessoas', async ({ request }) => {
    await delay(300);
    const ctx = contexto(request);
    if (ctx instanceof Response) return ctx;
    if (!administraEscola(ctx) || !ctx.escolaId) return negar(ctx, 'pessoas da escola', 'Só a direção cadastra pessoas da escola.');
    const p = (await request.json()) as PedidoNovaPessoa;
    if (p.nome.trim().length < 2) return erro(422, 'validacao', 'Informe o nome.');
    if (p.tipo === 'estudante' && !p.turma?.trim()) return erro(422, 'validacao', 'Informe a turma do estudante.');
    const nova = { id: `p-${Date.now()}`, redeId: ctx.vinculo.redeId, escolaId: ctx.escolaId, nome: p.nome.trim(), tipo: p.tipo, turma: p.turma?.trim() || undefined };
    pessoas.push(nova);
    auditar(ctx, 'administracao', 'cadastro de pessoa', 'permitido', p.tipo);
    return json(nova, 201);
  }),

  http.get('/api/admin/usuarios', async ({ request }) => {
    await delay(200);
    const ctx = contexto(request);
    if (ctx instanceof Response) return ctx;
    if (!podeAdministrar(ctx)) return negar(ctx, 'usuários', 'Seu perfil não acessa a administração.');
    const lista: UsuarioDaRede[] = usuarios.flatMap((u) =>
      u.vinculos
        .filter((v) => v.redeId === ctx.vinculo.redeId && (administraRede(ctx) || (ctx.escolaId && v.escolaIds.includes(ctx.escolaId))))
        .map((v) => ({ id: u.id, nome: u.nome, perfil: v.perfil, escolas: v.escolaIds.map((id) => escolas.find((e) => e.id === id)?.sigla ?? escolas.find((e) => e.id === id)?.nome ?? id) })),
    );
    return json(lista);
  }),
];
