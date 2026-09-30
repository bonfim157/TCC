import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import type { Ocorrencia, OcorrenciaResumo } from '@tcc/compartilhado/contrato';
import { naRede } from '../src/banco/conexao';
import { prepararAmbiente } from './preparar';

/* B3: registro e acompanhamento. Mesmos comportamentos verificados no navegador com a API simulada (f2-registro.mjs). */

let amb: Awaited<ReturnType<typeof prepararAmbiente>>;
let ana: Record<string, string>, carlos: Record<string, string>, beatriz: Record<string, string>;
beforeAll(async () => {
  amb = await prepararAmbiente();
  ana = await amb.entrar('u-ana', 'rede-sp', 'esc-imsil');
  carlos = await amb.entrar('u-carlos', 'rede-sp', 'esc-imsil');
  beatriz = await amb.entrar('u-beatriz', 'rede-sp', 'esc-imsil');
}, 120_000);
afterAll(async () => {
  await amb?.encerrar();
});

const hoje = () => new Date(Date.now() - 3 * 3600_000).toISOString().slice(0, 10);
const novo = (mudancas: Record<string, unknown> = {}, fato: Record<string, unknown> = {}) => ({
  escolaId: 'esc-imsil',
  fato: {
    categoriaId: 'sp-cat-1', data: hoje(), hora: '10:00', local: 'Pátio', riscoImediato: false, providenciaImediata: '',
    relato: 'Dois estudantes discutiram no intervalo e foram separados pela inspetora.', ...fato,
  },
  envolvidos: [
    { pessoaId: 'p-gabriel', nome: 'Gabriel M.', tipo: 'estudante', turma: '7º ano B', papel: 'envolvido_direto', visibilidade: 'coordenacao_direcao' },
    { pessoaId: 'p-davi', nome: 'Davi R.', tipo: 'estudante', turma: '8º ano A', papel: 'afetado', visibilidade: 'somente_direcao' },
  ],
  anexos: [],
  ...mudancas,
});
const registrar = (h: Record<string, string>, corpo: unknown) => amb.pedir('/ocorrencias', { method: 'POST', cabecalhos: h, body: JSON.stringify(corpo) });
const auditoria = (filtro: string) =>
  naRede({ redeId: 'rede-sp' }, async (c) => Number((await c.query(`select count(*) n from auditoria where ${filtro}`)).rows[0].n));

describe('listar', () => {
  test('professora vê só os próprios registros; coordenação vê os da escola', async () => {
    const dela = (await (await amb.pedir('/ocorrencias', { cabecalhos: ana })).json()) as OcorrenciaResumo[];
    expect(dela.length).toBeGreaterThan(0);
    expect(dela.every((o) => o.criadoPorId === 'u-ana')).toBe(true);
    const daEscola = (await (await amb.pedir('/ocorrencias', { cabecalhos: carlos })).json()) as OcorrenciaResumo[];
    expect(daEscola).toHaveLength(68);
    expect(daEscola.every((o) => o.redeId === 'rede-sp')).toBe(true);
  });

  test('administração técnica não lê casos', async () => {
    const ti = await amb.entrar('u-ti', 'rede-sp');
    expect(await (await amb.pedir('/ocorrencias', { cabecalhos: ti })).json()).toEqual([]);
  });

  test('busca de pessoas ignora acentos e fica na escola ativa', async () => {
    const r = (await (await amb.pedir('/pessoas?busca=heloisa', { cabecalhos: ana })).json()) as { nome: string }[];
    expect(r.map((p) => p.nome)).toEqual(['Heloísa C.']);
    const outra = await amb.entrar('u-ana', 'rede-teste', 'esc-teste');
    const t = (await (await amb.pedir('/pessoas?busca=', { cabecalhos: outra })).json()) as { nome: string }[];
    expect(t.every((p) => p.nome.startsWith('Estudante Fictício'))).toBe(true);
  });
});

describe('registrar', () => {
  test('gera o próximo protocolo, a linha do tempo e as providências do protocolo da rede', async () => {
    const r = await registrar(ana, novo());
    expect(r.status).toBe(201);
    const caso = (await r.json()) as Ocorrencia;
    expect(caso.protocolo).toBe(`${hoje().slice(0, 4)}-000485`);
    expect(caso).toMatchObject({ status: 'recebido', prioridade: 'media', criadoPorNome: 'Ana Ribeiro', responsavelId: null });
    expect(caso.eventos.map((e) => e.tipo)).toEqual(['registro']);
    // A autora vê os nomes que escreveu, mas não as providências da gestão
    expect(caso.envolvidos.map((e) => e.nome)).toEqual(['Gabriel M.', 'Davi R.']);
    expect(caso.providencias).toEqual([]);

    const gestao = (await (await amb.pedir(`/ocorrencias/${caso.id}`, { cabecalhos: carlos })).json()) as Ocorrencia;
    expect(gestao.providencias.length).toBeGreaterThan(2);
    expect(gestao.providencias.every((p) => p.situacao === 'pendente')).toBe(true);
    // Coordenação não vê o nome marcado como "somente direção"
    expect(gestao.envolvidos.map((e) => e.nome)).toEqual(['Gabriel M.', 'Pessoa com visibilidade restrita']);
    expect(await auditoria(`acao = 'criacao' and recurso = 'caso ${caso.protocolo}'`)).toBe(1);
  });

  test('a numeração segue sem repetir', async () => {
    const a = (await (await registrar(ana, novo())).json()) as Ocorrencia;
    const b = (await (await registrar(carlos, novo())).json()) as Ocorrencia;
    expect(Number(b.protocolo.slice(5))).toBe(Number(a.protocolo.slice(5)) + 1);
  });

  test('risco imediato nasce urgente; tipo sensível nasce com prioridade alta', async () => {
    const risco = (await (await registrar(ana, novo({}, { riscoImediato: true }))).json()) as Ocorrencia;
    expect(risco.prioridade).toBe('urgente');
    expect(risco.eventos[0].texto).toContain('risco imediato');
    const sensivel = (await (await registrar(ana, novo({}, { categoriaId: 'sp-cat-8' }))).json()) as Ocorrencia;
    expect(sensivel.prioridade).toBe('alta');
  });

  test.each([
    [{ relato: 'curto' }, 'O relato precisa ter pelo menos 20 caracteres.'],
    [{ categoriaId: 'rt-cat-1' }, 'Escolha a categoria.'], // categoria de outra rede não existe para esta
    [{ data: '2999-01-01' }, 'A data do fato não pode estar no futuro.'],
    [{ hora: '' }, 'Informe o horário aproximado.'],
    [{ local: '  ' }, 'Informe o local.'],
  ])('recusa com a mensagem certa: %j', async (fato, mensagem) => {
    const r = await registrar(ana, novo({}, fato));
    expect(r.status).toBe(422);
    expect(await r.json()).toEqual({ codigo: 'validacao', mensagem });
  });

  test('registro precisa ser da escola ativa', async () => {
    const r = await registrar(ana, novo({ escolaId: 'esc-teste' }));
    expect(r.status).toBe(403);
    expect(await r.json()).toMatchObject({ codigo: 'rede_divergente' });
  });

  test('aviso de possível duplicata: mesmo dia e mesmo tipo na escola', async () => {
    const r = await amb.pedir(`/ocorrencias-semelhantes?data=${hoje()}&categoriaId=sp-cat-1`, { cabecalhos: ana });
    expect(((await r.json()) as unknown[]).length).toBeGreaterThan(0);
    const nada = await amb.pedir(`/ocorrencias-semelhantes?data=2020-01-01&categoriaId=sp-cat-1`, { cabecalhos: ana });
    expect(await nada.json()).toEqual([]);
  });
});

describe('abrir o caso', () => {
  test('professora não abre caso de outra pessoa, e a tentativa fica na auditoria', async () => {
    const antes = await auditoria(`acao = 'negado' and ator = 'Ana Ribeiro'`);
    const r = await amb.pedir('/ocorrencias/oc-sp-483', { cabecalhos: ana });
    expect(r.status).toBe(403);
    expect(await r.json()).toEqual({ codigo: 'sem_permissao', mensagem: 'Seu perfil não tem acesso a este registro.' });
    expect(await auditoria(`acao = 'negado' and ator = 'Ana Ribeiro'`)).toBe(antes + 1);
  });

  test('nome restrito: coordenação não vê, direção vê', async () => {
    const c = (await (await amb.pedir('/ocorrencias/oc-sp-483', { cabecalhos: carlos })).json()) as Ocorrencia;
    expect(c.envolvidos.map((e) => e.nome)).toEqual(['Pessoa com visibilidade restrita']);
    expect(c.envolvidos[0].restrito).toBe(true);
    const d = (await (await amb.pedir('/ocorrencias/oc-sp-483', { cabecalhos: beatriz })).json()) as Ocorrencia;
    expect(d.envolvidos.map((e) => e.nome)).toEqual(['Davi R.']);
  });

  test('caso de outra rede: 404, como se não existisse', async () => {
    const r = await amb.pedir('/ocorrencias/oc-rt-482', { cabecalhos: carlos });
    expect(r.status).toBe(404);
  });

  test('regional não abre caso', async () => {
    const marta = await amb.entrar('u-marta', 'rede-sp');
    expect((await amb.pedir('/ocorrencias/oc-sp-482', { cabecalhos: marta })).status).toBe(403);
  });

  test('consultas repetidas ao mesmo caso contam uma vez na auditoria', async () => {
    for (let i = 0; i < 3; i++) await amb.pedir('/ocorrencias/oc-sp-481', { cabecalhos: beatriz });
    expect(await auditoria(`acao = 'consulta' and recurso = 'caso 2026-000481' and ator = 'Beatriz Nunes'`)).toBe(1);
  });

  test('o caso volta no formato do contrato', async () => {
    const o = (await (await amb.pedir('/ocorrencias/oc-sp-482', { cabecalhos: carlos })).json()) as Ocorrencia;
    expect(o).toMatchObject({ protocolo: '2026-000482', registroNaRede: 'Conviva 58213', fato: { data: '2026-09-25' } });
    expect(o.abertaEm).toMatch(/^2026-09-25T\d\d:\d\d:\d\d-03:00$/);
    expect(o.plano.map((a) => a.id)).toEqual(['a1', 'a2']);
    expect(o.comunicacoes.some((m) => m.linkCiencia === '/ciencia/demo-482-lara')).toBe(true);
  });
});

describe('adendo e prazos', () => {
  test('adendo curto é recusado; adendo válido entra na linha do tempo', async () => {
    const curto = await amb.pedir('/ocorrencias/oc-sp-482/adendos', { method: 'POST', cabecalhos: ana, body: JSON.stringify({ texto: 'oi' }) });
    expect(curto.status).toBe(422);
    const r = await amb.pedir('/ocorrencias/oc-sp-482/adendos', { method: 'POST', cabecalhos: ana, body: JSON.stringify({ texto: 'A discussão começou na fila da cantina.' }) });
    expect(r.status).toBe(201);
    const o = (await r.json()) as Ocorrencia;
    expect(o.eventos.at(-1)).toMatchObject({ tipo: 'adendo', autorNome: 'Ana Ribeiro', texto: 'A discussão começou na fila da cantina.' });
  });

  test('prazos próximos: ações abertas dos casos que a pessoa pode abrir, por data', async () => {
    const r = (await (await amb.pedir('/prazos', { cabecalhos: carlos })).json()) as { prazo: string; protocolo: string }[];
    expect(r.length).toBeGreaterThan(1);
    expect([...r].sort((a, b) => a.prazo.localeCompare(b.prazo))).toEqual(r);
  });
});
