import type { Hono } from 'hono';
import type { PedidoDeEquipamento, Perfil } from '@tcc/compartilhado/contrato';
import { esquemaNovaAnotacaoDePedido, esquemaNovoPedidoDeEquipamento } from '@tcc/compartilhado/esquemas';
import type { Cliente } from '../banco/conexao';
import { auditar, comContexto } from '../contexto';
import { naoEncontrado, semPermissao, validacao } from '../erros';
import { corpo } from '../util';

/* Pedidos de equipamento e espaço (B7). Espelha front/src/mocks/equipamentos.ts. */

/** Quem pode pedir: o dia a dia da escola. */
const podeSolicitar = (p: Perfil) => ['professor', 'apoio', 'coordenacao', 'direcao'].includes(p);
/** Quem responde e vê todos os pedidos da escola. */
const podeAnotar = (p: Perfil) => p === 'coordenacao' || p === 'direcao';

type Linha = {
  id: string; rede_id: string; escola_id: string; criado_por_id: string; criado_por_nome: string; criado_em: string;
  item: string; local: string; descricao: string;
};

/** Monta os pedidos com as anotações, em duas consultas no total. */
async function montar(db: Cliente, linhas: Linha[]): Promise<PedidoDeEquipamento[]> {
  if (linhas.length === 0) return [];
  const anotacoes = await db.query<{ id: string; pedido_id: string; autor_nome: string; em: string; texto: string }>(
    'select id, pedido_id, autor_nome, em, texto from anotacoes_equipamento where pedido_id = any($1) order by em',
    [linhas.map((l) => l.id)],
  );
  return linhas.map((l) => ({
    id: l.id, redeId: l.rede_id, escolaId: l.escola_id, criadoPorId: l.criado_por_id, criadoPorNome: l.criado_por_nome,
    criadoEm: l.criado_em, item: l.item, local: l.local, descricao: l.descricao,
    anotacoes: anotacoes.rows
      .filter((a) => a.pedido_id === l.id)
      .map((a) => ({ id: a.id, autorNome: a.autor_nome, em: a.em, texto: a.texto })),
  }));
}

const COLUNAS = 'id, rede_id, escola_id, criado_por_id, criado_por_nome, criado_em, item, local, descricao';

export function rotasDeEquipamentos(app: Hono) {
  app.get('/equipamentos', (c) =>
    comContexto(c.req.raw.headers, async (db, ctx) => {
      if (!podeSolicitar(ctx.vinculo.perfil)) throw semPermissao('Seu perfil não acessa os pedidos de equipamento.').registrar('equipamentos', 'perfil sem acesso');
      if (!ctx.escolaId) return c.json([]);
      // Quem só pede vê os próprios pedidos; a gestão vê os da escola.
      const r = await db.query<Linha>(
        `select ${COLUNAS} from pedidos_equipamento
          where escola_id = $1 and ($2::text is null or criado_por_id = $2)
          order by criado_em desc`,
        [ctx.escolaId, podeAnotar(ctx.vinculo.perfil) ? null : ctx.usuario.id],
      );
      return c.json(await montar(db, r.rows));
    }),
  );

  app.post('/equipamentos', (c) =>
    comContexto(c.req.raw.headers, async (db, ctx) => {
      if (!podeSolicitar(ctx.vinculo.perfil) || !ctx.escolaId) {
        throw semPermissao('Seu perfil não pode pedir equipamentos nesta escola.').registrar('equipamentos', 'perfil sem acesso');
      }
      const n = await corpo(c, esquemaNovoPedidoDeEquipamento, 'Informe o item, o local e o que está acontecendo.');
      const item = n.item.trim();
      const local = n.local.trim();
      const descricao = n.descricao.trim();
      if (!item || !local || !descricao) throw validacao('Informe o item, o local e o que está acontecendo.');
      const r = await db.query<Linha>(
        `insert into pedidos_equipamento (rede_id, escola_id, criado_por_id, criado_por_nome, item, local, descricao)
         values ($1, $2, $3, $4, $5, $6, $7) returning ${COLUNAS}`,
        [ctx.vinculo.redeId, ctx.escolaId, ctx.usuario.id, ctx.usuario.nome, item, local, descricao],
      );
      await auditar(db, ctx, 'criacao', 'pedido de equipamento', 'permitido', item);
      return c.json((await montar(db, r.rows))[0], 201);
    }),
  );

  app.post('/equipamentos/:id/anotacoes', (c) =>
    comContexto(c.req.raw.headers, async (db, ctx) => {
      if (!podeAnotar(ctx.vinculo.perfil)) {
        throw semPermissao('Só a coordenação ou a direção responde aos pedidos.').registrar('equipamentos', 'perfil sem acesso');
      }
      const r = await db.query<Linha>(`select ${COLUNAS} from pedidos_equipamento where id = $1 and escola_id = $2`, [c.req.param('id'), ctx.escolaId]);
      if (!r.rows[0]) throw naoEncontrado('Não encontramos este pedido.');
      const { texto } = await corpo(c, esquemaNovaAnotacaoDePedido, 'Escreva a resposta.');
      if (!texto.trim()) throw validacao('Escreva a resposta.');
      await db.query(
        `insert into anotacoes_equipamento (rede_id, pedido_id, autor_id, autor_nome, texto) values ($1, $2, $3, $4, $5)`,
        [ctx.vinculo.redeId, r.rows[0].id, ctx.usuario.id, ctx.usuario.nome, texto.trim()],
      );
      await auditar(db, ctx, 'alteracao', 'pedido de equipamento', 'permitido', r.rows[0].item);
      return c.json((await montar(db, r.rows))[0]);
    }),
  );
}
