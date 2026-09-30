import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import type { RespostaEntrar } from '@tcc/compartilhado/contrato';
import { cargaInicial, criarConta } from '../src/administrar';
import { naRede } from '../src/banco/conexao';
import { decifrar } from '../src/cifra';
import { codigoTotp } from '../src/totp';
import { prepararAmbiente } from './preparar';

/*
 * Caminho de produção: banco só com as migrações (sem seed fictício), carga
 * inicial da rede real e contas criadas pela linha de comando.
 */

let amb: Awaited<ReturnType<typeof prepararAmbiente>>;
beforeAll(async () => {
  amb = await prepararAmbiente({ semSeed: true });
  delete process.env.TCC_LOGIN_DEMO; // como em produção: sem login de demonstração
}, 120_000);
afterAll(async () => {
  process.env.TCC_LOGIN_DEMO = '1';
  await amb?.encerrar();
});

const post = (rota: string, corpo: unknown, cookie?: string) =>
  amb.pedir(rota, { method: 'POST', body: JSON.stringify(corpo), cabecalhos: cookie ? { cookie } : undefined });
const cookieDe = (r: Response) => r.headers.get('set-cookie')?.split(';')[0] ?? '';
const contar = (sql: string) => naRede({ redeId: 'rede-sp' }, async (c) => Number((await c.query(sql)).rows[0].n));
const NOVA_SENHA = 'a escola fica no jardim ouro verde';

describe('carga inicial da rede SP', () => {
  test('cria a rede, a IMSIL, os tipos, o protocolo e os modelos; nenhuma pessoa, nenhum caso', async () => {
    expect(await cargaInicial('rede-sp')).toEqual({ escolas: 1, categorias: 9, regras: expect.any(Number), modelos: 2 });
    for (const t of ['pessoas', 'ocorrencias', 'vinculos', 'eventos']) expect(await contar(`select count(*) n from ${t}`), t).toBe(0);
    const redes = (await (await amb.pedir('/redes')).json()) as { id: string }[];
    expect(redes.map((r) => r.id)).toEqual(['rede-sp']); // a rede fictícia de testes não entra
  });

  test('rodar de novo não duplica nem apaga', async () => {
    const antes = await cargaInicial('rede-sp');
    expect(await cargaInicial('rede-sp')).toEqual(antes);
  });

  test('rede desconhecida é recusada', async () => {
    await expect(cargaInicial('rede-x')).rejects.toThrow(/Rede desconhecida/);
  });
});

describe('contas', () => {
  let temporaria = '';
  let segredo = '';

  test('valida os dados antes de criar', async () => {
    const base = { nome: 'Direção de Teste', email: 'direcao@escola.example', redeId: 'rede-sp', perfil: 'direcao' as const };
    await expect(criarConta({ ...base, email: 'sem-arroba' })).rejects.toThrow(/E-mail inválido/);
    await expect(criarConta(base)).rejects.toThrow(/ao menos uma escola/);
    await expect(criarConta({ ...base, escolaIds: ['esc-teste'] })).rejects.toThrow(/não existe nesta rede/);
    await expect(criarConta({ ...base, perfil: 'chefe' as never, escolaIds: ['esc-imsil'] })).rejects.toThrow(/Perfil inválido/);
  });

  test('cria a conta da direção com senha temporária e registra na auditoria', async () => {
    const r = await criarConta({ nome: 'Direção de Teste', email: 'Direcao@Escola.example', redeId: 'rede-sp', perfil: 'direcao', escolaIds: ['esc-imsil'] });
    temporaria = r.senhaTemporaria!;
    expect(temporaria).toMatch(/^[\w-]{16}$/);
    expect(await contar(`select count(*) n from auditoria where acao = 'administracao' and recurso = 'conta de Direção de Teste'`)).toBe(1);
    await expect(criarConta({ nome: 'Direção de Teste', email: 'direcao@escola.example', redeId: 'rede-sp', perfil: 'direcao', escolaIds: ['esc-imsil'] }))
      .rejects.toThrow(/já tem vínculo/);
  });

  test('sem login de demonstração, a única entrada é a senha', async () => {
    expect((await amb.pedir('/redes/rede-sp/usuarios-demo')).status).toBe(404);
    expect((await post('/sessoes', { redeId: 'rede-sp', usuarioId: 'qualquer' })).status).toBe(404);
    expect(await (await amb.pedir('/ambiente')).json()).toEqual({ loginDemo: false });
    expect((await amb.pedir('/diagnostico/restaurar', { method: 'POST' })).status).toBe(404);
  });

  test('primeiro acesso: senha temporária, cadastro do segundo fator, troca de senha obrigatória', async () => {
    const entrada = await post('/entrar', { email: 'direcao@escola.example', senha: temporaria });
    const cadastro = (await entrada.json()) as Extract<RespostaEntrar, { etapa: 'cadastrar_segundo_fator' }>;
    expect(cadastro.etapa).toBe('cadastrar_segundo_fator');
    segredo = cadastro.segredo;
    const cookie = cookieDe(entrada);
    const pronto = (await (await post('/entrar/segundo-fator', { codigo: codigoTotp(segredo) }, cookie)).json()) as RespostaEntrar;
    expect(pronto).toMatchObject({ etapa: 'pronto', trocarSenha: true, usuario: { nome: 'Direção de Teste' } });

    // Troca: exige a atual, recusa senha curta e senha igual
    expect((await post('/senha', { atual: 'errada', nova: NOVA_SENHA }, cookie)).status).toBe(422);
    expect((await post('/senha', { atual: temporaria, nova: 'curta' }, cookie)).status).toBe(422);
    expect((await post('/senha', { atual: temporaria, nova: temporaria }, cookie)).status).toBe(422);
    expect((await post('/senha', { atual: temporaria, nova: NOVA_SENHA }, cookie)).status).toBe(200);

    // A temporária deixa de valer; a nova entra e não pede mais a troca
    expect((await post('/entrar', { email: 'direcao@escola.example', senha: temporaria })).status).toBe(401);
    const nova = await post('/entrar', { email: 'direcao@escola.example', senha: NOVA_SENHA });
    expect(await nova.json()).toEqual({ etapa: 'segundo_fator' });
    const fim = (await (await post('/entrar/segundo-fator', { codigo: codigoTotp(segredo) }, cookieDe(nova))).json()) as RespostaEntrar;
    expect(fim).toMatchObject({ etapa: 'pronto' });
    expect('trocarSenha' in fim).toBe(false);
  });

  test('trocar a senha encerra as outras sessões da pessoa', async () => {
    const abrir = async (senha: string) => {
      const e = await post('/entrar', { email: 'direcao@escola.example', senha });
      const cookie = cookieDe(e);
      await post('/entrar/segundo-fator', { codigo: codigoTotp(segredo) }, cookie);
      return cookie;
    };
    const a = await abrir(NOVA_SENHA);
    const b = await abrir(NOVA_SENHA);
    expect((await post('/senha', { atual: NOVA_SENHA, nova: 'outra frase comprida para a senha' }, a)).status).toBe(200);
    expect((await amb.pedir('/sessao', { cabecalhos: { cookie: a } })).status).toBe(200);
    expect((await amb.pedir('/sessao', { cabecalhos: { cookie: b } })).status).toBe(401);
    expect((await post('/senha', { atual: 'outra frase comprida para a senha', nova: NOVA_SENHA }, a)).status).toBe(200);
  });

  test('o segredo do segundo fator fica cifrado e só a própria pessoa o alcança', async () => {
    const id = (await amb.dono(`select id from usuarios where email = 'direcao@escola.example'`)).rows[0].id;
    const proprio = await naRede({ redeId: null, usuarioId: id }, (c) => c.query('select segredo_cifrado from fatores_mfa'));
    expect(decifrar(proprio.rows[0].segredo_cifrado)).toBe(segredo);
    const outro = await naRede({ redeId: null, usuarioId: 'outra-pessoa' }, (c) => c.query('select segredo_cifrado from fatores_mfa'));
    expect(outro.rows).toEqual([]);
  });

  test('a direção criada usa o sistema: registra o primeiro caso real da rede', async () => {
    const entrada = await post('/entrar', { email: 'direcao@escola.example', senha: NOVA_SENHA });
    const cookie = cookieDe(entrada);
    await post('/entrar/segundo-fator', { codigo: codigoTotp(segredo) }, cookie);
    const r = await amb.pedir('/ocorrencias', {
      method: 'POST', cabecalhos: { cookie, 'x-rede-id': 'rede-sp', 'x-escola-id': 'esc-imsil' },
      body: JSON.stringify({
        escolaId: 'esc-imsil', envolvidos: [], anexos: [],
        fato: {
          categoriaId: 'sp-cat-3', data: new Date(Date.now() - 3 * 3600_000).toISOString().slice(0, 10), hora: '09:00', local: 'Quadra',
          riscoImediato: false, providenciaImediata: '', relato: 'Trave da quadra quebrada durante o intervalo, sem feridos.',
        },
      }),
    });
    expect(r.status).toBe(201);
    const caso = (await r.json()) as { protocolo: string; providencias: unknown[] };
    expect(caso.protocolo).toMatch(/^\d{4}-000001$/);
    expect(caso.providencias.length).toBeGreaterThan(0);
  });
});
