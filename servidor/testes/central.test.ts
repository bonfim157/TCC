import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import type { CienciaPublica, ItemDaAgenda, ItemDaFila, Ocorrencia } from '@tcc/compartilhado/contrato';
import { naRede } from '../src/banco/conexao';
import { prepararAmbiente } from './preparar';

/* B4: Central de Gestão. Mesmos comportamentos verificados no navegador com a API simulada (f3-central.mjs). */

let amb: Awaited<ReturnType<typeof prepararAmbiente>>;
let ana: Record<string, string>, carlos: Record<string, string>, beatriz: Record<string, string>, joana: Record<string, string>;
beforeAll(async () => {
  amb = await prepararAmbiente();
  ana = await amb.entrar('u-ana', 'rede-sp', 'esc-imsil');
  carlos = await amb.entrar('u-carlos', 'rede-sp', 'esc-imsil');
  beatriz = await amb.entrar('u-beatriz', 'rede-sp', 'esc-imsil');
  joana = await amb.entrar('u-joana', 'rede-sp', 'esc-imsil');
}, 120_000);
afterAll(async () => {
  await amb?.encerrar();
});

const agir = (h: Record<string, string>, caso: string, acao: string, corpo: unknown = {}) =>
  amb.pedir(`/ocorrencias/${caso}/${acao}`, { method: 'POST', cabecalhos: h, body: JSON.stringify(corpo) });
const fila = async (h = carlos) => (await (await amb.pedir('/central/fila', { cabecalhos: h })).json()) as ItemDaFila[];
const item = async (id: string) => (await fila()).find((i) => i.id === id)!;
const futuro = (dias: number) => new Date(Date.now() + dias * 86_400_000).toISOString().slice(0, 10);

describe('fila e agenda', () => {
  test('fila da escola com os sinais de atenção', async () => {
    const f = await fila();
    expect(f).toHaveLength(68);
    const abertos = f.filter((i) => i.status !== 'encerrado');
    expect(abertos.map((i) => i.protocolo).sort()).toEqual(['2026-000481', '2026-000482', '2026-000483', '2026-000484']);
    expect(abertos.filter((i) => i.ctPendente).map((i) => i.protocolo)).toEqual(['2026-000483']);
    expect(abertos.filter((i) => i.devolutivasAtrasadas > 0).map((i) => i.protocolo)).toEqual(['2026-000481']);
    expect(abertos.filter((i) => i.prioridade === 'urgente')).toHaveLength(1);
  });

  test('professora não entra na Central', async () => {
    for (const rota of ['/central/fila', '/central/agenda']) {
      const r = await amb.pedir(rota, { cabecalhos: ana });
      expect(r.status).toBe(403);
    }
  });

  test('agenda em ordem de data, só de casos abertos', async () => {
    const a = (await (await amb.pedir('/central/agenda', { cabecalhos: carlos })).json()) as ItemDaAgenda[];
    expect(a.length).toBeGreaterThan(2);
    expect([...a].sort((x, y) => x.data.localeCompare(y.data))).toEqual(a);
  });

  test('equipe: quem conduz casos nesta escola', async () => {
    const e = (await (await amb.pedir('/equipe', { cabecalhos: carlos })).json()) as { nome: string }[];
    expect(e.map((p) => p.nome).sort()).toEqual(['Beatriz Nunes', 'Carlos Mendes', 'Joana Prado']);
  });
});

describe('ações no caso', () => {
  test('triagem define responsável e muda a situação', async () => {
    const r = await agir(beatriz, 'oc-sp-484', 'triagem', { prioridade: 'baixa', responsavelId: 'u-carlos', categoriaId: 'sp-cat-3', observacao: '' });
    expect(r.status).toBe(200);
    const o = (await r.json()) as Ocorrencia;
    expect(o).toMatchObject({ status: 'em_acompanhamento', responsavelNome: 'Carlos Mendes' });
    expect(o.eventos.at(-1)).toMatchObject({ tipo: 'triagem', autorNome: 'Beatriz Nunes' });
  });

  test('triagem recusa responsável que não conduz casos na escola', async () => {
    const r = await agir(beatriz, 'oc-sp-484', 'triagem', { prioridade: 'baixa', responsavelId: 'u-ana', categoriaId: 'sp-cat-3', observacao: '' });
    expect(r.status).toBe(422);
  });

  test('mudar o tipo na triagem troca as providências pendentes e mantém as já feitas', async () => {
    const antes = (await (await amb.pedir('/ocorrencias/oc-sp-482', { cabecalhos: carlos })).json()) as Ocorrencia;
    const feitas = antes.providencias.filter((p) => p.situacao !== 'pendente').map((p) => p.id);
    const o = (await (await agir(carlos, 'oc-sp-482', 'triagem', { prioridade: 'media', responsavelId: 'u-carlos', categoriaId: 'sp-cat-2', observacao: 'Reclassificado.' })).json()) as Ocorrencia;
    expect(o.categoriaId).toBe('sp-cat-2');
    for (const id of feitas) expect(o.providencias.find((p) => p.id === id)?.situacao).not.toBe('pendente');
    expect(new Set(o.providencias.map((p) => p.id)).size).toBe(o.providencias.length);
  });

  test('dispensar providência exige justificativa', async () => {
    const o = (await (await amb.pedir('/ocorrencias/oc-sp-484', { cabecalhos: carlos })).json()) as Ocorrencia;
    const prov = o.providencias.find((p) => p.obrigatoria && p.situacao === 'pendente')!;
    const sem = await agir(carlos, 'oc-sp-484', `providencias/${prov.id}`, { situacao: 'dispensada', observacao: '' });
    expect(sem.status).toBe(422);
    expect(await sem.json()).toMatchObject({ mensagem: 'Explique por que esta providência não se aplica (pelo menos 15 caracteres).' });
    const com = (await (await agir(carlos, 'oc-sp-484', `providencias/${prov.id}`, { situacao: 'dispensada', observacao: 'Não há estudante identificado neste caso.' })).json()) as Ocorrencia;
    expect(com.providencias.find((p) => p.id === prov.id)).toMatchObject({ situacao: 'dispensada', registradaPor: 'Carlos Mendes' });
  });

  test('ofício ao Conselho Tutelar cumpre a providência, cria o encaminhamento e sai do alerta da fila', async () => {
    expect((await item('oc-sp-483')).ctPendente).toBe(true);
    const r = await agir(beatriz, 'oc-sp-483', 'comunicacoes', {
      tipo: 'conselho_tutelar', destinatario: 'Conselho Tutelar de Limeira',
      texto: 'A direção comunica fatos observados na escola que indicam possível violação de direitos.',
    });
    expect(r.status).toBe(201);
    const o = (await r.json()) as Ocorrencia;
    expect(o.encaminhamentos).toHaveLength(1);
    expect(o.encaminhamentos[0]).toMatchObject({ orgao: 'conselho_tutelar', canal: 'oficio', devolutiva: null });
    expect(o.comunicacoes.at(-1)).toMatchObject({ tipo: 'conselho_tutelar', linkCiencia: null });
    expect((await item('oc-sp-483')).ctPendente).toBe(false);
  });

  test('encaminhamento exige a data da devolutiva; devolutiva registrada tira o atraso', async () => {
    const sem = await agir(carlos, 'oc-sp-484', 'encaminhamentos', { orgao: 'cras', orgaoNome: '', canal: 'telefone', protocoloExterno: '', devolutivaAte: '' });
    expect(sem.status).toBe(422);
    const com = (await (await agir(carlos, 'oc-sp-484', 'encaminhamentos', { orgao: 'cras', orgaoNome: '', canal: 'telefone', protocoloExterno: 'P-1', devolutivaAte: futuro(7) })).json()) as Ocorrencia;
    expect(com.encaminhamentos.at(-1)).toMatchObject({ orgaoNome: 'CRAS', protocoloExterno: 'P-1' });

    expect((await item('oc-sp-481')).devolutivasAtrasadas).toBe(1);
    const caso = (await (await amb.pedir('/ocorrencias/oc-sp-481', { cabecalhos: carlos })).json()) as Ocorrencia;
    const enc = caso.encaminhamentos.find((e) => !e.devolutiva)!;
    const r = await agir(carlos, 'oc-sp-481', `encaminhamentos/${enc.id}/devolutiva`, { texto: 'Conselheira visitou a família; o estudante volta às aulas.' });
    expect(r.status).toBe(200);
    expect((await item('oc-sp-481')).devolutivasAtrasadas).toBe(0);
  });

  test('plano de apoio: incluir e concluir ação', async () => {
    const o = (await (await agir(carlos, 'oc-sp-484', 'plano', { descricao: 'Conversar com a turma', responsavel: 'Coordenação', prazo: futuro(5) })).json()) as Ocorrencia;
    const acao = o.plano.at(-1)!;
    expect(acao).toMatchObject({ descricao: 'Conversar com a turma', situacao: 'no_prazo' });
    const depois = (await (await agir(carlos, 'oc-sp-484', `plano/${acao.id}/concluir`)).json()) as Ocorrencia;
    expect(depois.plano.find((a) => a.id === acao.id)?.situacao).toBe('concluida');
  });

  test('código do sistema da rede (Conviva) fica no caso', async () => {
    const o = (await (await agir(carlos, 'oc-sp-484', 'registro-rede', { codigo: 'Conviva 60001' })).json()) as Ocorrencia;
    expect(o.registroNaRede).toBe('Conviva 60001');
  });

  test('professora não age no caso, nem no próprio; a tentativa fica na auditoria', async () => {
    const r = await agir(ana, 'oc-sp-482', 'registros', { tipo: 'escuta', texto: 'Tentativa de registrar uma escuta sem permissão.' });
    expect(r.status).toBe(403);
    const n = await naRede({ redeId: 'rede-sp' }, async (c) =>
      Number((await c.query(`select count(*) n from auditoria where acao = 'negado' and ator = 'Ana Ribeiro' and detalhe = 'tentativa de alterar sem permissão'`)).rows[0].n));
    expect(n).toBe(1);
  });

  test('caso de outra rede: 404', async () => {
    expect((await agir(carlos, 'oc-rt-483', 'registros', { tipo: 'escuta', texto: 'Tentativa em caso de outra rede.' })).status).toBe(404);
  });
});

describe('comunicação à família e ciência', () => {
  let link = '';

  test('texto que cita outro estudante é recusado e auditado', async () => {
    const r = await agir(carlos, 'oc-sp-482', 'comunicacoes', {
      tipo: 'familia', destinatario: 'Família de Gabriel M.', estudanteId: 'p-gabriel',
      texto: 'Houve uma discussão com Lara T. no pátio durante o intervalo de hoje.',
    });
    expect(r.status).toBe(422);
    expect(await r.json()).toMatchObject({ mensagem: 'O texto cita outro estudante envolvido no caso. Retire o nome antes de enviar à família.' });
    const n = await naRede({ redeId: 'rede-sp' }, async (c) =>
      Number((await c.query(`select count(*) n from auditoria where detalhe = 'comunicação à família citava outro estudante'`)).rows[0].n));
    expect(n).toBe(1);
  });

  test('comunicação válida gera link de ciência; o banco guarda só o hash do token', async () => {
    const r = await agir(carlos, 'oc-sp-482', 'comunicacoes', {
      tipo: 'familia', destinatario: 'Família de Gabriel M.', estudanteId: 'p-gabriel',
      texto: 'Houve uma discussão no pátio durante o intervalo; Gabriel M. foi acolhido pela coordenação.',
    });
    expect(r.status).toBe(201);
    const o = (await r.json()) as Ocorrencia;
    link = o.comunicacoes.at(-1)!.linkCiencia!;
    expect(link).toMatch(/^\/ciencia\/[\w-]{40,}$/);
    const token = link.replace('/ciencia/', '');
    const guardado = await naRede({ redeId: 'rede-sp' }, (c) => c.query(`select token_hash from comunicacoes where link_ciencia = $1`, [link]));
    expect(guardado.rows[0].token_hash).not.toContain(token);
    expect(guardado.rows[0].token_hash).toMatch(/^[0-9a-f]{64}$/);
  });

  test('a família abre o link sem login e vê só a própria comunicação', async () => {
    const r = await amb.pedir(`/ciencia/${link.replace('/ciencia/', '')}`);
    expect(r.status).toBe(200);
    const p = (await r.json()) as CienciaPublica;
    expect(p).toMatchObject({ escola: 'E.E. Irmã Maria de Santo Inocêncio Lima', redeId: 'rede-sp', destinatario: 'Família de Gabriel M.', ciencia: null });
    expect(Object.keys(p).sort()).toEqual(['ciencia', 'destinatario', 'enviadaEm', 'escola', 'rede', 'redeId', 'texto']);
    expect(p.texto).not.toContain('Lara');
  });

  test('confirmar a ciência registra nome e hora, entra na linha do tempo e não se repete', async () => {
    const caminho = `/ciencia/${link.replace('/ciencia/', '')}`;
    expect((await amb.pedir(caminho, { method: 'POST', body: JSON.stringify({ nome: 'A' }) })).status).toBe(422);
    expect((await amb.pedir(caminho, { method: 'POST', body: JSON.stringify({ nome: 'Mãe de Gabriel M.' }) })).status).toBe(200);
    const p = (await (await amb.pedir(caminho)).json()) as CienciaPublica;
    expect(p.ciencia?.nome).toBe('Mãe de Gabriel M.');
    const o = (await (await amb.pedir('/ocorrencias/oc-sp-482', { cabecalhos: carlos })).json()) as Ocorrencia;
    expect(o.eventos.at(-1)?.texto).toBe('Ciência confirmada por Mãe de Gabriel M. (Família de Gabriel M.).');
    expect((await amb.pedir(caminho, { method: 'POST', body: JSON.stringify({ nome: 'Outra pessoa' }) })).status).toBe(409);
  });

  test('link inválido ou vencido: 404', async () => {
    expect((await amb.pedir('/ciencia/nao-existe')).status).toBe(404);
    await naRede({ redeId: 'rede-sp' }, (c) => c.query(`update comunicacoes set token_expira_em = now() - interval '1 day' where link_ciencia = $1`, [link]));
    expect((await amb.pedir(`/ciencia/${link.replace('/ciencia/', '')}`)).status).toBe(404);
  });

  test('link do seed da demonstração funciona', async () => {
    expect((await amb.pedir('/ciencia/demo-482-lara')).status).toBe(200);
  });
});

describe('encerrar', () => {
  test('referente de proteção não encerra', async () => {
    const r = await agir(joana, 'oc-sp-481', 'encerrar', { justificativa: 'Caso resolvido com a família e a rede.', reavaliarEm: null });
    expect(r.status).toBe(403);
  });

  test('providência obrigatória pendente impede o encerramento', async () => {
    const r = await agir(beatriz, 'oc-sp-483', 'encerrar', { justificativa: 'Caso acompanhado pela rede de proteção.', reavaliarEm: null });
    expect(r.status).toBe(409);
    expect(((await r.json()) as { mensagem: string }).mensagem).toMatch(/^Faltam \d+ providências obrigatórias/);
  });

  test('ações do plano em aberto exigem confirmação; confirmando, ficam canceladas', async () => {
    // Caso novo, sem pendências obrigatórias, com uma ação no plano
    const novo = (await (await amb.pedir('/ocorrencias', {
      method: 'POST', cabecalhos: carlos,
      body: JSON.stringify({
        escolaId: 'esc-imsil', envolvidos: [], anexos: [],
        fato: { categoriaId: 'sp-cat-3', data: futuro(0), hora: '09:00', local: 'Quadra', riscoImediato: false, providenciaImediata: '', relato: 'Trave da quadra quebrada durante o intervalo, sem feridos.' },
      }),
    })).json()) as Ocorrencia;
    for (const p of novo.providencias.filter((x) => x.obrigatoria)) {
      await agir(carlos, novo.id, `providencias/${p.id}`, { situacao: 'dispensada', observacao: 'Não se aplica a dano sem estudante envolvido.' });
    }
    await agir(carlos, novo.id, 'plano', { descricao: 'Pedir o conserto da trave', responsavel: 'Direção', prazo: futuro(10) });

    const curta = await agir(carlos, novo.id, 'encerrar', { justificativa: 'ok', reavaliarEm: null });
    expect(curta.status).toBe(422);
    const sem = await agir(carlos, novo.id, 'encerrar', { justificativa: 'Conserto pedido à direção; sem mais ações.', reavaliarEm: null });
    expect(sem.status).toBe(409);
    expect(await sem.json()).toMatchObject({ mensagem: 'Há 1 ação do plano de apoio em aberto. Conclua antes de encerrar ou confirme que ela será cancelada.' });

    const r = await agir(carlos, novo.id, 'encerrar', { justificativa: 'Conserto pedido à direção; sem mais ações.', reavaliarEm: futuro(30), cancelarAcoesAbertas: true });
    expect(r.status).toBe(200);
    const o = (await r.json()) as Ocorrencia;
    expect(o.status).toBe('encerrado');
    expect(o.plano.map((a) => a.situacao)).toEqual(['cancelada']);
    expect(o.encerramento).toMatchObject({ por: 'Carlos Mendes', reavaliarEm: futuro(30) });
    expect(o.eventos.at(-1)?.texto).toContain('Ação do plano cancelada no encerramento: Pedir o conserto da trave.');

    // Encerrado: não aceita mais ações, e só volta à agenda pela reavaliação
    expect((await agir(carlos, novo.id, 'registros', { tipo: 'escuta', texto: 'Tentativa depois do encerramento.' })).status).toBe(409);
    const agenda = (await (await amb.pedir('/central/agenda', { cabecalhos: carlos })).json()) as ItemDaAgenda[];
    expect(agenda.filter((i) => i.ocorrenciaId === novo.id).map((i) => i.tipo)).toEqual(['reavaliacao']);
  });
});
