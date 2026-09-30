import type { Context, Hono } from 'hono';
import type { Ambiente, Perfil, RespostaEntrar, Usuario, Vinculo } from '@tcc/compartilhado/contrato';
import { esquemaEntrar, esquemaSegundoFator, esquemaTrocaDeSenha } from '@tcc/compartilhado/esquemas';
import { loginDemoAtivo } from '../ambiente';
import { naRede, type Cliente } from '../banco/conexao';
import { cifrar, decifrar } from '../cifra';
import { auditar, tokenDaRequisicao, vinculosDe } from '../contexto';
import { ErroApi, naoAutenticado, semPermissao, validacao } from '../erros';
import { hashDoToken, novoToken } from '../seguranca';
import { hashDaSenha, hashDeEngodo, senhaAceitavel, senhaConfere } from '../senha';
import { novoSegredoTotp, totpConfere, uriTotp } from '../totp';
import { corpo } from '../util';

/*
 * Login real (B2): e-mail e senha, segundo fator para perfis de gestão e
 * sessão em cookie HttpOnly. O login de demonstração (app.ts) continua
 * existindo fora de produção, para os roteiros do navegador.
 */

export const HORAS_DE_SESSAO = 8;
const MAX_TENTATIVAS = 5;
const JANELA_MINUTOS = 15;

/** Perfis que só registram não precisam de segundo fator; todos os outros precisam. */
const semSegundoFator: Perfil[] = ['professor', 'apoio'];
export const exigeSegundoFator = (vinculos: Vinculo[]) => vinculos.some((v) => !semSegundoFator.includes(v.perfil));

function cookieDaSessao(token: string | null) {
  const seguro = process.env.VERCEL ? '; Secure' : '';
  return token
    ? `sessao=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${HORAS_DE_SESSAO * 3600}${seguro}`
    : `sessao=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0${seguro}`;
}

/** Registra a entrada na auditoria de cada rede em que a pessoa atua: a sessão vale para todas. */
async function auditarLogin(db: Cliente, usuario: Usuario, resultado: 'permitido' | 'negado', detalhe?: string) {
  for (const vinculo of usuario.vinculos) {
    await db.query(`select set_config('app.rede_id', $1, true)`, [vinculo.redeId]);
    await auditar(db, { usuario, vinculo }, resultado === 'permitido' ? 'login' : 'negado', 'sessão', resultado, detalhe);
  }
}

async function usuarioCompleto(db: Cliente, usuarioId: string): Promise<Usuario> {
  await db.query(`select set_config('app.usuario_id', $1, true)`, [usuarioId]);
  const u = await db.query<{ id: string; nome: string }>('select id, nome from usuarios where id = $1', [usuarioId]);
  return { ...u.rows[0], vinculos: await vinculosDe(db, usuarioId) };
}

/** Sessão do cookie, inclusive a que ainda espera o segundo fator. */
async function sessaoAtual(db: Cliente, c: Context) {
  const token = tokenDaRequisicao(c.req.raw.headers);
  if (!token) return null;
  const r = await db.query<{ usuario_id: string; mfa_pendente: boolean }>(
    'select usuario_id, mfa_pendente from sessoes where token_hash = $1 and expira_em > now()',
    [hashDoToken(token)],
  );
  return r.rows[0] ? { ...r.rows[0], token } : null;
}

async function muitasTentativas(db: Cliente, email: string) {
  const r = await db.query<{ n: number }>(
    `select count(*) n from tentativas_login where email = $1 and not sucesso and em > now() - make_interval(mins => $2)`,
    [email, JANELA_MINUTOS],
  );
  return Number(r.rows[0].n) >= MAX_TENTATIVAS;
}

export function rotasDeAcesso(app: Hono) {
  app.get('/ambiente', (c) => c.json({ loginDemo: loginDemoAtivo() } satisfies Ambiente));

  app.post('/entrar', async (c) => {
    const pedido = await corpo(c, esquemaEntrar, 'Informe o e-mail e a senha.');
    const email = pedido.email.trim().toLowerCase();

    // As recusas são devolvidas como valor, e não lançadas, para a tentativa ficar gravada.
    const resultado = await naRede<RespostaEntrar & { token?: string } | ErroApi>({ redeId: null }, async (db) => {
      if (await muitasTentativas(db, email)) {
        return semPermissao(`Muitas tentativas. Aguarde ${JANELA_MINUTOS} minutos e tente de novo.`);
      }
      const achado = (await db.query<{ usuario_id: string; senha_hash: string | null; senha_temporaria: boolean }>('select * from hash_da_senha($1)', [email])).rows[0];
      // Sem conta ou sem senha: confere contra um hash qualquer, para a resposta levar o mesmo tempo.
      const confere = await senhaConfere(pedido.senha, achado?.senha_hash ?? (await hashDeEngodo()));
      if (!achado?.senha_hash || !confere) {
        await db.query('insert into tentativas_login (email, sucesso) values ($1, false)', [email]);
        if (achado) await auditarLogin(db, await usuarioCompleto(db, achado.usuario_id), 'negado', 'senha incorreta');
        return new ErroApi(401, 'nao_autenticado', 'E-mail ou senha incorretos.');
      }
      await db.query('insert into tentativas_login (email, sucesso) values ($1, true)', [email]);
      const usuario = await usuarioCompleto(db, achado.usuario_id);
      if (usuario.vinculos.length === 0) return semPermissao('Esta conta não tem vínculo com nenhuma rede.');

      const exige = exigeSegundoFator(usuario.vinculos);
      const token = novoToken();
      await db.query(
        `insert into sessoes (token_hash, usuario_id, expira_em, mfa_pendente) values ($1, $2, now() + make_interval(hours => $3), $4)`,
        [hashDoToken(token), usuario.id, HORAS_DE_SESSAO, exige],
      );
      if (!exige) {
        await auditarLogin(db, usuario, 'permitido');
        return { etapa: 'pronto', usuario, token, ...(achado.senha_temporaria ? { trocarSenha: true } : {}) };
      }
      const fator = (await db.query<{ confirmado_em: string | null }>('select confirmado_em from fatores_mfa where usuario_id = $1', [usuario.id])).rows[0];
      if (fator?.confirmado_em) return { etapa: 'segundo_fator', token };
      // Primeiro acesso de um perfil de gestão: gera o segredo para cadastrar no aplicativo.
      const segredo = novoSegredoTotp();
      await db.query(
        `insert into fatores_mfa (usuario_id, segredo_cifrado) values ($1, $2)
         on conflict (usuario_id) do update set segredo_cifrado = excluded.segredo_cifrado`,
        [usuario.id, cifrar(segredo)],
      );
      return { etapa: 'cadastrar_segundo_fator', segredo, uri: uriTotp(segredo, email), token };
    });

    if (resultado instanceof ErroApi) throw resultado;
    const { token, ...resposta } = resultado;
    c.header('Set-Cookie', cookieDaSessao(token!));
    return c.json(resposta);
  });

  app.post('/entrar/segundo-fator', async (c) => {
    const { codigo } = await corpo(c, esquemaSegundoFator, 'Informe o código de 6 dígitos.');
    const resultado = await naRede<RespostaEntrar | ErroApi>({ redeId: null }, async (db) => {
      const sessao = await sessaoAtual(db, c);
      if (!sessao) return naoAutenticado();
      const usuario = await usuarioCompleto(db, sessao.usuario_id);
      if (!sessao.mfa_pendente) return { etapa: 'pronto', usuario };
      const chave = `mfa:${usuario.id}`;
      if (await muitasTentativas(db, chave)) return semPermissao(`Muitas tentativas. Aguarde ${JANELA_MINUTOS} minutos e entre de novo.`);
      const fator = (await db.query<{ segredo_cifrado: string }>('select segredo_cifrado from fatores_mfa where usuario_id = $1', [usuario.id])).rows[0];
      if (!fator || !totpConfere(decifrar(fator.segredo_cifrado), codigo)) {
        await db.query('insert into tentativas_login (email, sucesso) values ($1, false)', [chave]);
        await auditarLogin(db, usuario, 'negado', 'código do segundo fator incorreto');
        return validacao('Código incorreto. Confira o aplicativo e o horário do celular.');
      }
      await db.query('update fatores_mfa set confirmado_em = coalesce(confirmado_em, now()) where usuario_id = $1', [usuario.id]);
      await db.query('update sessoes set mfa_pendente = false where token_hash = $1', [hashDoToken(sessao.token)]);
      await auditarLogin(db, usuario, 'permitido', 'com segundo fator');
      const temporaria = (await db.query<{ t: boolean }>(
        'select senha_temporaria as t from hash_da_senha((select email from usuarios where id = $1))', [usuario.id])).rows[0]?.t;
      return { etapa: 'pronto', usuario, ...(temporaria ? { trocarSenha: true } : {}) };
    });
    if (resultado instanceof ErroApi) throw resultado;
    return c.json(resultado);
  });

  /** Quem está logado, para a página se recuperar depois de recarregar (ela não lê o cookie). */
  app.get('/sessao', async (c) => {
    const usuario = await naRede({ redeId: null }, async (db) => {
      const sessao = await sessaoAtual(db, c);
      if (!sessao || sessao.mfa_pendente) throw naoAutenticado();
      return usuarioCompleto(db, sessao.usuario_id);
    });
    return c.json({ usuario });
  });

  /** Troca a própria senha. Exige a senha atual; encerra as outras sessões da pessoa. */
  app.post('/senha', async (c) => {
    const p = await corpo(c, esquemaTrocaDeSenha, 'Informe a senha atual e a nova.');
    const resultado = await naRede<true | ErroApi>({ redeId: null }, async (db) => {
      const sessao = await sessaoAtual(db, c);
      if (!sessao || sessao.mfa_pendente) return naoAutenticado();
      const usuario = await usuarioCompleto(db, sessao.usuario_id);
      const conta = (await db.query<{ senha_hash: string | null }>(
        'select senha_hash from hash_da_senha((select email from usuarios where id = $1))', [usuario.id])).rows[0];
      if (!conta?.senha_hash || !(await senhaConfere(p.atual, conta.senha_hash))) return validacao('A senha atual não confere.');
      if (!senhaAceitavel(p.nova)) return validacao('A nova senha precisa ter pelo menos 12 caracteres. Uma frase é uma boa senha.');
      if (p.nova === p.atual) return validacao('A nova senha precisa ser diferente da atual.');
      await db.query('select definir_senha($1, $2)', [usuario.id, await hashDaSenha(p.nova)]);
      await db.query('delete from sessoes where usuario_id = $1 and token_hash <> $2', [usuario.id, hashDoToken(sessao.token)]);
      for (const vinculo of usuario.vinculos) {
        await db.query(`select set_config('app.rede_id', $1, true)`, [vinculo.redeId]);
        await auditar(db, { usuario, vinculo }, 'administracao', 'senha da própria conta', 'permitido', 'alterada');
      }
      return true;
    });
    if (resultado instanceof ErroApi) throw resultado;
    return c.json({ ok: true });
  });

  app.post('/sair', async (c) => {
    const token = tokenDaRequisicao(c.req.raw.headers);
    if (token) await naRede({ redeId: null }, (db) => db.query('delete from sessoes where token_hash = $1', [hashDoToken(token)]));
    c.header('Set-Cookie', cookieDaSessao(null));
    return c.json({ ok: true });
  });
}
