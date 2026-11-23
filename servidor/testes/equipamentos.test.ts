import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import type { Ocorrencia, OcorrenciaResumo, PedidoDeEquipamento } from '@tcc/compartilhado/contrato';
import { naRede } from '../src/banco/conexao';
import { prepararAmbiente } from './preparar';

/* B7: pedidos de equipamento e correção de adendo pelo autor, com histórico. */

let amb: Awaited<ReturnType<typeof prepararAmbiente>>;
let ana: Record<string, string>, carlos: Record<string, string>, beatriz: Record<string, string>, ti: Record<string, string>;
beforeAll(async () => {
  amb = await prepararAmbiente();
  ana = await amb.entrar('u-ana', 'rede-sp', 'esc-imsil');
  carlos = await amb.entrar('u-carlos', 'rede-sp', 'esc-imsil');
  beatriz = await amb.entrar('u-beatriz', 'rede-sp', 'esc-imsil');
  ti = await amb.entrar('u-ti', 'rede-sp');
}, 120_000);
afterAll(async () => {
  await amb?.encerrar();
});

describe('pedidos de equipamento', () => {
  test('professora pede; a direção vê e responde; a professora vê a resposta no pedido', async () => {
    const criado = await amb.pedir('/equipamentos', {
      method: 'POST', cabecalhos: ana,
      body: JSON.stringify({ item: 'Controle remoto teste', local: 'Sala 3', descricao: 'Sumiu o controle da TV.' }),
    });
    expect(criado.status).toBe(201);
    const pedido = (await criado.json()) as PedidoDeEquipamento;
    expect(pedido.criadoPorId).toBe('u-ana');

    const daCoordenacao = (await (await amb.pedir('/equipamentos', { cabecalhos: carlos })).json()) as PedidoDeEquipamento[];
    expect(daCoordenacao.some((p) => p.id === pedido.id)).toBe(true);

    const resposta = await amb.pedir(`/equipamentos/${pedido.id}/anotacoes`, {
      method: 'POST', cabecalhos: beatriz, body: JSON.stringify({ texto: 'Foi realizado o pedido de um novo controle remoto.' }),
    });
    expect(resposta.status).toBe(200);

    const minha = (await (await amb.pedir('/equipamentos', { cabecalhos: ana })).json()) as PedidoDeEquipamento[];
    expect(minha.find((p) => p.id === pedido.id)?.anotacoes.map((a) => a.texto)).toEqual(['Foi realizado o pedido de um novo controle remoto.']);
  });

  test('professora não responde; equipe de TI não acessa os pedidos', async () => {
    const pedido = (await (await amb.pedir('/equipamentos', { cabecalhos: ana })).json()) as PedidoDeEquipamento[];
    const resposta = await amb.pedir(`/equipamentos/${pedido[0].id}/anotacoes`, {
      method: 'POST', cabecalhos: ana, body: JSON.stringify({ texto: 'Tentativa de resposta pela professora.' }),
    });
    expect(resposta.status).toBe(403);
    expect((await amb.pedir('/equipamentos', { cabecalhos: ti })).status).toBe(403);
  });
});

describe('correção de adendo', () => {
  test('só o autor corrige; a versão anterior fica no histórico e o texto original não muda', async () => {
    const dela = (await (await amb.pedir('/ocorrencias', { cabecalhos: ana })).json()) as OcorrenciaResumo[];
    const id = dela[0].id;
    const comAdendo = await amb.pedir(`/ocorrencias/${id}/adendos`, {
      method: 'POST', cabecalhos: ana, body: JSON.stringify({ texto: 'Adendo original de teste.' }),
    });
    expect(comAdendo.status).toBe(201);
    const adendo = ((await comAdendo.json()) as Ocorrencia).eventos.filter((e) => e.tipo === 'adendo').at(-1)!;
    expect(adendo.autorId).toBe('u-ana');

    const negado = await amb.pedir(`/ocorrencias/${id}/adendos/${adendo.id}/versoes`, {
      method: 'POST', cabecalhos: beatriz, body: JSON.stringify({ texto: 'Tentativa de outra pessoa.' }),
    });
    expect(negado.status).toBe(403);

    const corrigido = await amb.pedir(`/ocorrencias/${id}/adendos/${adendo.id}/versoes`, {
      method: 'POST', cabecalhos: ana, body: JSON.stringify({ texto: 'Adendo corrigido de teste.' }),
    });
    expect(corrigido.status).toBe(200);
    const ev = ((await corrigido.json()) as Ocorrencia).eventos.find((e) => e.id === adendo.id)!;
    expect(ev.texto).toBe('Adendo corrigido de teste.');
    expect(ev.anteriores).toEqual([{ texto: 'Adendo original de teste.', em: expect.any(String) }]);

    const original = await naRede({ redeId: 'rede-sp' }, (c) => c.query('select texto from eventos where id = $1', [adendo.id]));
    expect(original.rows[0].texto).toBe('Adendo original de teste.');
  });

  test('adendo sem autor registrado (antigo) não pode ser corrigido por ninguém', async () => {
    const id = ((await (await amb.pedir('/ocorrencias', { cabecalhos: ana })).json()) as OcorrenciaResumo[])[0].id;
    const antigo = await naRede({ redeId: 'rede-sp' }, (c) => c.query<{ id: string }>(
      `insert into eventos (rede_id, ocorrencia_id, tipo, autor_nome, autor_perfil, texto) values ('rede-sp', $1, 'adendo', 'Ana Ribeiro', 'professor', 'Adendo sem autor.') returning id`,
      [id],
    ));
    const r = await amb.pedir(`/ocorrencias/${id}/adendos/${antigo.rows[0].id}/versoes`, {
      method: 'POST', cabecalhos: ana, body: JSON.stringify({ texto: 'Tentativa de correção do adendo antigo.' }),
    });
    expect(r.status).toBe(403);
  });
});
