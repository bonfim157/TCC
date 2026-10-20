import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import type { PedidoCadastroEscola, RespostaEntrar } from '@tcc/compartilhado/contrato';
import { naRede } from '../src/banco/conexao';
import { codigoTotp } from '../src/totp';
import { prepararAmbiente } from './preparar';

/* Cadastro da escola pela própria direção, com o código INEP. */

let amb: Awaited<ReturnType<typeof prepararAmbiente>>;
beforeAll(async () => {
  amb = await prepararAmbiente();
}, 120_000);
afterAll(async () => {
  await amb?.encerrar();
});

const pedido = (extra: Partial<PedidoCadastroEscola> = {}): PedidoCadastroEscola => ({
  inep: '35123456', nome: 'Escola Estadual Exemplo', secretaria: 'Secretaria da Educação do Estado de São Paulo',
  municipio: 'Limeira', bairro: 'Centro', uf: 'SP', esfera: 'estadual',
  nomeResponsavel: 'Marta Diretora', email: 'marta@exemplo.tcc', senha: 'uma frase longa de senha', ...extra,
});
const cadastrar = (p: PedidoCadastroEscola) => amb.pedir('/cadastro-escola', { method: 'POST', body: JSON.stringify(p) });
const cookieDe = (r: Response) => r.headers.get('set-cookie')?.split(';')[0] ?? '';
let cookieDaDiretora = '';

describe('cadastro de escola', () => {
  test('cria a rede, a escola com o INEP e a conta de direção, que entra com segundo fator', async () => {
    const r = await cadastrar(pedido({ inep: '35.123.456' }));
    expect(r.status).toBe(201);
    expect(await r.json()).toEqual({ ok: true, redeId: 'rede-e35123456' });

    const entrada = await amb.pedir('/entrar', { method: 'POST', body: JSON.stringify({ email: 'marta@exemplo.tcc', senha: 'uma frase longa de senha' }) });
    const corpo = (await entrada.json()) as RespostaEntrar;
    expect(corpo.etapa).toBe('cadastrar_segundo_fator');
    const cookie = cookieDe(entrada);
    const segredo = (corpo as Extract<RespostaEntrar, { etapa: 'cadastrar_segundo_fator' }>).segredo;
    const fator = await amb.pedir('/entrar/segundo-fator', {
      method: 'POST', body: JSON.stringify({ codigo: codigoTotp(segredo) }), cabecalhos: { cookie },
    });
    expect(await fator.json()).toMatchObject({
      etapa: 'pronto', usuario: { nome: 'Marta Diretora', vinculos: [{ redeId: 'rede-e35123456', perfil: 'direcao', escolaIds: ['esc-e35123456'] }] },
    });

    cookieDaDiretora = cookie;
    const escolas = await amb.pedir('/escolas', { cabecalhos: { cookie, 'x-rede-id': 'rede-e35123456' } });
    expect(await escolas.json()).toMatchObject([{ id: 'esc-e35123456', nome: 'Escola Estadual Exemplo' }]);

    // A escola nova já tem tipos de ocorrência, protocolo (com o Conviva, por ser estadual de SP) e modelos.
    const n = (sql: string) => naRede({ redeId: 'rede-e35123456' }, async (c) => Number((await c.query(sql)).rows[0].n));
    expect(await n('select count(*) n from categorias')).toBe(9);
    expect(await n(`select count(*) n from regras_protocolo where id = 'e35123456-conviva'`)).toBe(1);
    expect(await n('select count(*) n from modelos_comunicacao')).toBe(2);
  });

  test('a direção da escola cadastrada não entra em outra rede', async () => {
    const r = await amb.pedir('/ocorrencias', { cabecalhos: { cookie: cookieDaDiretora, 'x-rede-id': 'rede-sp' } });
    expect(r.status).toBe(403);
  });

  test('o login de demonstração não alcança uma escola cadastrada de verdade', async () => {
    expect((await amb.pedir('/redes/rede-e35123456/usuarios-demo')).status).toBe(404);
    const usuarioId = (await amb.dono(`select id from usuarios where email = 'marta@exemplo.tcc'`)).rows[0].id;
    const r = await amb.pedir('/sessoes', { method: 'POST', body: JSON.stringify({ usuarioId, redeId: 'rede-e35123456' }) });
    expect(r.status).toBe(403);
  });

  test('o mesmo código INEP não é cadastrado duas vezes', async () => {
    const r = await cadastrar(pedido({ email: 'outra@exemplo.tcc' }));
    expect(r.status).toBe(409);
    expect(await r.json()).toMatchObject({ mensagem: expect.stringMatching(/já está cadastrada/) });
  });

  test('recusa código INEP fora do formato, e-mail que já tem conta e senha curta', async () => {
    expect((await cadastrar(pedido({ inep: '1234' }))).status).toBe(422);
    expect((await cadastrar(pedido({ inep: '35999999', email: 'ana@demo.tcc' }))).status).toBe(409);
    expect((await cadastrar(pedido({ inep: '35999998', email: 'nova@exemplo.tcc', senha: 'curta' }))).status).toBe(422);
    // Nada ficou pela metade
    expect((await amb.dono(`select 1 from redes where id in ('rede-e35999999', 'rede-e35999998')`)).rowCount).toBe(0);
  });
});
