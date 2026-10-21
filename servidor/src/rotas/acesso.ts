import type { Context, Hono } from 'hono';
import type { Ambiente, ConvitePublico, ConviteRecebido, Perfil, RespostaEntrar, Usuario, Vinculo } from '@tcc/compartilhado/contrato';
import { esquemaAceitarConvite, esquemaCadastroEscola, esquemaEntrar, esquemaSegundoFator, esquemaTrocaDeSenha } from '@tcc/compartilhado/esquemas';
import { modelosDaRede, regrasBase } from '@tcc/compartilhado/protocolo';
import { categoriasDaRede, categoriasSensiveis } from '@tcc/compartilhado/seed';
import { loginDemoAtivo } from '../ambiente';
import { definirRede, naRede, type Cliente } from '../banco/conexao';
import { cifrar, decifrar } from '../cifra';
import { auditar, tokenDaRequisicao, vinculosDe } from '../contexto';
import { conflito, ErroApi, naoAutenticado, naoEncontrado, semPermissao, validacao } from '../erros';
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

  /**
   * Cadastro de uma escola pela própria direção, com o código INEP. Cria a rede
   * da escola, a escola e a conta de direção; o segundo fator é cadastrado no
   * primeiro login, como em qualquer perfil de gestão.
   */
  app.post('/cadastro-escola', async (c) => {
    const p = await corpo(c, esquemaCadastroEscola, 'Preencha os dados da escola e da sua conta.');
    const inep = p.inep.replace(/\D/g, '');
    const email = p.email.trim().toLowerCase();
    const nome = p.nome.trim();
    if (!/^\d{8}$/.test(inep)) throw validacao('O código INEP da escola tem 8 números. Ele aparece no Censo Escolar e no site do INEP.');
    if (nome.length < 3 || !p.secretaria.trim() || !p.municipio.trim() || !p.bairro.trim()) throw validacao('Preencha o nome, a secretaria, o município e o bairro da escola.');
    if (p.nomeResponsavel.trim().length < 3) throw validacao('Informe seu nome completo.');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw validacao('Confira o e-mail.');
    if (!senhaAceitavel(p.senha)) throw validacao('A senha precisa ter pelo menos 12 caracteres. Uma frase é uma boa senha.');

    const prefixo = `e${inep}`;
    const redeId = `rede-${prefixo}`;
    const escolaId = `esc-${prefixo}`;
    const senhaHash = await hashDaSenha(p.senha);
    const resultado = await naRede<true | ErroApi>({ redeId: null }, async (db) => {
      if ((await db.query('select 1 from redes where id = $1', [redeId])).rowCount) {
        return conflito('Esta escola já está cadastrada. Peça um convite à direção da escola.');
      }
      if ((await db.query('select 1 from hash_da_senha($1)', [email])).rowCount) {
        return conflito('Já existe uma conta com este e-mail. Entre com ela, ou use outro e-mail.');
      }
      const sigla = nome.split(/\s+/).map((palavra) => palavra[0]).join('').toUpperCase().slice(0, 8);
      const usuarioId = (await db.query<{ id: string }>(
        'select cadastrar_escola($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) as id',
        [redeId, nome, p.secretaria.trim(), p.municipio.trim(), p.uf, p.esfera, sigla, p.nomeResponsavel.trim(), email, senhaHash],
      )).rows[0].id;
      await definirRede(db, redeId);
      await db.query(`select set_config('app.usuario_id', $1, true)`, [usuarioId]);

      const ins = (tabela: string, linha: Record<string, unknown>) => {
        const cols = Object.keys(linha);
        return db.query(`insert into ${tabela} (${cols.join(', ')}) values (${cols.map((_, i) => `$${i + 1}`).join(', ')})`, Object.values(linha));
      };
      await ins('regionais', { id: `reg-${prefixo}`, rede_id: redeId, nome: p.municipio.trim() });
      await ins('escolas', { id: escolaId, rede_id: redeId, regional_id: `reg-${prefixo}`, nome, municipio: p.municipio.trim(), bairro: p.bairro.trim(), inep });
      await ins('contatos_locais', { escola_id: escolaId, rede_id: redeId });
      // Os mesmos tipos de ocorrência e o mesmo protocolo das redes de exemplo; a direção ajusta depois na Administração.
      for (const [i, cat] of categoriasDaRede(redeId, prefixo).entries()) {
        await ins('categorias', { id: cat.id, rede_id: redeId, nome: cat.nome, ativa: true, ordem: i, sensivel: categoriasSensiveis.includes(cat.id.replace(prefixo, 'sp')) });
      }
      const conviva = p.uf === 'SP' && p.esfera === 'estadual';
      for (const [i, r] of regrasBase(redeId, prefixo, conviva).entries()) {
        await ins('regras_protocolo', {
          id: r.id, rede_id: redeId, categoria_ids: r.categoriaIds === 'todas' ? null : r.categoriaIds,
          somente_com_risco: r.somenteComRisco, descricao: r.descricao, base: r.base, obrigatoria: r.obrigatoria, ordem: i,
        });
      }
      for (const m of modelosDaRede(redeId)) await ins('modelos_comunicacao', { id: m.id, rede_id: redeId, tipo: m.tipo, nome: m.nome, texto: m.texto });
      const vinculoId = (await db.query<{ id: string }>(
        `insert into vinculos (usuario_id, rede_id, perfil) values ($1, $2, 'direcao') returning id`, [usuarioId, redeId],
      )).rows[0].id;
      await ins('vinculo_escolas', { vinculo_id: vinculoId, rede_id: redeId, escola_id: escolaId });
      await ins('auditoria', {
        rede_id: redeId, ator: p.nomeResponsavel.trim(), perfil: 'direcao', acao: 'administracao',
        recurso: `escola ${nome}`, resultado: 'permitido', detalhe: `cadastrada pela direção com o código INEP ${inep}`,
      });
      return true;
    });
    if (resultado instanceof ErroApi) throw resultado;
    return c.json({ ok: true, redeId }, 201);
  });

  /* ---------- Convite da escola: a página pública do link ---------- */

  /** Acha o convite pelo token do link (ou, em Minha conta, pelo id). Sem convite, null: não revela nada. */
  async function acharConvite(db: Cliente, onde: { token: string } | { id: string }) {
    const porToken = 'token' in onde;
    const valor = porToken ? hashDoToken(onde.token) : onde.id;
    const rede = (await db.query<{ rede_id: string }>(
      `select rede_id from tokens_convite where ${porToken ? 'token_hash' : 'convite_id'} = $1`, [valor],
    )).rows[0]?.rede_id;
    if (!rede) return null;
    await definirRede(db, rede);
    const cv = (await db.query<{ id: string; rede_id: string; escola_id: string; email: string; perfil: Perfil; expira_em: string; aceito_em: string | null; cancelado_em: string | null; escola: string; vencido: boolean }>(
      `select c.*, e.nome as escola, c.expira_em <= now() as vencido from convites c join escolas e on e.id = c.escola_id
        where ${porToken ? 'c.token_hash' : 'c.id'} = $1`, [valor],
    )).rows[0];
    return cv ?? null;
  }
  type ConviteAchado = NonNullable<Awaited<ReturnType<typeof acharConvite>>>;
  const situacao = (cv: { aceito_em: string | null; cancelado_em: string | null; vencido: boolean }): ConvitePublico['situacao'] =>
    cv.aceito_em ? 'aceito' : cv.cancelado_em ? 'cancelado' : cv.vencido ? 'vencido' : 'pendente';

  app.get('/convites/:token', async (c) => {
    const r = await naRede({ redeId: null }, async (db) => {
      const cv = await acharConvite(db, { token: c.req.param('token') });
      if (!cv) throw naoEncontrado('Este convite não existe. Confira o link ou peça um novo à direção da escola.');
      const temConta = Boolean((await db.query('select 1 from hash_da_senha($1)', [cv.email])).rowCount);
      return { escola: cv.escola, perfil: cv.perfil as ConvitePublico['perfil'], email: cv.email, expiraEm: cv.expira_em, situacao: situacao(cv), temConta } satisfies ConvitePublico;
    });
    return c.json(r);
  });

  /**
   * Aceita o convite. Sem conta para o e-mail: cria a conta com nome e senha.
   * Com conta: exige estar logado com ela e só acrescenta a escola. O link nunca
   * define nem troca a senha de uma conta que já existe.
   */
  async function aceitar(db: Cliente, c: Context, cv: ConviteAchado | null, p: { nome?: string; senha?: string }, senhaHash: string | null) {
    if (!cv) return naoEncontrado('Este convite não existe. Confira o link ou peça um novo à direção da escola.');
    const s = situacao(cv);
    if (s === 'aceito') return conflito('Este convite já foi aceito. Entre com o seu e-mail e senha.');
    if (s === 'cancelado') return conflito('Este convite foi cancelado ou recusado. Fale com a direção da escola.');
    if (s === 'vencido') return conflito('Este convite venceu. Peça um link novo à direção da escola.');

    const conta = (await db.query<{ usuario_id: string }>('select usuario_id from hash_da_senha($1)', [cv.email])).rows[0];
    let usuarioId: string;
    if (conta) {
      const sessao = await sessaoAtual(db, c);
      if (!sessao || sessao.mfa_pendente || sessao.usuario_id !== conta.usuario_id) {
        return semPermissao('Este e-mail já tem conta. Entre com ela e abra o link do convite de novo.');
      }
      usuarioId = conta.usuario_id;
    } else {
      if ((p.nome ?? '').trim().length < 3) return validacao('Informe seu nome completo.');
      if (!senhaHash || !senhaAceitavel(p.senha!)) return validacao('A senha precisa ter pelo menos 12 caracteres. Uma frase é uma boa senha.');
      usuarioId = (await db.query<{ id: string }>('select criar_conta_convidada($1, $2, $3) as id', [p.nome!.trim(), cv.email, senhaHash])).rows[0].id;
    }
    await db.query(`select set_config('app.usuario_id', $1, true)`, [usuarioId]);

    // Uma pessoa tem um perfil só por rede. Já atua nela com o mesmo perfil: a escola entra nesse vínculo.
    // Com outro perfil, recusa: aceitar daria a ela, na escola nova, um acesso que a direção não deu.
    const atual = (await db.query<{ id: string; perfil: Perfil }>('select id, perfil from vinculos where usuario_id = $1 and rede_id = $2', [usuarioId, cv.rede_id])).rows[0];
    if (atual && atual.perfil !== cv.perfil) {
      return conflito('Você já atua nesta rede com outro perfil, e cada pessoa tem um perfil só por rede. Peça à direção um convite com o mesmo perfil.');
    }
    let vinculoId = atual?.id;
    if (!vinculoId) {
      vinculoId = (await db.query<{ id: string }>('insert into vinculos (usuario_id, rede_id, perfil) values ($1, $2, $3) returning id', [usuarioId, cv.rede_id, cv.perfil])).rows[0].id;
    }
    await db.query('insert into vinculo_escolas (vinculo_id, rede_id, escola_id) values ($1, $2, $3) on conflict do nothing', [vinculoId, cv.rede_id, cv.escola_id]);
    await db.query('update convites set aceito_em = now() where id = $1', [cv.id]);
    await db.query(
      `insert into auditoria (rede_id, ator, perfil, acao, recurso, resultado, detalhe) values ($1, $2, $3, 'administracao', 'convite', 'permitido', 'aceito')`,
      [cv.rede_id, p.nome?.trim() || cv.email, cv.perfil],
    );
    return { novaConta: !conta };
  }

  app.post('/convites/:token/aceitar', async (c) => {
    const p = await corpo(c, esquemaAceitarConvite);
    const senhaHash = p.senha ? await hashDaSenha(p.senha) : null;
    const resultado = await naRede<{ novaConta: boolean } | ErroApi>({ redeId: null }, async (db) =>
      aceitar(db, c, await acharConvite(db, { token: c.req.param('token') }), p, senhaHash));
    if (resultado instanceof ErroApi) throw resultado;
    return c.json(resultado);
  });

  /* ---------- Convites recebidos, em Minha conta (só para quem já entrou) ---------- */

  /** E-mail de quem está logado, com o segundo fator concluído. */
  async function emailDaSessao(db: Cliente, c: Context) {
    const sessao = await sessaoAtual(db, c);
    if (!sessao || sessao.mfa_pendente) return null;
    await db.query(`select set_config('app.usuario_id', $1, true)`, [sessao.usuario_id]);
    return (await db.query<{ email: string }>('select lower(email) as email from usuarios where id = $1', [sessao.usuario_id])).rows[0]?.email ?? null;
  }

  app.get('/convites', async (c) => {
    const lista = await naRede({ redeId: null }, async (db) => {
      const email = await emailDaSessao(db, c);
      if (!email) throw naoAutenticado();
      const achados: ConviteRecebido[] = [];
      const ids = (await db.query<{ convite_id: string }>('select convite_id from tokens_convite where email = $1', [email])).rows;
      for (const { convite_id } of ids) {
        const cv = await acharConvite(db, { id: convite_id });
        if (cv && situacao(cv) === 'pendente') achados.push({ id: cv.id, escola: cv.escola, perfil: cv.perfil as ConviteRecebido['perfil'], expiraEm: cv.expira_em });
      }
      return achados;
    });
    return c.json(lista);
  });

  app.post('/convites/recebidos/:id/aceitar', async (c) => {
    const resultado = await naRede<{ novaConta: boolean } | ErroApi>({ redeId: null }, async (db) => {
      const email = await emailDaSessao(db, c);
      if (!email) return naoAutenticado();
      const cv = await acharConvite(db, { id: c.req.param('id') });
      // O convite de outra pessoa não existe para quem consulta.
      return aceitar(db, c, cv?.email === email ? cv : null, {}, null);
    });
    if (resultado instanceof ErroApi) throw resultado;
    return c.json(resultado);
  });

  app.post('/convites/recebidos/:id/recusar', async (c) => {
    const resultado = await naRede<true | ErroApi>({ redeId: null }, async (db) => {
      const email = await emailDaSessao(db, c);
      if (!email) return naoAutenticado();
      const cv = await acharConvite(db, { id: c.req.param('id') });
      if (!cv || cv.email !== email || situacao(cv) !== 'pendente') return naoEncontrado('Convite não encontrado.');
      await db.query('update convites set cancelado_em = now() where id = $1', [cv.id]);
      await db.query(
        `insert into auditoria (rede_id, ator, perfil, acao, recurso, resultado, detalhe) values ($1, $2, $3, 'administracao', 'convite', 'permitido', 'recusado')`,
        [cv.rede_id, email, cv.perfil],
      );
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
