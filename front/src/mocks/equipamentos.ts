import { delay, http } from 'msw';
import type { NovaAnotacaoDePedido, NovoPedidoDeEquipamento, Perfil, PedidoDeEquipamento } from '../api/contract';
import { auditar, contexto, erro, json, persistir } from './base';
import { pedidosDeEquipamento } from './seed';

/* Pedidos de equipamento e espaço. Espelha servidor/src/rotas/equipamentos.ts. */

/** Quem pode pedir: o dia a dia da escola. */
const podeSolicitar = (p: Perfil) => ['professor', 'apoio', 'coordenacao', 'direcao'].includes(p);
/** Quem responde e vê todos os pedidos da escola. */
const podeAnotar = (p: Perfil) => p === 'coordenacao' || p === 'direcao';

export const handlersEquipamentos = [
  http.get('/api/equipamentos', async ({ request }) => {
    await delay(250);
    const ctx = contexto(request);
    if (ctx instanceof Response) return ctx;
    if (!podeSolicitar(ctx.vinculo.perfil)) return erro(403, 'sem_permissao', 'Seu perfil não acessa os pedidos de equipamento.');
    if (!ctx.escolaId) return json([]);
    const lista = pedidosDeEquipamento
      .filter((p) => p.escolaId === ctx.escolaId && (podeAnotar(ctx.vinculo.perfil) || p.criadoPorId === ctx.usuario.id))
      .sort((a, b) => Date.parse(b.criadoEm) - Date.parse(a.criadoEm));
    return json(lista);
  }),

  http.post('/api/equipamentos', async ({ request }) => {
    await delay(400);
    const ctx = contexto(request);
    if (ctx instanceof Response) return ctx;
    if (!podeSolicitar(ctx.vinculo.perfil) || !ctx.escolaId) return erro(403, 'sem_permissao', 'Seu perfil não pode pedir equipamentos nesta escola.');
    const n = (await request.json()) as NovoPedidoDeEquipamento;
    const item = n.item?.trim() ?? '';
    const local = n.local?.trim() ?? '';
    const descricao = n.descricao?.trim() ?? '';
    if (!item || !local || !descricao) return erro(422, 'validacao', 'Informe o item, o local e o que está acontecendo.');
    const novo: PedidoDeEquipamento = {
      id: `eq-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      redeId: ctx.vinculo.redeId, escolaId: ctx.escolaId, criadoPorId: ctx.usuario.id, criadoPorNome: ctx.usuario.nome,
      criadoEm: new Date().toISOString(), item, local, descricao, anotacoes: [],
    };
    pedidosDeEquipamento.unshift(novo);
    persistir();
    auditar(ctx, 'criacao', 'pedido de equipamento', 'permitido', item);
    return json(novo, 201);
  }),

  http.post('/api/equipamentos/:id/anotacoes', async ({ request, params }) => {
    await delay(400);
    const ctx = contexto(request);
    if (ctx instanceof Response) return ctx;
    if (!podeAnotar(ctx.vinculo.perfil)) return erro(403, 'sem_permissao', 'Só a coordenação ou a direção responde aos pedidos.');
    const pedido = pedidosDeEquipamento.find((p) => p.id === params.id && p.escolaId === ctx.escolaId);
    if (!pedido) return erro(404, 'nao_encontrado', 'Não encontramos este pedido.');
    const { texto } = (await request.json()) as NovaAnotacaoDePedido;
    if (!texto?.trim()) return erro(422, 'validacao', 'Escreva a resposta.');
    pedido.anotacoes.push({ id: `eqa-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, autorNome: ctx.usuario.nome, em: new Date().toISOString(), texto: texto.trim() });
    persistir();
    auditar(ctx, 'alteracao', 'pedido de equipamento', 'permitido', pedido.item);
    return json(pedido);
  }),
];
