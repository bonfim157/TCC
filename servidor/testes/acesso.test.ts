import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import type { RespostaEntrar } from '@tcc/compartilhado/contrato';
import { acessoDemo } from '@tcc/compartilhado/seed';
import { naRede } from '../src/banco/conexao';
import { codigoTotp } from '../src/totp';
import { prepararAmbiente } from './preparar';

/* B2: login real (senha, segundo fator, sessão em cookie) e a tabela de acesso perfil × rota. */

let amb: Awaited<ReturnType<typeof prepararAmbiente>>;
beforeAll(async () => {
  amb = await prepararAmbiente();
}, 120_000);
afterAll(async () => {
  await amb?.encerrar();
});

const json = (corpo: unknown, cookie?: string) => ({
  method: 'POST', body: JSON.stringify(corpo), cabecalhos: cookie ? { cookie } : undefined,
});
const cookieDe = (r: Response) => r.headers.get('set-cookie')?.split(';')[0] ?? '';
const entrar = (email: string, senha = acessoDemo.senha) => amb.pedir('/entrar', json({ email, senha }));
const auditoria = (filtro: string) =>
  naRede({ redeId: 'rede-sp' }, async (c) => Number((await c.query(`select count(*) n from auditoria where ${filtro}`)).rows[0].n));

describe('senha', () => {
  test('professora entra só com a senha; a sessão vem em cookie HttpOnly, não no corpo', async () => {
    const r = await entrar('ana@demo.tcc');
    expect(r.status).toBe(200);
    const corpo = (await r.json()) as RespostaEntrar;
    expect(corpo).toMatchObject({ etapa: 'pronto', usuario: { nome: 'Ana Ribeiro' } });
    expect(JSON.stringify(corpo)).not.toMatch(/token/);
    const cabecalho = r.headers.get('set-cookie')!;
    expect(cabecalho).toMatch(/^sessao=[\w-]{40,}; HttpOnly; SameSite=Lax; Path=\/; Max-Age=28800/);

    // O cookie basta para usar a API
    const escolas = await amb.pedir('/escolas', { cabecalhos: { cookie: cookieDe(r), 'x-rede-id': 'rede-sp' } });
    expect(escolas.status).toBe(200);
    expect(await auditoria(`acao = 'login' and ator = 'Ana Ribeiro'`)).toBe(1);
  });

  test('e-mail em maiúsculas e com espaços entra igual', async () => {
    expect((await entrar('  ANA@Demo.TCC ')).status).toBe(200);
  });

  test('senha errada e e-mail inexistente dão a mesma resposta', async () => {
    const errada = await entrar('ana@demo.tcc', 'senha-errada-123');
    const inexistente = await entrar('ninguem@demo.tcc', 'senha-errada-123');
    expect(errada.status).toBe(401);
    expect(inexistente.status).toBe(401);
    expect(await errada.json()).toEqual(await inexistente.json());
    expect(errada.headers.get('set-cookie')).toBeNull();
    expect(await auditoria(`acao = 'negado' and ator = 'Ana Ribeiro' and detalhe = 'senha incorreta'`)).toBe(1);
  });

  test('depois de 5 senhas erradas, bloqueia por 15 minutos, mesmo com a senha certa', async () => {
    for (let i = 0; i < 5; i++) expect((await entrar('roberto@demo.tcc', 'senha-errada-123')).status).toBe(401);
    const r = await entrar('roberto@demo.tcc');
    expect(r.status).toBe(403);
    expect(((await r.json()) as { mensagem: string }).mensagem).toBe('Muitas tentativas. Aguarde 15 minutos e tente de novo.');
    // Passados os 15 minutos, volta a entrar
    await amb.dono(`update tentativas_login set em = em - interval '16 minutes' where email = 'roberto@demo.tcc'`);
    expect((await entrar('roberto@demo.tcc')).status).toBe(200);
  });

  test('pedido que não é JSON é recusado (formulário de outro site não passa)', async () => {
    const r = await amb.pedir('/entrar', { method: 'POST', body: 'email=ana@demo.tcc&senha=x', headers: { 'content-type': 'text/plain' } } as never);
    expect(r.status).toBe(422);
  });
});

describe('segundo fator', () => {
  test('coordenação: a senha sozinha não dá acesso a nada', async () => {
    const r = await entrar('carlos@demo.tcc');
    expect(await r.json()).toEqual({ etapa: 'segundo_fator' });
    const cookie = cookieDe(r);
    expect((await amb.pedir('/escolas', { cabecalhos: { cookie, 'x-rede-id': 'rede-sp' } })).status).toBe(401);
    expect((await amb.pedir('/sessao', { cabecalhos: { cookie } })).status).toBe(401);
    expect((await amb.pedir('/central/fila', { cabecalhos: { cookie, 'x-rede-id': 'rede-sp', 'x-escola-id': 'esc-imsil' } })).status).toBe(401);
  });

  test('código errado é recusado; código certo libera a sessão e audita', async () => {
    const cookie = cookieDe(await entrar('carlos@demo.tcc'));
    const errado = await amb.pedir('/entrar/segundo-fator', json({ codigo: '000000' }, cookie));
    expect(errado.status).toBe(422);
    const certo = await amb.pedir('/entrar/segundo-fator', json({ codigo: codigoTotp(acessoDemo.segredoTotp) }, cookie));
    expect(certo.status).toBe(200);
    expect(await certo.json()).toMatchObject({ etapa: 'pronto', usuario: { nome: 'Carlos Mendes' } });
    expect((await amb.pedir('/central/fila', { cabecalhos: { cookie, 'x-rede-id': 'rede-sp', 'x-escola-id': 'esc-imsil' } })).status).toBe(200);
    expect(await ((await amb.pedir('/sessao', { cabecalhos: { cookie } })).json())).toMatchObject({ usuario: { id: 'u-carlos' } });
    expect(await auditoria(`acao = 'login' and ator = 'Carlos Mendes' and detalhe = 'com segundo fator'`)).toBe(1);
    expect(await auditoria(`acao = 'negado' and ator = 'Carlos Mendes' and detalhe = 'código do segundo fator incorreto'`)).toBe(1);
  });

  test('primeiro acesso de gestão: recebe o segredo, cadastra no aplicativo e confirma', async () => {
    await amb.dono(`select set_config('app.usuario_id', 'u-joana', false)`);
    await amb.dono(`delete from fatores_mfa where usuario_id = 'u-joana'`);
    const r = await entrar('joana@demo.tcc');
    const corpo = (await r.json()) as Extract<RespostaEntrar, { etapa: 'cadastrar_segundo_fator' }>;
    expect(corpo.etapa).toBe('cadastrar_segundo_fator');
    expect(corpo.segredo).toMatch(/^[A-Z2-7]{32}$/);
    expect(corpo.uri).toContain(`secret=${corpo.segredo}`);
    const cookie = cookieDe(r);
    expect((await amb.pedir('/escolas', { cabecalhos: { cookie, 'x-rede-id': 'rede-sp' } })).status).toBe(401);
    const ok = await amb.pedir('/entrar/segundo-fator', json({ codigo: codigoTotp(corpo.segredo) }, cookie));
    expect(ok.status).toBe(200);
    // Na próxima vez, só pede o código
    expect(await (await entrar('joana@demo.tcc')).json()).toEqual({ etapa: 'segundo_fator' });
  });

  test('o segredo fica cifrado no banco', async () => {
    const r = await naRede({ redeId: null, usuarioId: 'u-carlos' }, (c) => c.query('select segredo_cifrado from fatores_mfa'));
    expect(r.rows).toHaveLength(1); // só o próprio
    expect(r.rows[0].segredo_cifrado).not.toContain(acessoDemo.segredoTotp);
  });
});

describe('sair', () => {
  test('sair apaga a sessão no servidor e o cookie', async () => {
    const entrada = await entrar('ana@demo.tcc');
    const cookie = cookieDe(entrada);
    const r = await amb.pedir('/sair', { method: 'POST', cabecalhos: { cookie } });
    expect(r.headers.get('set-cookie')).toMatch(/^sessao=; .*Max-Age=0/);
    expect((await amb.pedir('/sessao', { cabecalhos: { cookie } })).status).toBe(401);
  });
});

/*
 * Tabela de acesso: cada perfil contra cada rota de leitura. É a matriz do
 * front (front/src/state/perfis.ts) conferida no servidor, que é quem decide.
 */
describe('perfil × rota', () => {
  const pessoas = {
    professor: ['u-ana', 'esc-imsil'], apoio: ['u-roberto', 'esc-imsil'], coordenacao: ['u-carlos', 'esc-imsil'],
    direcao: ['u-beatriz', 'esc-imsil'], referente_protecao: ['u-joana', 'esc-imsil'],
    diretoria_regional: ['u-marta', ''], secretaria: ['u-paulo', ''], admin_tecnico: ['u-ti', ''],
  } as const;
  type P = keyof typeof pessoas;
  const todos = Object.keys(pessoas) as P[];
  const gestao: P[] = ['coordenacao', 'direcao', 'referente_protecao'];

  // rota → perfis que recebem 200; os demais recebem 403
  const tabela: [string, P[]][] = [
    ['/escolas', todos],
    ['/categorias', todos],
    ['/ocorrencias', todos],
    ['/prazos', todos],
    ['/central/fila', gestao],
    ['/central/agenda', gestao],
    ['/ocorrencias/oc-sp-483', gestao],
    ['/busca', [...gestao, 'diretoria_regional']],
    ['/relatorios', ['direcao', 'diretoria_regional', 'secretaria']],
    ['/auditoria', ['direcao', 'secretaria', 'admin_tecnico']],
    ['/admin/regras', ['direcao', 'secretaria', 'admin_tecnico']],
    ['/admin/usuarios', ['direcao', 'secretaria', 'admin_tecnico']],
    ['/admin/pessoas', ['direcao', 'secretaria', 'admin_tecnico']],
  ];

  const sessoes = {} as Record<P, Record<string, string>>;
  beforeAll(async () => {
    for (const p of todos) sessoes[p] = await amb.entrar(pessoas[p][0], 'rede-sp', pessoas[p][1] || undefined);
  });

  test.each(tabela)('%s', async (rota, permitidos) => {
    for (const p of todos) {
      const r = await amb.pedir(rota, { cabecalhos: sessoes[p] });
      expect(r.status, `${p} em ${rota}`).toBe(permitidos.includes(p) ? 200 : 403);
    }
  });

  test('nenhuma rota de dados responde sem sessão', async () => {
    for (const [rota] of tabela) {
      expect((await amb.pedir(rota, { cabecalhos: { 'x-rede-id': 'rede-sp' } })).status, rota).toBe(401);
    }
  });

  test('escrita: cada ação só para quem pode', async () => {
    const post = async (p: P, rota: string, corpo: unknown, metodo = 'POST') =>
      (await amb.pedir(rota, { method: metodo, cabecalhos: sessoes[p], body: JSON.stringify(corpo) })).status;
    const registro = { tipo: 'escuta', texto: 'Escuta registrada para o teste de acesso.' };
    for (const p of todos) {
      expect(await post(p, '/ocorrencias/oc-sp-484/registros', registro), `${p} registra escuta`).toBe(gestao.includes(p) ? 201 : 403);
      expect(await post(p, '/admin/regras/sp-plano', { obrigatoria: false }, 'PUT'), `${p} altera protocolo`)
        .toBe(['secretaria', 'admin_tecnico'].includes(p) ? 200 : 403);
      expect(await post(p, '/admin/contatos', { conselhoTutelar: 'CT', cras: '', creas: '', delegacia: '', saude: '' }, 'PUT'), `${p} altera contatos`)
        .toBe(p === 'direcao' ? 200 : 403);
      expect(await post(p, '/exportacoes', { motivo: 'Relatório para a reunião pedagógica do bimestre.', de: '', ate: '', escolaId: '', somenteCategoriaId: '' }), `${p} exporta`)
        .toBe(['direcao', 'diretoria_regional', 'secretaria'].includes(p) ? 201 : 403);
    }
  });
});
