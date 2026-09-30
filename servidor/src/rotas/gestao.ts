import type { Hono } from 'hono';
import {
  nomeStatus, type Contagem, type ContatosLocais, type Exportacao, type Perfil, type RegistroDeAuditoria, type RegraDoProtocolo,
  type Relatorio, type ResultadoDeBusca, type StatusCaso, type UsuarioDaRede,
} from '@tcc/compartilhado/contrato';
import {
  esquemaCategoria, esquemaContatos, esquemaExportacao, esquemaModelo, esquemaNovaPessoa, esquemaRegra,
} from '@tcc/compartilhado/esquemas';
import type { Cliente } from '../banco/conexao';
import { alcance, conduz, podeAbrir } from '../casos';
import { auditar, comContexto, escolasDoVinculo, type Contexto } from '../contexto';
import { naoEncontrado, semPermissao, validacao } from '../erros';
import { corpo, semAcento } from '../util';

/* Busca, relatórios, auditoria e administração (B5). Espelha front/src/mocks/gestao.ts. */

/** Grupos com menos casos que isso aparecem suprimidos, para não identificar pessoas. */
const LIMITE_MINIMO = 3;

const podeBuscar = (ctx: Contexto) => conduz(ctx) || ctx.vinculo.perfil === 'diretoria_regional';
const podeRelatorio = (ctx: Contexto) => (['direcao', 'diretoria_regional', 'secretaria'] as Perfil[]).includes(ctx.vinculo.perfil);
const administraRede = (ctx: Contexto) => ctx.vinculo.perfil === 'secretaria' || ctx.vinculo.perfil === 'admin_tecnico';
const administraEscola = (ctx: Contexto) => ctx.vinculo.perfil === 'direcao';
const podeAdministrar = (ctx: Contexto) => administraRede(ctx) || administraEscola(ctx);

const meses = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

/** Recusa por perfil, gravada na auditoria. */
const negar = (recurso: string, mensagem: string) => semPermissao(mensagem).registrar(recurso, 'perfil sem acesso');

type Filtro = { de?: string; ate?: string; escolaId?: string };
type LinhaDeCaso = {
  id: string; rede_id: string; escola_id: string; protocolo: string; categoria_id: string; status: StatusCaso; prioridade: string;
  aberta_em: string; local: string; criado_por_id: string; fato_data: string;
};

/** Escola que limita a consulta: a pedida, ou a ativa quando o vínculo é de escola. */
const escolaDoFiltro = (ctx: Contexto, f: Filtro) => f.escolaId || (ctx.vinculo.escolaIds.length ? ctx.escolaId : '') || '';

/** Casos no alcance do vínculo, filtrados por período e escola. */
async function noAlcance(db: Cliente, ctx: Contexto, f: Filtro): Promise<LinhaDeCaso[]> {
  const r = await db.query<LinhaDeCaso>(
    `select id, rede_id, escola_id, protocolo, categoria_id, status, prioridade, aberta_em, local, criado_por_id, fato_data
       from ocorrencias
      where escola_id = any($1) and ($2 = '' or escola_id = $2) and fato_data >= $3::date and fato_data <= $4::date
      order by aberta_em desc`,
    [await alcance(db, ctx), escolaDoFiltro(ctx, f), /^\d{4}-\d{2}-\d{2}$/.test(f.de ?? '') ? f.de : '0001-01-01', /^\d{4}-\d{2}-\d{2}$/.test(f.ate ?? '') ? f.ate : '9999-12-31'],
  );
  return r.rows;
}

const suprimir = (n: number) => (n < LIMITE_MINIMO ? null : n);

async function montarRelatorio(db: Cliente, ctx: Contexto, f: Filtro & { categoriaId?: string }): Promise<Relatorio> {
  const categoriaId = f.categoriaId || '';
  const lista = (await noAlcance(db, ctx, f)).filter((o) => !categoriaId || o.categoria_id === categoriaId);
  const cats = (await db.query<{ id: string; nome: string }>('select id, nome from categorias order by ordem')).rows.filter((c) => !categoriaId || c.id === categoriaId);
  const porCategoria: Contagem[] = cats
    .map((c) => ({ chave: c.id, rotulo: c.nome, total: suprimir(lista.filter((o) => o.categoria_id === c.id).length) }))
    .filter((c) => c.total !== 0);
  const chavesMes = [...new Set(lista.map((o) => o.fato_data.slice(0, 7)))].sort();
  const porMes: Contagem[] = chavesMes.map((m) => ({
    chave: m, rotulo: `${meses[Number(m.slice(5, 7)) - 1]} ${m.slice(0, 4)}`, total: suprimir(lista.filter((o) => o.fato_data.startsWith(m)).length),
  }));
  const status = [...new Set(lista.map((o) => o.status))];
  const porSituacao: Contagem[] = status.map((st) => ({ chave: st, rotulo: nomeStatus[st], total: suprimir(lista.filter((o) => o.status === st).length) }));

  const escolas = await escolasDoVinculo(db, ctx.vinculo);
  const escolaId = escolaDoFiltro(ctx, f);
  const noEscopo = escolaId ? [] : escolas;
  const porEscola: Contagem[] = noEscopo.length > 1
    ? noEscopo.map((e) => ({ chave: e.id, rotulo: e.sigla ?? e.nome, total: suprimir(lista.filter((o) => o.escola_id === e.id).length) }))
    : [];
  let escopo = 'Toda a rede';
  if (escolaId) escopo = escolas.find((e) => e.id === escolaId)?.nome ?? '';
  else if (ctx.vinculo.regionalId) {
    escopo = (await db.query<{ nome: string }>('select nome from regionais where id = $1', [ctx.vinculo.regionalId])).rows[0]?.nome ?? '';
  }
  return { limiteMinimo: LIMITE_MINIMO, periodo: { de: f.de || '', ate: f.ate || '' }, escopo, total: lista.length, porCategoria, porMes, porSituacao, porEscola };
}

const csv = (linhas: (string | number)[][]) => linhas.map((l) => l.map((c) => `"${String(c).replaceAll('"', '""')}"`).join(';')).join('\r\n');

export function rotasDeGestao(app: Hono) {
  /* ---------- Busca ---------- */
  app.get('/busca', (c) =>
    comContexto(c.req.raw.headers, async (db, ctx) => {
      if (!podeBuscar(ctx)) throw negar('busca', 'Seu perfil não faz buscas de casos.');
      const q = c.req.query();
      const texto = semAcento(q.texto ?? '').trim();
      const escolas = await escolasDoVinculo(db, ctx.vinculo);
      const ids = escolas.map((e) => e.id);
      const lista: ResultadoDeBusca[] = (await noAlcance(db, ctx, q))
        .filter((o) => (!q.categoriaId || o.categoria_id === q.categoriaId) &&
          (!q.status || o.status === q.status) &&
          (!q.prioridade || o.prioridade === q.prioridade) &&
          (!texto || o.protocolo.includes(texto) || semAcento(o.local).includes(texto)))
        .map((o) => {
          const escola = escolas.find((e) => e.id === o.escola_id);
          return {
            id: o.id, redeId: o.rede_id, escolaId: o.escola_id, protocolo: o.protocolo, categoriaId: o.categoria_id, status: o.status,
            prioridade: o.prioridade as ResultadoDeBusca['prioridade'], abertaEm: o.aberta_em, local: o.local, criadoPorId: o.criado_por_id,
            podeAbrir: podeAbrir(ctx, ids, { escolaId: o.escola_id, criadoPorId: o.criado_por_id }),
            escolaNome: escola?.sigla ?? escola?.nome ?? '',
          };
        });
      await auditar(db, ctx, 'busca', 'busca de casos', 'permitido', `${lista.length} resultados`);
      return c.json(lista.slice(0, 200));
    }),
  );

  /* ---------- Relatório agregado ---------- */
  app.get('/relatorios', (c) =>
    comContexto(c.req.raw.headers, async (db, ctx) => {
      if (!podeRelatorio(ctx)) throw negar('relatório agregado', 'Seu perfil não acessa relatórios.');
      return c.json(await montarRelatorio(db, ctx, c.req.query()));
    }),
  );

  app.post('/exportacoes', async (c) => {
    const p = await corpo(c, esquemaExportacao);
    return comContexto(c.req.raw.headers, async (db, ctx) => {
      if (!podeRelatorio(ctx)) throw negar('exportação', 'Seu perfil não exporta relatórios.');
      if (p.motivo.trim().length < 20) throw validacao('Explique para que serve a exportação (pelo menos 20 caracteres). O motivo fica registrado.');
      const r = await montarRelatorio(db, ctx, { de: p.de, ate: p.ate, escolaId: p.escolaId, categoriaId: p.somenteCategoriaId });
      const valor = (x: Contagem) => (x.total === null ? `menos de ${r.limiteMinimo}` : x.total);
      const conteudo = csv([
        ['Relatório agregado de ocorrências'],
        ['Escopo', r.escopo],
        ['Período', r.periodo.de || 'início', r.periodo.ate || 'hoje'],
        ['Grupos com menos de', r.limiteMinimo, 'casos aparecem suprimidos'],
        [],
        ['Tipo de ocorrência', 'Casos'],
        ...r.porCategoria.map((x) => [x.rotulo, valor(x)]),
        [],
        ['Mês', 'Casos'],
        ...r.porMes.map((x) => [x.rotulo, valor(x)]),
        ...(r.porEscola.length ? [[], ['Escola', 'Casos'], ...r.porEscola.map((x) => [x.rotulo, valor(x)])] : []),
      ]);
      await auditar(db, ctx, 'exportacao', `relatório agregado (${r.escopo})`, 'permitido', p.motivo.trim());
      const data = new Date(Date.now() - 3 * 3600_000).toISOString().slice(0, 10);
      return c.json({ nomeArquivo: `relatorio-ocorrencias-${data}.csv`, conteudoCsv: conteudo } satisfies Exportacao, 201);
    });
  });

  /* ---------- Auditoria ---------- */
  app.get('/auditoria', (c) =>
    comContexto(c.req.raw.headers, async (db, ctx) => {
      if (!podeAdministrar(ctx)) throw negar('auditoria', 'Seu perfil não consulta a auditoria.');
      // A direção vê os registros de quem atua na sua escola e os acessos da família; a secretaria, os da rede.
      const r = await db.query(
        `select a.id, a.em, a.ator, a.perfil, a.rede_id, a.acao, a.recurso, a.resultado, a.detalhe from auditoria a
          where $1::boolean or a.perfil is null or a.ator in (
                  select u.nome from usuarios u join vinculos v on v.usuario_id = u.id join vinculo_escolas ve on ve.vinculo_id = v.id
                   where ve.escola_id = $2)
          order by a.id desc limit 300`,
        [administraRede(ctx), ctx.escolaId],
      );
      const lista: RegistroDeAuditoria[] = r.rows.map((a) => ({
        id: String(a.id), em: a.em, ator: a.ator, perfil: a.perfil, redeId: a.rede_id, acao: a.acao, recurso: a.recurso, resultado: a.resultado,
        ...(a.detalhe ? { detalhe: a.detalhe } : {}),
      }));
      return c.json(lista);
    }),
  );

  /* ---------- Administração: protocolo, tipos e modelos (nível da rede) ---------- */
  const regra = (r: Record<string, any>): RegraDoProtocolo => ({ // eslint-disable-line @typescript-eslint/no-explicit-any
    id: r.id, redeId: r.rede_id, categoriaIds: r.categoria_ids ?? 'todas', somenteComRisco: r.somente_com_risco,
    descricao: r.descricao, base: r.base, obrigatoria: r.obrigatoria,
  });

  app.get('/admin/regras', (c) =>
    comContexto(c.req.raw.headers, async (db, ctx) => {
      if (!podeAdministrar(ctx)) throw negar('protocolo da rede', 'Seu perfil não acessa a administração.');
      return c.json((await db.query('select * from regras_protocolo order by ordem')).rows.map(regra));
    }),
  );

  app.put('/admin/regras/:id', async (c) => {
    const p = await corpo(c, esquemaRegra);
    return comContexto(c.req.raw.headers, async (db, ctx) => {
      if (!administraRede(ctx)) throw negar('protocolo da rede', 'Só a secretaria altera o protocolo da rede.');
      if (p.descricao !== undefined && p.descricao.trim().length < 10) throw validacao('Descreva a providência com pelo menos 10 caracteres.');
      const r = await db.query(
        `update regras_protocolo set descricao = coalesce($2, descricao), base = coalesce($3, base), obrigatoria = coalesce($4, obrigatoria)
          where id = $1 returning *`,
        [c.req.param('id'), p.descricao?.trim() ?? null, p.base?.trim() ?? null, p.obrigatoria ?? null],
      );
      if (!r.rowCount) throw naoEncontrado('Regra não encontrada.');
      await auditar(db, ctx, 'administracao', `protocolo: ${r.rows[0].descricao}`);
      return c.json(regra(r.rows[0]));
    });
  });

  app.put('/admin/categorias/:id', async (c) => {
    const p = await corpo(c, esquemaCategoria);
    return comContexto(c.req.raw.headers, async (db, ctx) => {
      if (!administraRede(ctx)) throw negar('tipos de ocorrência', 'Só a secretaria altera os tipos de ocorrência.');
      const r = await db.query(
        `update categorias set ativa = $2, nome = coalesce($3, nome) where id = $1 returning id, rede_id, nome, ativa`,
        [c.req.param('id'), p.ativa, p.nome?.trim() || null],
      );
      if (!r.rowCount) throw naoEncontrado('Tipo não encontrado.');
      const cat = r.rows[0];
      await auditar(db, ctx, 'administracao', `tipo de ocorrência: ${cat.nome}`, 'permitido', cat.ativa ? 'ativado' : 'desativado');
      return c.json({ id: cat.id, redeId: cat.rede_id, nome: cat.nome, ativa: cat.ativa });
    });
  });

  app.put('/admin/modelos/:id', async (c) => {
    const p = await corpo(c, esquemaModelo);
    return comContexto(c.req.raw.headers, async (db, ctx) => {
      if (!administraRede(ctx)) throw negar('modelos de comunicação', 'Só a secretaria altera os modelos.');
      const existe = await db.query('select 1 from modelos_comunicacao where id = $1', [c.req.param('id')]);
      if (!existe.rowCount) throw naoEncontrado('Modelo não encontrado.');
      if (!p.texto || !p.texto.includes('{estudante}')) throw validacao('O modelo precisa ter o campo {estudante}.');
      const m = (await db.query('update modelos_comunicacao set texto = $2 where id = $1 returning id, rede_id, tipo, nome, texto', [c.req.param('id'), p.texto])).rows[0];
      await auditar(db, ctx, 'administracao', `modelo: ${m.nome}`);
      return c.json({ id: m.id, redeId: m.rede_id, tipo: m.tipo, nome: m.nome, texto: m.texto });
    });
  });

  /* ---------- Administração: contatos e pessoas (nível da escola) ---------- */
  const contatos = (x: Record<string, string>): ContatosLocais => ({
    escolaId: x.escola_id, conselhoTutelar: x.conselho_tutelar, cras: x.cras, creas: x.creas, delegacia: x.delegacia, saude: x.saude,
  });

  app.get('/admin/contatos', (c) =>
    comContexto(c.req.raw.headers, async (db, ctx) => {
      const r = await db.query('select * from contatos_locais where escola_id = $1', [ctx.escolaId]);
      if (!r.rowCount) throw naoEncontrado('Escola sem contatos cadastrados.');
      return c.json(contatos(r.rows[0]));
    }),
  );

  app.put('/admin/contatos', async (c) => {
    const p = await corpo(c, esquemaContatos);
    return comContexto(c.req.raw.headers, async (db, ctx) => {
      if (!administraEscola(ctx)) throw negar('contatos locais', 'Só a direção da escola altera os contatos locais.');
      const r = await db.query(
        `update contatos_locais set conselho_tutelar = $2, cras = $3, creas = $4, delegacia = $5, saude = $6 where escola_id = $1 returning *`,
        [ctx.escolaId, p.conselhoTutelar.trim(), p.cras.trim(), p.creas.trim(), p.delegacia.trim(), p.saude.trim()],
      );
      if (!r.rowCount) throw naoEncontrado('Escola sem contatos cadastrados.');
      await auditar(db, ctx, 'administracao', 'contatos locais da escola');
      return c.json(contatos(r.rows[0]));
    });
  });

  const pessoa = (p: Record<string, string | null>) => ({
    id: p.id, redeId: p.rede_id, escolaId: p.escola_id, nome: p.nome, tipo: p.tipo, ...(p.turma ? { turma: p.turma } : {}),
  });

  app.get('/admin/pessoas', (c) =>
    comContexto(c.req.raw.headers, async (db, ctx) => {
      if (!podeAdministrar(ctx)) throw negar('pessoas da escola', 'Seu perfil não acessa a administração.');
      const r = await db.query('select id, rede_id, escola_id, nome, tipo, turma from pessoas where escola_id = $1 order by tipo, nome', [ctx.escolaId]);
      return c.json(r.rows.map(pessoa));
    }),
  );

  app.post('/admin/pessoas', async (c) => {
    const p = await corpo(c, esquemaNovaPessoa);
    return comContexto(c.req.raw.headers, async (db, ctx) => {
      if (!administraEscola(ctx) || !ctx.escolaId) throw negar('pessoas da escola', 'Só a direção cadastra pessoas da escola.');
      if (p.nome.trim().length < 2) throw validacao('Informe o nome.');
      if (p.tipo === 'estudante' && !p.turma?.trim()) throw validacao('Informe a turma do estudante.');
      const r = await db.query(
        `insert into pessoas (rede_id, escola_id, nome, tipo, turma) values ($1, $2, $3, $4, $5) returning id, rede_id, escola_id, nome, tipo, turma`,
        [ctx.vinculo.redeId, ctx.escolaId, p.nome.trim(), p.tipo, p.turma?.trim() || null],
      );
      await auditar(db, ctx, 'administracao', 'cadastro de pessoa', 'permitido', p.tipo);
      return c.json(pessoa(r.rows[0]), 201);
    });
  });

  app.get('/admin/usuarios', (c) =>
    comContexto(c.req.raw.headers, async (db, ctx) => {
      if (!podeAdministrar(ctx)) throw negar('usuários', 'Seu perfil não acessa a administração.');
      const r = await db.query<UsuarioDaRede>(
        `select u.id, u.nome, v.perfil,
                coalesce(array_agg(coalesce(e.sigla, e.nome) order by e.nome) filter (where e.id is not null), '{}') as escolas
           from vinculos v join usuarios u on u.id = v.usuario_id
           left join vinculo_escolas ve on ve.vinculo_id = v.id left join escolas e on e.id = ve.escola_id
          where v.rede_id = $1
            and ($2::boolean or exists (select 1 from vinculo_escolas x where x.vinculo_id = v.id and x.escola_id = $3))
          group by u.id, u.nome, v.perfil order by u.nome`,
        [ctx.vinculo.redeId, administraRede(ctx), ctx.escolaId],
      );
      return c.json(r.rows);
    }),
  );
}
