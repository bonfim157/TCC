import type { Hono } from 'hono';
import { acaoEmAberto, type NovaOcorrencia, type OcorrenciaSemelhante, type Pessoa, type PrazoProximo } from '@tcc/compartilhado/contrato';
import { esquemaNovaOcorrencia, esquemaNovoAdendo } from '@tcc/compartilhado/esquemas';
import type { Cliente } from '../banco/conexao';
import { alcance, carregarCaso, carregarCasos, novoEvento, paraQuemConsulta, podeAbrir, soProprios } from '../casos';
import { auditar, comContexto, type Contexto } from '../contexto';
import { naoEncontrado, redeDivergente, semPermissao, validacao } from '../erros';
import { corpo, hojeISO, semAcento } from '../util';

/* Registro e acompanhamento (B3). Espelha front/src/mocks/handlers.ts. */

async function validar(c: Cliente, n: NovaOcorrencia): Promise<string | null> {
  const f = n.fato;
  const categoria = f.categoriaId ? await c.query('select 1 from categorias where id = $1', [f.categoriaId]) : null;
  if (!categoria?.rowCount) return 'Escolha a categoria.';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(f.data) || Number.isNaN(Date.parse(f.data))) return 'Informe a data do fato.';
  if (f.data > hojeISO()) return 'A data do fato não pode estar no futuro.';
  if (!/^\d{2}:\d{2}$/.test(f.hora)) return 'Informe o horário aproximado.';
  if (!f.local.trim()) return 'Informe o local.';
  if (f.relato.trim().length < 20) return 'O relato precisa ter pelo menos 20 caracteres.';
  if (n.anexos.some((a) => !a.justificativa.trim())) return 'Todo anexo precisa de uma justificativa.';
  return null;
}

/** Próximo número de protocolo da rede no ano, com trava de linha: sem repetição sob concorrência. */
async function proximoProtocolo(c: Cliente, redeId: string): Promise<string> {
  const ano = Number(hojeISO().slice(0, 4));
  const r = await c.query<{ ultimo: number }>(
    `insert into contadores_protocolo (rede_id, ano, ultimo) values ($1, $2, 1)
     on conflict (rede_id, ano) do update set ultimo = contadores_protocolo.ultimo + 1
     returning ultimo`,
    [redeId, ano],
  );
  return `${ano}-${String(r.rows[0].ultimo).padStart(6, '0')}`;
}

/** Caso que a pessoa pode abrir; senão 404 (inclusive de outra rede, que o banco nem mostra) ou 403 auditado. */
async function casoParaConsulta(c: Cliente, ctx: Contexto, id: string, mensagem403: string) {
  const o = await carregarCaso(c, id);
  if (!o) throw naoEncontrado('Não encontramos este registro.');
  if (!podeAbrir(ctx, await alcance(c, ctx), o)) {
    throw semPermissao(mensagem403).registrar(`caso ${o.protocolo}`, 'perfil sem acesso');
  }
  return o;
}

export function rotasDeRegistro(app: Hono) {
  app.get('/pessoas', (c) =>
    comContexto(c.req.raw.headers, async (db, ctx) => {
      if (!ctx.escolaId) return c.json([]);
      const busca = semAcento(c.req.query('busca') ?? '').trim();
      const r = await db.query('select id, rede_id, escola_id, nome, tipo, turma from pessoas where escola_id = $1 order by nome', [ctx.escolaId]);
      const lista: Pessoa[] = r.rows
        .filter((p) => !busca || semAcento(p.nome).includes(busca) || semAcento(p.turma ?? '').includes(busca))
        .slice(0, 8)
        .map((p) => ({ id: p.id, redeId: p.rede_id, escolaId: p.escola_id, nome: p.nome, tipo: p.tipo, ...(p.turma ? { turma: p.turma } : {}) }));
      return c.json(lista);
    }),
  );

  app.get('/ocorrencias', (c) =>
    comContexto(c.req.raw.headers, async (db, ctx) => {
      if (ctx.vinculo.perfil === 'admin_tecnico') return c.json([]); // administra o serviço, não lê casos
      const r = await db.query(
        `select id, rede_id, escola_id, protocolo, categoria_id, status, prioridade, aberta_em, local, criado_por_id
           from ocorrencias
          where escola_id = any($1) and ($2::text is null or escola_id = $2) and ($3::text is null or criado_por_id = $3)
          order by aberta_em desc`,
        [await alcance(db, ctx), ctx.escolaId, soProprios.includes(ctx.vinculo.perfil) ? ctx.usuario.id : null],
      );
      return c.json(r.rows.map((o) => ({
        id: o.id, redeId: o.rede_id, escolaId: o.escola_id, protocolo: o.protocolo, categoriaId: o.categoria_id,
        status: o.status, prioridade: o.prioridade, abertaEm: o.aberta_em, local: o.local, criadoPorId: o.criado_por_id,
      })));
    }),
  );

  app.get('/ocorrencias-semelhantes', (c) =>
    comContexto(c.req.raw.headers, async (db, ctx) => {
      const data = c.req.query('data') ?? '';
      if (!ctx.escolaId || !/^\d{4}-\d{2}-\d{2}$/.test(data)) return c.json([]);
      const r = await db.query(
        `select id, protocolo, aberta_em, local, categoria_id from ocorrencias
          where escola_id = $1 and fato_data = $2 and categoria_id = $3 order by aberta_em desc`,
        [ctx.escolaId, data, c.req.query('categoriaId') ?? ''],
      );
      const lista: OcorrenciaSemelhante[] = r.rows.map((o) => ({ id: o.id, protocolo: o.protocolo, abertaEm: o.aberta_em, local: o.local, categoriaId: o.categoria_id }));
      return c.json(lista);
    }),
  );

  app.post('/ocorrencias', async (c) => {
    const pedido = await corpo(c, esquemaNovaOcorrencia);
    return comContexto(c.req.raw.headers, async (db, ctx) => {
      if (pedido.escolaId !== ctx.escolaId) throw redeDivergente('O registro precisa ser da escola ativa.');
      const problema = await validar(db, pedido);
      if (problema) throw validacao(problema);

      const redeId = ctx.vinculo.redeId;
      const f = pedido.fato;
      const sensivel = (await db.query<{ sensivel: boolean }>('select sensivel from categorias where id = $1', [f.categoriaId])).rows[0].sensivel;
      const nova = await db.query<{ id: string; protocolo: string }>(
        `insert into ocorrencias (rede_id, escola_id, protocolo, categoria_id, status, prioridade, aberta_em, local, criado_por_id,
                                  criado_por_nome, fato_data, fato_hora, relato, risco_imediato, providencia_imediata)
         values ($1, $2, $3, $4, 'recebido', $5, clock_timestamp(), $6, $7, $8, $9, $10, $11, $12, $13)
         returning id, protocolo`,
        [redeId, pedido.escolaId, await proximoProtocolo(db, redeId), f.categoriaId,
          f.riscoImediato ? 'urgente' : sensivel ? 'alta' : 'media', f.local.trim(), ctx.usuario.id, ctx.usuario.nome,
          f.data, f.hora, f.relato.trim(), f.riscoImediato, f.providenciaImediata.trim()],
      );
      const { id, protocolo } = nova.rows[0];

      for (const [i, e] of pedido.envolvidos.entries()) {
        await db.query(
          `insert into envolvimentos (ocorrencia_id, rede_id, pessoa_id, nome, tipo, turma, papel, visibilidade, ordem)
           values ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
          [id, redeId, e.pessoaId, e.nome, e.tipo, e.turma ?? null, e.papel, e.visibilidade, i],
        );
      }
      // Nesta fase só os metadados do anexo; o arquivo em si entra com o armazenamento privado.
      for (const a of pedido.anexos) {
        await db.query(
          `insert into anexos (rede_id, ocorrencia_id, nome, tamanho_kb, justificativa) values ($1, $2, $3, $4, $5)`,
          [redeId, id, a.nome, Math.round(a.tamanhoKb), a.justificativa.trim()],
        );
      }
      // Providências do protocolo da rede para este tipo de caso.
      await db.query(
        `insert into providencias (id, rede_id, ocorrencia_id, descricao, base, obrigatoria, situacao, ordem)
         select id, rede_id, $1::text, descricao, base, obrigatoria, 'pendente', ordem from regras_protocolo
          where (categoria_ids is null or $2::text = any(categoria_ids)) and (not somente_com_risco or $3::boolean)
          order by ordem`,
        [id, f.categoriaId, f.riscoImediato],
      );
      await novoEvento(db, ctx, id, 'registro',
        f.riscoImediato ? 'Registro criado com risco imediato. A direção foi avisada.' : 'Registro criado e enviado para triagem.');
      await auditar(db, ctx, 'criacao', `caso ${protocolo}`);
      return c.json(paraQuemConsulta(ctx, (await carregarCaso(db, id))!), 201);
    });
  });

  app.get('/ocorrencias/:id', (c) =>
    comContexto(c.req.raw.headers, async (db, ctx) => {
      const o = await casoParaConsulta(db, ctx, c.req.param('id'), 'Seu perfil não tem acesso a este registro.');
      // A tela recarrega o caso sozinha; uma consulta da mesma pessoa ao mesmo caso
      // em 15 minutos conta uma vez só, para a auditoria não virar ruído.
      const recurso = `caso ${o.protocolo}`;
      const recente = await db.query(
        `select 1 from auditoria where acao = 'consulta' and recurso = $1 and ator = $2 and em > now() - interval '15 minutes' limit 1`,
        [recurso, ctx.usuario.nome],
      );
      if (!recente.rowCount) await auditar(db, ctx, 'consulta', recurso);
      return c.json(paraQuemConsulta(ctx, o));
    }),
  );

  app.post('/ocorrencias/:id/adendos', async (c) => {
    const { texto } = await corpo(c, esquemaNovoAdendo, 'O adendo precisa ter pelo menos 10 caracteres.');
    return comContexto(c.req.raw.headers, async (db, ctx) => {
      const o = await casoParaConsulta(db, ctx, c.req.param('id'), 'Seu perfil não pode acrescentar informações a este registro.');
      if (texto.trim().length < 10) throw validacao('O adendo precisa ter pelo menos 10 caracteres.');
      await novoEvento(db, ctx, o.id, 'adendo', texto.trim());
      await auditar(db, ctx, 'alteracao', `caso ${o.protocolo}`, 'permitido', 'adendo');
      return c.json(paraQuemConsulta(ctx, (await carregarCaso(db, o.id))!), 201);
    });
  });

  app.get('/prazos', (c) =>
    comContexto(c.req.raw.headers, async (db, ctx) => {
      const escolas = await alcance(db, ctx);
      const casos = await carregarCasos(db, `o.status <> 'encerrado' and ($1::text is null or o.escola_id = $1)`, [ctx.escolaId]);
      const lista: PrazoProximo[] = casos
        .filter((o) => podeAbrir(ctx, escolas, o))
        .flatMap((o) => o.plano.filter(acaoEmAberto).map((a) => ({ ...a, ocorrenciaId: o.id, protocolo: o.protocolo })))
        .sort((a, b) => a.prazo.localeCompare(b.prazo));
      return c.json(lista.slice(0, 5));
    }),
  );
}
