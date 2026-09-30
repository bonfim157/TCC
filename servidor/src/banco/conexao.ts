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

let pool: pg.Pool | null = null;

export function configurarBanco(url: string, opcoes: { max?: number } = {}) {
  pool = new pg.Pool({ connectionString: url, max: opcoes.max ?? 5 });
  return pool;
}

export function banco(): pg.Pool {
  if (!pool) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error('DATABASE_URL não definida');
    configurarBanco(url);
  }
  return pool!;
}

export async function fecharBanco() {
  await pool?.end();
  pool = null;
}

export type Cliente = pg.PoolClient;

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
