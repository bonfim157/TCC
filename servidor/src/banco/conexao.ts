import pg from 'pg';

/*
 * Conexão com o Postgres. O mesmo código roda contra a Neon (produção e
 * previews) e contra o PGlite local (desenvolvimento e testes), porque os
 * dois falam o protocolo padrão do Postgres.
 */

// Datas sem hora voltam como texto AAAA-MM-DD, como no contrato;
// datas com hora voltam em ISO 8601.
pg.types.setTypeParser(1082, (v) => v);
// Horário de Brasília (sem horário de verão desde 2019), como nos dados da demonstração:
// a tela compara o dia do registro com o dia de hoje pelo texto da data.
const lerDataHora = pg.types.getTypeParser(1184) as (v: string) => Date;
pg.types.setTypeParser(1184, (v) => `${new Date(lerDataHora(v).getTime() - 3 * 3600_000).toISOString().slice(0, 19)}-03:00`);
pg.types.setTypeParser(20, (v) => Number(v));

/*
 * Dois acessos ao banco, com poderes diferentes:
 *
 * - A aplicação (DATABASE_URL) conecta como um papel que NÃO é dono das
 *   tabelas. Mesmo uma consulta feita por engano fora de `naRede` não enxerga
 *   linhas de nenhuma rede, não altera a auditoria e não lê hash de senha.
 * - O dono (DATABASE_URL_DONO) só é usado por migrações e pelo seed. Em
 *   produção essa variável não é definida para as funções da API.
 *
 * No banco local (PGlite) existe uma conexão só, que entra como superusuário:
 * ela fica no papel da aplicação e troca para o dono apenas durante `comoDono`.
 */
let pool: pg.Pool | null = null;
let poolDono: pg.Pool | null = null;
let donoLocal: string | null = null;

const PAPEL_DA_APLICACAO = 'app_tcc';

export function configurarBanco(url: string, opcoes: { max?: number; urlDono?: string; donoLocal?: string } = {}) {
  pool = new pg.Pool({ connectionString: url, max: opcoes.max ?? 5 });
  donoLocal = opcoes.donoLocal ?? null;
  if (donoLocal) pool.on('connect', (c) => { c.query(`set role ${PAPEL_DA_APLICACAO}`).catch(() => {}); });
  poolDono = opcoes.urlDono ? new pg.Pool({ connectionString: opcoes.urlDono, max: 1 }) : null;
  return pool;
}

export function banco(): pg.Pool {
  if (!pool) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error('DATABASE_URL não definida');
    configurarBanco(url, { urlDono: process.env.DATABASE_URL_DONO });
  }
  return pool!;
}

export async function fecharBanco() {
  await pool?.end();
  await poolDono?.end();
  pool = null;
  poolDono = null;
  donoLocal = null;
}

export type Cliente = pg.PoolClient;

/** Este ambiente tem acesso de dono (migrações, seed)? Em produção, a API não tem. */
export function temDono() {
  banco();
  return Boolean(poolDono || donoLocal);
}

/** Executa como dono do banco. Só para migrações e seed; nunca para atender requisições. */
export async function comoDono<T>(fn: (c: Cliente) => Promise<T>): Promise<T> {
  banco();
  if (poolDono) {
    const c = await poolDono.connect();
    try {
      return await fn(c);
    } finally {
      c.release();
    }
  }
  if (!donoLocal) throw new Error('Este ambiente não tem acesso de dono ao banco.');
  const c = await pool!.connect();
  try {
    await c.query(`set role ${donoLocal}`);
    return await fn(c);
  } finally {
    await c.query('rollback').catch(() => {});
    await c.query(`set role ${PAPEL_DA_APLICACAO}`);
    c.release();
  }
}

/**
 * Executa `fn` numa transação como o papel da aplicação, com a rede (e a
 * pessoa) informadas ao banco. Tudo o que a Row-Level Security filtra passa
 * por aqui. Sem rede, as tabelas por rede não mostram nada.
 */
export async function naRede<T>(
  contexto: { redeId: string | null; usuarioId?: string | null },
  fn: (c: Cliente) => Promise<T>,
): Promise<T> {
  const c = await banco().connect();
  try {
    await c.query('begin');
    await c.query('set local role app_tcc');
    await c.query(`select set_config('app.rede_id', $1, true), set_config('app.usuario_id', $2, true)`, [
      contexto.redeId ?? '',
      contexto.usuarioId ?? '',
    ]);
    const resultado = await fn(c);
    await c.query('commit');
    return resultado;
  } catch (e) {
    await c.query('rollback').catch(() => {});
    throw e;
  } finally {
    c.release();
  }
}

/** Troca a rede no meio da transação (ex.: página pública, que só descobre a rede pelo token). */
export async function definirRede(c: Cliente, redeId: string) {
  await c.query(`select set_config('app.rede_id', $1, true)`, [redeId]);
}
