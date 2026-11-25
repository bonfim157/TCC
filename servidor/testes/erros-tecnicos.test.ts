import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import { registrarErroTecnico } from '../src/app';
import { prepararAmbiente } from './preparar';

/* Erros inesperados (500) vão para a tabela própria, sem mensagem; a saúde diz se o banco respondeu. */

let amb: Awaited<ReturnType<typeof prepararAmbiente>>;
beforeAll(async () => {
  amb = await prepararAmbiente();
}, 120_000);
afterAll(async () => {
  await amb?.encerrar();
});

describe('erros técnicos', () => {
  test('grava o método, a rota, o tipo e o código, sem a mensagem', async () => {
    const erro = Object.assign(new TypeError('e-mail: pessoa@escola.sp.gov.br'), { code: '23505' });
    await registrarErroTecnico('POST', '/api/ocorrencias', erro);
    const r = await amb.dono('select metodo, rota, tipo, codigo from erros_tecnicos');
    expect(r.rows).toEqual([{ metodo: 'POST', rota: '/api/ocorrencias', tipo: 'TypeError', codigo: '23505' }]);
    expect(JSON.stringify(r.rows)).not.toContain('pessoa@');
  });

  test('não derruba a resposta quando a gravação falha', async () => {
    await amb.dono('alter table erros_tecnicos rename to erros_tecnicos_fora');
    try {
      await expect(registrarErroTecnico('GET', '/api/x', new Error('x'))).resolves.toBeUndefined();
    } finally {
      await amb.dono('alter table erros_tecnicos_fora rename to erros_tecnicos');
    }
  });

  test('a saúde responde 200 com o banco no ar', async () => {
    const r = await amb.pedir('/saude');
    expect(r.status).toBe(200);
    expect(await r.json()).toEqual({ ok: true });
  });
});
