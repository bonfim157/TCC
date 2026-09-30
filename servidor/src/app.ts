import { Hono } from 'hono';
import type { Categoria, Rede, Sessao, Usuario } from '@tcc/compartilhado/contrato';
import { esquemaNovaSessao } from '@tcc/compartilhado/esquemas';
import { loginDemoAtivo } from './ambiente';
import { banco, comoDono, naRede, temDono } from './banco/conexao';
import { carregarSeed } from './banco/seed';
import { auditar, comContexto, escolasDoVinculo, vinculosDe } from './contexto';
import { ErroApi, naoEncontrado, semPermissao } from './erros';
import { rotasDeAcesso } from './rotas/acesso';
import { rotasDaCentral } from './rotas/central';
import { rotasDeGestao } from './rotas/gestao';
import { rotasDeRegistro } from './rotas/registro';
import { corpo } from './util';
import { hashDoToken, novoToken } from './seguranca';

/** Validade da sessão. */
const HORAS_DE_SESSAO = 8;


export function criarApp() {
  const app = new Hono().basePath('/api');

  app.onError((e, c) => {
    if (e instanceof ErroApi) return c.json(e.corpo(), e.status);
    console.error('[servidor]', e);
    return c.json({ codigo: 'erro_interno', mensagem: 'O servidor não conseguiu concluir o pedido.' }, 500);
  });

  app.notFound((c) => c.json(naoEncontrado('Esta função ainda não está disponível no servidor.').corpo(), 404));

  /* ---------- Saúde ---------- */
  app.get('/saude', async (c) => {
    await banco().query('select 1');
    return c.json({ ok: true });
  });

  /* ---------- Redes e sessão ---------- */
  app.get('/redes', async (c) => {
    const redes = await naRede({ redeId: null }, (db) =>
      db.query<Rede>('select id, nome, secretaria, municipio, uf, esfera, sigla, subdominio from redes order by nome'),
    );
    return c.json(redes.rows);
  });

  app.get('/redes/:redeId/usuarios-demo', async (c) => {
    if (!loginDemoAtivo()) throw naoEncontrado('Esta função não existe neste ambiente.');
    const redeId = c.req.param('redeId');
    const lista = await naRede({ redeId }, async (db) => {
      const r = await db.query<{ id: string; nome: string }>(
        `select distinct u.id, u.nome from usuarios u join vinculos v on v.usuario_id = u.id where v.rede_id = $1 order by u.nome`,
        [redeId],
      );
      // Só o vínculo com esta rede: a lista pública não revela em quais outras redes a pessoa atua.
      const usuarios: Usuario[] = [];
      for (const u of r.rows) {
        const vinculos = (await vinculosDe(db, u.id)).filter((v) => v.redeId === redeId);
        usuarios.push({ ...u, vinculos });
      }
      return usuarios;
    });
    return c.json(lista);
  });

  app.post('/sessoes', async (c) => {
    if (!loginDemoAtivo()) throw naoEncontrado('Esta função não existe neste ambiente.');
    const { redeId, usuarioId } = await corpo(c, esquemaNovaSessao, 'Escolha a rede e a pessoa.');
    const sessao = await naRede({ redeId, usuarioId }, async (db) => {
      const u = await db.query<{ id: string; nome: string }>('select id, nome from usuarios where id = $1', [usuarioId]);
      const vinculos = u.rows[0] ? await vinculosDe(db, usuarioId) : [];
      const vinculo = vinculos.find((v) => v.redeId === redeId);
      if (!u.rows[0] || !vinculo) throw semPermissao('Esta pessoa não tem vínculo com a rede escolhida.');
      const token = novoToken();
      await db.query(
        `insert into sessoes (token_hash, usuario_id, expira_em) values ($1, $2, now() + make_interval(hours => $3))`,
        [hashDoToken(token), usuarioId, HORAS_DE_SESSAO],
      );
      const usuario: Usuario = { ...u.rows[0], vinculos };
      await auditar(db, { usuario, vinculo }, 'login', 'sessão');
      return { token, usuario } satisfies Sessao;
    });
    return c.json(sessao);
  });

  /**
   * Volta o banco aos dados fictícios iniciais. Os roteiros do navegador chamam
   * antes de cada rodada, para partir sempre do mesmo estado. Como o login de
   * demonstração, só existe fora de produção.
   */
  app.post('/diagnostico/restaurar', async (c) => {
    if (!loginDemoAtivo() || !temDono()) throw naoEncontrado('Esta função não existe neste ambiente.');
    await carregarSeed();
    // Para testar o primeiro acesso de um perfil de gestão: tira o segundo fator de uma pessoa fictícia.
    const semSegundoFator = c.req.query('semSegundoFator');
    if (semSegundoFator) {
      await comoDono(async (db) => {
        await db.query('begin');
        await db.query(`select set_config('app.usuario_id', $1, true)`, [semSegundoFator]);
        await db.query('delete from fatores_mfa where usuario_id = $1', [semSegundoFator]);
        await db.query('commit');
      });
    }
    // Para testar a troca obrigatória de senha: marca a senha de uma pessoa fictícia como temporária.
    const senhaTemporaria = c.req.query('senhaTemporaria');
    if (senhaTemporaria) await comoDono((db) => db.query('update usuarios set senha_temporaria = true where id = $1', [senhaTemporaria]));
    return c.json({ ok: true });
  });

  /** Erro de propósito, para o Guia da interface mostrar a tela de falha. Só fora de produção. */
  app.get('/diagnostico/falha', () => {
    if (!loginDemoAtivo()) throw naoEncontrado('Esta função não existe neste ambiente.');
    throw new ErroApi(500, 'erro_interno', 'O servidor não conseguiu concluir o pedido.');
  });

  /* ---------- Cadastros da rede ---------- */
  app.get('/escolas', (c) => comContexto(c.req.raw.headers, async (db, ctx) => c.json(await escolasDoVinculo(db, ctx.vinculo))));

  app.get('/categorias', (c) =>
    comContexto(c.req.raw.headers, async (db) => {
      const r = await db.query<Categoria & { rede_id: string }>(
        'select id, rede_id, nome, ativa from categorias order by ordem',
      );
      return c.json(r.rows.map(({ rede_id, ...cat }) => ({ ...cat, redeId: rede_id })));
    }),
  );

  rotasDeAcesso(app);
  rotasDeRegistro(app);
  rotasDaCentral(app);
  rotasDeGestao(app);

  return app;
}
