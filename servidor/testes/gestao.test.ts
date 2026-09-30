import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import type { Exportacao, RegistroDeAuditoria, RegraDoProtocolo, Relatorio, ResultadoDeBusca } from '@tcc/compartilhado/contrato';
import { prepararAmbiente } from './preparar';

/* B5: busca, relatórios, auditoria e administração. Mesmos comportamentos de f4-gestao.mjs e f4-regional.mjs. */

let amb: Awaited<ReturnType<typeof prepararAmbiente>>;
let h: Record<'ana' | 'carlos' | 'beatriz' | 'marta' | 'paulo' | 'rita' | 'ti', Record<string, string>>;
beforeAll(async () => {
  amb = await prepararAmbiente();
  h = {
    ana: await amb.entrar('u-ana', 'rede-sp', 'esc-imsil'),
    carlos: await amb.entrar('u-carlos', 'rede-sp', 'esc-imsil'),
    beatriz: await amb.entrar('u-beatriz', 'rede-sp', 'esc-imsil'),
    marta: await amb.entrar('u-marta', 'rede-sp'),
    paulo: await amb.entrar('u-paulo', 'rede-sp'),
    rita: await amb.entrar('u-rita', 'rede-teste'),
    ti: await amb.entrar('u-ti', 'rede-sp'),
  };
}, 120_000);
afterAll(async () => {
  await amb?.encerrar();
});

const ler = async <T>(caminho: string, quem: Record<string, string>) => (await (await amb.pedir(caminho, { cabecalhos: quem })).json()) as T;
const enviar = (metodo: string, caminho: string, quem: Record<string, string>, corpo: unknown) =>
  amb.pedir(caminho, { method: metodo, cabecalhos: quem, body: JSON.stringify(corpo) });

describe('busca', () => {
  test('coordenação encontra os casos da escola e filtra por tipo', async () => {
    expect(await ler<ResultadoDeBusca[]>('/busca?de=&ate=&categoriaId=&status=&prioridade=&texto=', h.carlos)).toHaveLength(68);
    const bullying = await ler<ResultadoDeBusca[]>('/busca?categoriaId=sp-cat-2', h.carlos);
    expect(bullying).toHaveLength(10);
    expect(bullying.every((o) => o.podeAbrir && o.escolaNome === 'IMSIL')).toBe(true);
  });

  test('busca por local ignora acentos; por protocolo também', async () => {
    const patio = await ler<ResultadoDeBusca[]>('/busca?texto=patio', h.carlos);
    expect(patio.length).toBeGreaterThan(0);
    expect(patio.every((o) => o.local === 'Pátio')).toBe(true);
    expect((await ler<ResultadoDeBusca[]>('/busca?texto=000483', h.carlos)).map((o) => o.protocolo)).toEqual(['2026-000483']);
  });

  test('regional vê a lista, mas não pode abrir nenhum caso', async () => {
    const r = await ler<ResultadoDeBusca[]>('/busca', h.marta);
    expect(r).toHaveLength(68);
    expect(r.some((o) => o.podeAbrir)).toBe(false);
  });

  test('regional com duas escolas vê as duas, e nada de outra rede', async () => {
    const r = await ler<ResultadoDeBusca[]>('/busca', h.rita);
    expect(r).toHaveLength(23);
    expect([...new Set(r.map((o) => o.escolaNome))].sort()).toEqual(['Escola Fictícia de Testes', 'Segunda Escola Fictícia']);
    expect(r.every((o) => o.redeId === 'rede-teste')).toBe(true);
  });

  test('professora e secretaria não buscam casos; a recusa fica na auditoria', async () => {
    expect((await amb.pedir('/busca', { cabecalhos: h.ana })).status).toBe(403);
    expect((await amb.pedir('/busca', { cabecalhos: h.paulo })).status).toBe(403);
    const aud = await ler<RegistroDeAuditoria[]>('/auditoria', h.paulo);
    expect(aud.some((a) => a.acao === 'negado' && a.recurso === 'busca' && a.ator === 'Ana Ribeiro')).toBe(true);
  });
});

describe('relatório', () => {
  test('regional de SP: total da regional e grupos pequenos suprimidos', async () => {
    const r = await ler<Relatorio>('/relatorios?de=2026-01-01&ate=2026-12-31&escolaId=&categoriaId=', h.marta);
    expect(r).toMatchObject({ total: 68, escopo: 'Unidade Regional de Ensino de Limeira', limiteMinimo: 3, porEscola: [] });
    const suprimidos = [...r.porCategoria, ...r.porMes, ...r.porSituacao].filter((g) => g.total === null);
    expect(suprimidos).toHaveLength(5);
    // Nenhum grupo mostra um número menor que o limite
    expect([...r.porCategoria, ...r.porMes, ...r.porSituacao].every((g) => g.total === null || g.total >= 3)).toBe(true);
  });

  test('regional com duas escolas recebe a quebra por escola', async () => {
    const r = await ler<Relatorio>('/relatorios', h.rita);
    expect(r.escopo).toBe('Regional Fictícia');
    expect(r.porEscola.map((e) => [e.rotulo, e.total])).toEqual([['Escola Fictícia de Testes', 14], ['Segunda Escola Fictícia', 9]]);
  });

  test('direção vê o relatório da própria escola; coordenação não acessa', async () => {
    expect((await ler<Relatorio>('/relatorios', h.beatriz)).escopo).toBe('E.E. Irmã Maria de Santo Inocêncio Lima');
    expect((await amb.pedir('/relatorios', { cabecalhos: h.carlos })).status).toBe(403);
  });

  test('exportar exige motivo, devolve o CSV com a mesma supressão e fica na auditoria', async () => {
    const pedido = { motivo: '', de: '2026-01-01', ate: '2026-12-31', escolaId: '', somenteCategoriaId: '' };
    const sem = await enviar('POST', '/exportacoes', h.marta, pedido);
    expect(sem.status).toBe(422);
    const motivo = 'Relatório bimestral para a reunião da regional.';
    const r = await enviar('POST', '/exportacoes', h.marta, { ...pedido, motivo });
    expect(r.status).toBe(201);
    const x = (await r.json()) as Exportacao;
    expect(x.nomeArquivo).toMatch(/^relatorio-ocorrencias-\d{4}-\d{2}-\d{2}\.csv$/);
    expect(x.conteudoCsv).toContain('"menos de 3"');
    expect(x.conteudoCsv).not.toMatch(/;"[12]"(\r|$)/m);
    const aud = await ler<RegistroDeAuditoria[]>('/auditoria', h.paulo);
    expect(aud.find((a) => a.acao === 'exportacao')).toMatchObject({ ator: 'Marta Siqueira', detalhe: motivo });
  });
});

describe('auditoria', () => {
  test('secretaria vê a rede; direção vê quem atua na sua escola; professora não vê', async () => {
    const rede = await ler<RegistroDeAuditoria[]>('/auditoria', h.paulo);
    expect(rede.some((a) => a.ator === 'Marta Siqueira')).toBe(true);
    expect(rede.every((a) => a.redeId === 'rede-sp')).toBe(true);
    const escola = await ler<RegistroDeAuditoria[]>('/auditoria', h.beatriz);
    expect(escola.some((a) => a.ator === 'Carlos Mendes')).toBe(true);
    expect(escola.some((a) => a.ator === 'Marta Siqueira' || a.ator === 'Paulo Arantes')).toBe(false);
    expect((await amb.pedir('/auditoria', { cabecalhos: h.ana })).status).toBe(403);
  });

  test('a auditoria da rede SP não traz nada da rede de testes', async () => {
    const rede = await ler<RegistroDeAuditoria[]>('/auditoria', h.paulo);
    expect(rede.some((a) => a.ator === 'Rita Moraes')).toBe(false);
  });
});

describe('administração', () => {
  test('secretaria altera o protocolo; direção só consulta', async () => {
    const regras = await ler<RegraDoProtocolo[]>('/admin/regras', h.beatriz);
    expect(regras.length).toBeGreaterThan(5);
    const plano = regras.find((r) => r.id === 'sp-plano')!;
    expect((await enviar('PUT', `/admin/regras/${plano.id}`, h.beatriz, { obrigatoria: true })).status).toBe(403);
    const r = await enviar('PUT', `/admin/regras/${plano.id}`, h.paulo, { obrigatoria: !plano.obrigatoria });
    expect(r.status).toBe(200);
    expect(((await r.json()) as RegraDoProtocolo).obrigatoria).toBe(!plano.obrigatoria);
    expect((await enviar('PUT', `/admin/regras/${plano.id}`, h.paulo, { descricao: 'curta' })).status).toBe(422);
    // Regra de outra rede não existe para esta
    expect((await enviar('PUT', '/admin/regras/rt-plano', h.paulo, { obrigatoria: true })).status).toBe(404);
  });

  test('a regra alterada vale para os próximos casos da rede', async () => {
    await enviar('PUT', '/admin/regras/sp-plano', h.paulo, { descricao: 'Definir plano de apoio com a família e a coordenação' });
    const novo = await enviar('POST', '/ocorrencias', h.carlos, {
      escolaId: 'esc-imsil', envolvidos: [], anexos: [],
      fato: { categoriaId: 'sp-cat-1', data: new Date(Date.now() - 3 * 3600_000).toISOString().slice(0, 10), hora: '08:00', local: 'Pátio', riscoImediato: false, providenciaImediata: '', relato: 'Discussão entre dois estudantes na entrada da escola.' },
    });
    const caso = (await novo.json()) as { providencias: { id: string; descricao: string }[] };
    expect(caso.providencias.find((p) => p.id === 'sp-plano')?.descricao).toBe('Definir plano de apoio com a família e a coordenação');
  });

  test('tipos e modelos: só a secretaria; modelo precisa do campo {estudante}', async () => {
    expect((await enviar('PUT', '/admin/categorias/sp-cat-9', h.beatriz, { ativa: false })).status).toBe(403);
    const c = await enviar('PUT', '/admin/categorias/sp-cat-9', h.paulo, { ativa: false });
    expect(await c.json()).toMatchObject({ id: 'sp-cat-9', ativa: false });
    expect((await enviar('PUT', '/admin/modelos/rede-sp-mod-familia', h.paulo, { texto: 'Sem o campo obrigatório.' })).status).toBe(422);
    const m = await enviar('PUT', '/admin/modelos/rede-sp-mod-familia', h.paulo, { texto: 'Prezada família de {estudante}, a escola informa: {resumo}' });
    expect(m.status).toBe(200);
  });

  test('contatos e pessoas da escola: só a direção altera', async () => {
    const novos = { conselhoTutelar: 'Conselho Tutelar de Limeira, sede central', cras: 'CRAS', creas: 'CREAS', delegacia: 'DP', saude: 'UBS' };
    expect((await enviar('PUT', '/admin/contatos', h.carlos, novos)).status).toBe(403);
    expect(await (await enviar('PUT', '/admin/contatos', h.beatriz, novos)).json()).toMatchObject({ escolaId: 'esc-imsil', conselhoTutelar: novos.conselhoTutelar });
    expect(await ler('/admin/contatos', h.carlos)).toMatchObject({ conselhoTutelar: novos.conselhoTutelar });

    expect((await enviar('POST', '/admin/pessoas', h.beatriz, { nome: 'Bruno K.', tipo: 'estudante' })).status).toBe(422);
    const p = await enviar('POST', '/admin/pessoas', h.beatriz, { nome: 'Bruno K.', tipo: 'estudante', turma: '6º ano A' });
    expect(p.status).toBe(201);
    const achado = await ler<{ nome: string }[]>('/pessoas?busca=bruno', h.ana);
    expect(achado.map((x) => x.nome)).toEqual(['Bruno K.']);
    expect((await enviar('POST', '/admin/pessoas', h.paulo, { nome: 'Outra', tipo: 'outro' })).status).toBe(403);
  });

  test('usuários: secretaria vê a rede; direção, a escola; administração técnica também consulta', async () => {
    const rede = await ler<{ nome: string }[]>('/admin/usuarios', h.paulo);
    expect(rede.map((u) => u.nome)).toContain('Marta Siqueira');
    expect(rede.map((u) => u.nome)).not.toContain('Rita Moraes');
    const escola = await ler<{ nome: string; escolas: string[] }[]>('/admin/usuarios', h.beatriz);
    expect(escola.map((u) => u.nome)).not.toContain('Marta Siqueira');
    expect(escola.every((u) => u.escolas.includes('IMSIL'))).toBe(true);
    expect((await amb.pedir('/admin/usuarios', { cabecalhos: h.ti })).status).toBe(200);
    expect((await amb.pedir('/admin/usuarios', { cabecalhos: h.ana })).status).toBe(403);
  });
});
