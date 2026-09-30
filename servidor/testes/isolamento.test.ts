import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import { naRede } from '../src/banco/conexao';
import { prepararAmbiente } from './preparar';

/*
 * B1: isolamento entre redes. Os testes de banco rodam como o papel da
 * aplicação (app_tcc), sem nenhum filtro no código: se passarem, é a
 * Row-Level Security sozinha que está protegendo.
 */

let amb: Awaited<ReturnType<typeof prepararAmbiente>>;
beforeAll(async () => {
  amb = await prepararAmbiente();
}, 120_000);
afterAll(async () => {
  await amb?.encerrar();
});

const contar = (redeId: string | null, sql: string) =>
  naRede({ redeId }, async (c) => Number((await c.query(sql)).rows[0].n));

describe('banco: Row-Level Security', () => {
  test('com a rede SP ativa, nenhuma linha da rede de testes aparece, mesmo sem filtro na consulta', async () => {
    expect(await contar('rede-sp', `select count(*) n from ocorrencias where rede_id = 'rede-teste'`)).toBe(0);
    expect(await contar('rede-sp', `select count(*) n from ocorrencias`)).toBeGreaterThan(60);
    // O protocolo 2026-000482 existe nas duas redes; só o da rede ativa aparece
    const r = await naRede({ redeId: 'rede-sp' }, (c) => c.query(`select rede_id from ocorrencias where protocolo = '2026-000482'`));
    expect(r.rows).toEqual([{ rede_id: 'rede-sp' }]);
  });

  test('sem rede informada, as tabelas por rede não mostram nada', async () => {
    for (const t of ['ocorrencias', 'escolas', 'pessoas', 'eventos', 'auditoria', 'comunicacoes']) {
      expect(await contar(null, `select count(*) n from ${t}`), t).toBe(0);
    }
  });

  test('a rede de uma transação não vaza para a seguinte', async () => {
    await contar('rede-sp', 'select count(*) n from ocorrencias');
    expect(await contar(null, 'select count(*) n from ocorrencias')).toBe(0);
  });

  test('não grava linha em outra rede', async () => {
    await expect(
      naRede({ redeId: 'rede-sp' }, (c) => c.query(`insert into pessoas (rede_id, escola_id, nome, tipo) values ('rede-teste', 'esc-teste', 'X', 'outro')`)),
    ).rejects.toThrow(/row-level security/);
  });

  test('auditoria e linha do tempo não podem ser alteradas nem apagadas', async () => {
    for (const sql of ['update auditoria set ator = $$x$$', 'delete from auditoria', 'update eventos set texto = $$x$$', 'delete from eventos']) {
      await expect(naRede({ redeId: 'rede-sp' }, (c) => c.query(sql)), sql).rejects.toThrow(/permission denied/);
    }
  });

  test('a aplicação não lê o hash de senha', async () => {
    await expect(naRede({ redeId: 'rede-sp' }, (c) => c.query('select senha_hash from usuarios'))).rejects.toThrow(/permission denied/);
  });

  test('cada registro de auditoria aponta para o hash do anterior da mesma rede', async () => {
    const r = await naRede({ redeId: 'rede-sp' }, async (c) => {
      for (const recurso of ['a', 'b']) {
        await c.query(`insert into auditoria (rede_id, ator, acao, recurso, resultado) values ('rede-sp', 'teste', 'consulta', $1, 'permitido')`, [recurso]);
      }
      return c.query(`select hash, hash_anterior from auditoria order by id desc limit 2`);
    });
    const [ultimo, penultimo] = r.rows;
    expect(ultimo.hash_anterior).toBe(penultimo.hash);
    expect(ultimo.hash).toMatch(/^[0-9a-f]{64}$/);
  });
});

/** SQL direto na conexão da aplicação, sem rede e sem trocar de papel, numa transação desfeita ao final. */
async function cru(sql: string) {
  const c = await amb.pool.connect();
  try {
    await c.query('begin');
    return await c.query(sql);
  } finally {
    await c.query('rollback').catch(() => {});
    c.release();
  }
}

describe('banco: a aplicação não conecta como dona', () => {
  // Consultas feitas direto no pool da aplicação, fora de naRede: o que um erro de código conseguiria.
  test('fora de uma transação com rede, não enxerga nenhuma linha por rede', async () => {
    for (const t of ['ocorrencias', 'escolas', 'auditoria', 'eventos']) {
      expect(Number((await cru(`select count(*) n from ${t}`)).rows[0].n), t).toBe(0);
    }
  });

  test('não altera nem apaga auditoria, não lê hash de senha, não mexe na estrutura', async () => {
    for (const sql of [
      'delete from auditoria', `update auditoria set ator = 'x'`, 'select senha_hash from usuarios', 'truncate eventos',
      'alter table ocorrencias no force row level security', 'drop table sessoes',
    ]) {
      await expect(cru(sql), sql).rejects.toThrow(/permission denied|must be owner/);
    }
  });

  test('o papel da conexão é o da aplicação', async () => {
    expect((await amb.pool.query('select current_user')).rows[0].current_user).toBe('app_tcc');
  });
});

describe('API: contexto da requisição', () => {
  test('lista as redes sem login', async () => {
    const r = await amb.pedir('/redes');
    expect(r.status).toBe(200);
    expect(((await r.json()) as { id: string }[]).map((x) => x.id).sort()).toEqual(['rede-sp', 'rede-teste']);
  });

  test('sem sessão: 401', async () => {
    const r = await amb.pedir('/escolas', { cabecalhos: { 'x-rede-id': 'rede-sp' } });
    expect(r.status).toBe(401);
    expect(await r.json()).toMatchObject({ codigo: 'nao_autenticado' });
  });

  test('professora vê só a própria escola, com as categorias da rede', async () => {
    const h = await amb.entrar('u-ana', 'rede-sp', 'esc-imsil');
    const escolas = (await (await amb.pedir('/escolas', { cabecalhos: h })).json()) as { id: string }[];
    expect(escolas.map((e) => e.id)).toEqual(['esc-imsil']);
    const categorias = (await (await amb.pedir('/categorias', { cabecalhos: h })).json()) as { id: string; redeId: string }[];
    expect(categorias).toHaveLength(9);
    expect(categorias.every((c) => c.redeId === 'rede-sp')).toBe(true);
  });

  test('rede sem vínculo: 403 sem_permissao', async () => {
    const h = await amb.entrar('u-carlos', 'rede-sp');
    const r = await amb.pedir('/escolas', { cabecalhos: { ...h, 'x-rede-id': 'rede-teste' } });
    expect(r.status).toBe(403);
    expect(await r.json()).toMatchObject({ codigo: 'sem_permissao' });
  });

  test('escola de outra rede no cabeçalho: 403 rede_divergente', async () => {
    const h = await amb.entrar('u-ana', 'rede-sp');
    const r = await amb.pedir('/escolas', { cabecalhos: { ...h, 'x-escola-id': 'esc-teste' } });
    expect(r.status).toBe(403);
    expect(await r.json()).toMatchObject({ codigo: 'rede_divergente' });
  });

  test('a mesma pessoa, na outra rede, vê só a escola de lá', async () => {
    const h = await amb.entrar('u-ana', 'rede-teste');
    const escolas = (await (await amb.pedir('/escolas', { cabecalhos: h })).json()) as { id: string }[];
    expect(escolas.map((e) => e.id)).toEqual(['esc-teste']);
  });

  test('regional alcança as duas escolas da regional fictícia', async () => {
    const h = await amb.entrar('u-rita', 'rede-teste');
    const escolas = (await (await amb.pedir('/escolas', { cabecalhos: h })).json()) as { id: string }[];
    expect(escolas.map((e) => e.id).sort()).toEqual(['esc-teste', 'esc-teste-2']);
  });

  test('sessão vencida: 401', async () => {
    const h = await amb.entrar('u-beatriz', 'rede-sp');
    await amb.dono(`update sessoes set expira_em = now() - interval '1 minute'`);
    const r = await amb.pedir('/escolas', { cabecalhos: h });
    expect(r.status).toBe(401);
  });

  test('a entrada fica na auditoria da rede', async () => {
    await amb.entrar('u-joana', 'rede-sp');
    const n = await contar('rede-sp', `select count(*) n from auditoria where acao = 'login' and ator = 'Joana Prado'`);
    expect(n).toBeGreaterThan(0);
  });
});

describe('login de demonstração', () => {
  test('não existe sem a variável TCC_LOGIN_DEMO', async () => {
    delete process.env.TCC_LOGIN_DEMO;
    const r = await amb.pedir('/sessoes', { method: 'POST', body: JSON.stringify({ usuarioId: 'u-ana', redeId: 'rede-sp' }) });
    expect(r.status).toBe(404);
    process.env.TCC_LOGIN_DEMO = '1';
  });

  test('não existe em produção, mesmo com a variável', async () => {
    process.env.VERCEL_ENV = 'production';
    const r = await amb.pedir('/redes/rede-sp/usuarios-demo');
    expect(r.status).toBe(404);
    delete process.env.VERCEL_ENV;
  });

  test('pessoa sem vínculo com a rede não entra', async () => {
    const r = await amb.pedir('/sessoes', { method: 'POST', body: JSON.stringify({ usuarioId: 'u-luis', redeId: 'rede-sp' }) });
    expect(r.status).toBe(403);
  });
});

describe('restaurar dados de demonstração', () => {
  test('volta ao seed; não existe em produção', async () => {
    const h = await amb.entrar('u-ana', 'rede-sp', 'esc-imsil');
    await amb.dono(`select set_config('app.rede_id', 'rede-sp', false)`);
    await amb.dono(`delete from tokens_ciencia`);
    expect((await amb.pedir('/diagnostico/restaurar', { method: 'POST' })).status).toBe(200);
    expect(Number((await amb.pool.query('select count(*) n from tokens_ciencia')).rows[0].n)).toBeGreaterThan(0);
    // As sessões também voltam ao início: o token antigo deixa de valer
    expect((await amb.pedir('/escolas', { cabecalhos: h })).status).toBe(401);
    process.env.VERCEL_ENV = 'production';
    expect((await amb.pedir('/diagnostico/restaurar', { method: 'POST' })).status).toBe(404);
    delete process.env.VERCEL_ENV;
  });
});
