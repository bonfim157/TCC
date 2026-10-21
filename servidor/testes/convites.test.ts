import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import type { ConviteComLink, ConvitePublico, RespostaEntrar } from '@tcc/compartilhado/contrato';
import { acessoDemo } from '@tcc/compartilhado/seed';
import { comoDono } from '../src/banco/conexao';
import { hashDoToken } from '../src/seguranca';
import { codigoTotp } from '../src/totp';
import { prepararAmbiente } from './preparar';

/* Convites da direção: link de uso único, com prazo, preso ao e-mail; nunca troca a senha de quem já tem conta. */

let amb: Awaited<ReturnType<typeof prepararAmbiente>>;
let direcao: Record<string, string>;
beforeAll(async () => {
  amb = await prepararAmbiente();
  direcao = await amb.entrar('u-beatriz', 'rede-sp', 'esc-imsil');
}, 120_000);
afterAll(async () => {
  await amb?.encerrar();
});

const post = (caminho: string, corpo: unknown, cabecalhos?: Record<string, string>) =>
  amb.pedir(caminho, { method: 'POST', body: JSON.stringify(corpo), cabecalhos });
const convidar = async (email: string, perfil = 'professor') => {
  const r = await post('/admin/convites', { email, perfil }, direcao);
  expect(r.status).toBe(201);
  return ((await r.json()) as ConviteComLink).link.replace('/convite/', '');
};
/** SQL como dono dentro de uma rede: a Row-Level Security vale até para o dono. */
const naRedeComoDono = (rede: string, sql: string, params: unknown[] = []) =>
  comoDono(async (c) => {
    await c.query('begin');
    await c.query(`select set_config('app.rede_id', $1, true)`, [rede]);
    const r = await c.query(sql, params);
    await c.query('commit');
    return r;
  });
const cookieDe = (r: Response) => r.headers.get('set-cookie')?.split(';')[0] ?? '';

describe('convites', () => {
  test('só a direção convida; o token não fica guardado', async () => {
    const professora = await amb.entrar('u-ana', 'rede-sp', 'esc-imsil');
    expect((await post('/admin/convites', { email: 'x@exemplo.tcc', perfil: 'professor' }, professora)).status).toBe(403);
    const token = await convidar('nova.prof@exemplo.tcc');
    const guardado = await naRedeComoDono('rede-sp', 'select token_hash from convites where email = $1', ['nova.prof@exemplo.tcc']);
    expect(guardado.rows[0].token_hash).not.toBe(token);
    const lista = await amb.pedir('/admin/convites', { cabecalhos: direcao });
    expect(await lista.json()).toMatchObject([{ email: 'nova.prof@exemplo.tcc', perfil: 'professor' }]);
    // Segundo convite para o mesmo e-mail enquanto o primeiro espera: recusado
    expect((await post('/admin/convites', { email: 'nova.prof@exemplo.tcc', perfil: 'professor' }, direcao)).status).toBe(409);
  });

  test('sem conta: o convite cria a conta, que entra na escola; o link não serve duas vezes', async () => {
    const token = await convidar('paulo.souza@exemplo.tcc');
    const pub = (await (await amb.pedir(`/convites/${token}`)).json()) as ConvitePublico;
    expect(pub).toMatchObject({ escola: expect.stringMatching(/Irmã Maria/), perfil: 'professor', situacao: 'pendente', temConta: false });

    expect((await post(`/convites/${token}/aceitar`, { nome: 'Paulo Souza', senha: 'curta' })).status).toBe(422);
    const r = await post(`/convites/${token}/aceitar`, { nome: 'Paulo Souza', senha: 'uma frase longa de senha' });
    expect(await r.json()).toEqual({ novaConta: true });

    const entrada = await post('/entrar', { email: 'paulo.souza@exemplo.tcc', senha: 'uma frase longa de senha' });
    expect(await entrada.json()).toMatchObject({ etapa: 'pronto', usuario: { vinculos: [{ redeId: 'rede-sp', perfil: 'professor', escolaIds: ['esc-imsil'] }] } });

    expect((await post(`/convites/${token}/aceitar`, { nome: 'Outra Pessoa', senha: 'outra frase longa de senha' })).status).toBe(409);
  });

  test('com conta: exige entrar com ela, só acrescenta a escola e nunca troca a senha', async () => {
    // Roberto (apoio, só na rede SP) já tem conta; a escola de testes da outra rede o convida
    const luis = await amb.entrar('u-luis', 'rede-teste', 'esc-teste');
    await naRedeComoDono('rede-teste', `update vinculos set perfil = 'direcao' where usuario_id = 'u-luis'`);
    const r = await post('/admin/convites', { email: acessoDemo.email('u-roberto'), perfil: 'professor' }, luis);
    const token = ((await r.json()) as ConviteComLink).link.replace('/convite/', '');
    expect(((await (await amb.pedir(`/convites/${token}`)).json()) as ConvitePublico).temConta).toBe(true);

    // Sem sessão, ou tentando definir uma senha: recusado, e a senha antiga continua valendo
    expect((await post(`/convites/${token}/aceitar`, { nome: 'Invasor', senha: 'senha nova do invasor' })).status).toBe(403);
    const antiga = await post('/entrar', { email: acessoDemo.email('u-roberto'), senha: acessoDemo.senha });
    expect(((await antiga.json()) as RespostaEntrar).etapa).toBe('pronto');

    // Logada com a outra conta: recusado
    const outra = await post('/entrar', { email: 'paulo.souza@exemplo.tcc', senha: 'uma frase longa de senha' });
    expect((await post(`/convites/${token}/aceitar`, {}, { cookie: cookieDe(outra) })).status).toBe(403);

    const aceite = await post(`/convites/${token}/aceitar`, {}, { cookie: cookieDe(antiga) });
    expect(await aceite.json()).toEqual({ novaConta: false });
    const sessao = await amb.pedir('/sessao', { cabecalhos: { cookie: cookieDe(antiga) } });
    const { usuario } = (await sessao.json()) as { usuario: { vinculos: { redeId: string }[] } };
    expect(usuario.vinculos.map((v) => v.redeId).sort()).toEqual(['rede-sp', 'rede-teste']);
  });

  test('cancelado ou vencido não aceita; um link novo invalida o anterior', async () => {
    const token = await convidar('cancelar@exemplo.tcc');
    const id = (await naRedeComoDono('rede-sp', 'select id from convites where email = $1', ['cancelar@exemplo.tcc'])).rows[0].id;
    const novo = await post(`/admin/convites/${id}/link`, {}, direcao);
    const tokenNovo = ((await novo.json()) as ConviteComLink).link.replace('/convite/', '');
    expect((await amb.pedir(`/convites/${token}`)).status).toBe(404);
    expect((await amb.pedir(`/admin/convites/${id}`, { method: 'DELETE', cabecalhos: direcao })).status).toBe(200);
    expect((await post(`/convites/${tokenNovo}/aceitar`, { nome: 'Fulana', senha: 'uma frase longa de senha' })).status).toBe(409);

    const vencido = await convidar('vencido@exemplo.tcc');
    await naRedeComoDono('rede-sp', `update convites set expira_em = now() - interval '1 day' where email = 'vencido@exemplo.tcc'`);
    expect(((await (await amb.pedir(`/convites/${vencido}`)).json()) as ConvitePublico).situacao).toBe('vencido');
    expect((await post(`/convites/${vencido}/aceitar`, { nome: 'Fulana', senha: 'uma frase longa de senha' })).status).toBe(409);
  });
  test('com outro perfil na mesma rede: recusa, para não dar mais acesso do que a direção deu', async () => {
    // Luís atua na escola de testes (como direção, desde o teste anterior); um convite de professor para a outra escola da mesma rede
    await naRedeComoDono('rede-teste', `insert into convites (rede_id, escola_id, email, perfil, token_hash, criado_por, expira_em)
      values ('rede-teste', 'esc-teste-2', $1, 'professor', $2, 'Direção', now() + interval '7 days')`, [acessoDemo.email('u-luis'), hashDoToken('convite-do-luis')]);
    await naRedeComoDono('rede-teste', `insert into tokens_convite (token_hash, rede_id) values ($1, 'rede-teste')`, [hashDoToken('convite-do-luis')]);

    // Coordenação entra com senha e segundo fator
    const entrada = await post('/entrar', { email: acessoDemo.email('u-luis'), senha: acessoDemo.senha });
    const cookie = cookieDe(entrada);
    await post('/entrar/segundo-fator', { codigo: codigoTotp(acessoDemo.segredoTotp) }, { cookie });

    const r = await post('/convites/convite-do-luis/aceitar', {}, { cookie });
    expect(r.status).toBe(409);
    const sessao = await amb.pedir('/sessao', { cabecalhos: { cookie } });
    const { usuario } = (await sessao.json()) as { usuario: { vinculos: { perfil: string; escolaIds: string[] }[] } };
    expect(usuario.vinculos).toEqual([expect.objectContaining({ perfil: 'direcao', escolaIds: ['esc-teste'] })]);
  });
  test('convites recebidos em Minha conta: só os do próprio e-mail; aceitar e recusar sem o link', async () => {
    // Paulo (conta criada no segundo teste, professor na IMSIL) recebe um convite da escola de testes
    const luis = await amb.entrar('u-luis', 'rede-teste', 'esc-teste');
    expect((await post('/admin/convites', { email: 'paulo.souza@exemplo.tcc', perfil: 'professor' }, luis)).status).toBe(201);
    // e um da outra escola da mesma rede, que ele vai recusar
    await naRedeComoDono('rede-teste', `insert into convites (id, rede_id, escola_id, email, perfil, token_hash, criado_por, expira_em)
      values ('cv-recusar', 'rede-teste', 'esc-teste-2', 'paulo.souza@exemplo.tcc', 'professor', $1, 'Direção', now() + interval '7 days')`, [hashDoToken('recusar')]);
    await naRedeComoDono('rede-teste', `insert into tokens_convite (token_hash, rede_id, convite_id, email) values ($1, 'rede-teste', 'cv-recusar', 'paulo.souza@exemplo.tcc')`, [hashDoToken('recusar')]);

    expect((await amb.pedir('/convites')).status).toBe(401);
    const paulo = cookieDe(await post('/entrar', { email: 'paulo.souza@exemplo.tcc', senha: 'uma frase longa de senha' }));
    const lista = (await (await amb.pedir('/convites', { cabecalhos: { cookie: paulo } })).json()) as { id: string; escola: string }[];
    expect(lista.map((c) => c.escola).sort()).toEqual(['Escola Fictícia de Testes', 'Segunda Escola Fictícia']);
    const daEscolaTeste = lista.find((c) => c.id !== 'cv-recusar')!;

    // Outra pessoa não vê nem aceita o convite do Paulo
    const roberto = cookieDe(await post('/entrar', { email: acessoDemo.email('u-roberto'), senha: acessoDemo.senha }));
    expect(await (await amb.pedir('/convites', { cabecalhos: { cookie: roberto } })).json()).toEqual([]);
    expect((await post(`/convites/recebidos/${daEscolaTeste.id}/aceitar`, {}, { cookie: roberto })).status).toBe(404);

    expect(await (await post(`/convites/recebidos/${daEscolaTeste.id}/aceitar`, {}, { cookie: paulo })).json()).toEqual({ novaConta: false });
    expect((await post('/convites/recebidos/cv-recusar/recusar', {}, { cookie: paulo })).status).toBe(200);
    expect(await (await amb.pedir('/convites', { cabecalhos: { cookie: paulo } })).json()).toEqual([]);
    expect((await post('/convites/recebidos/cv-recusar/aceitar', {}, { cookie: paulo })).status).toBe(409);

    const { usuario } = (await (await amb.pedir('/sessao', { cabecalhos: { cookie: paulo } })).json()) as { usuario: { vinculos: { redeId: string; escolaIds: string[] }[] } };
    expect(usuario.vinculos.find((v) => v.redeId === 'rede-teste')?.escolaIds).toEqual(['esc-teste']);
  });
});
