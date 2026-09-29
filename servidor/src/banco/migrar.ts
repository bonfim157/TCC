import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import type pg from 'pg';

const pasta = fileURLToPath(new URL('./migracoes/', import.meta.url));

/**
 * Aplica as migrações ainda não aplicadas, em ordem, como o dono do banco.
 * Cada migração roda numa transação: ou entra inteira, ou nada muda.
 */
export async function migrar(pool: pg.Pool, log: (m: string) => void = () => {}) {
  await pool.query('create table if not exists migracoes (nome text primary key, aplicada_em timestamptz not null default now())');
  const aplicadas = new Set((await pool.query<{ nome: string }>('select nome from migracoes')).rows.map((r) => r.nome));
  const arquivos = readdirSync(pasta).filter((a) => a.endsWith('.sql')).sort();
  for (const arquivo of arquivos) {
    if (aplicadas.has(arquivo)) continue;
    const c = await pool.connect();
    try {
      await c.query('begin');
      await c.query(readFileSync(pasta + arquivo, 'utf8'));
      await c.query('insert into migracoes (nome) values ($1)', [arquivo]);
      await c.query('commit');
      log(`migração aplicada: ${arquivo}`);
    } catch (e) {
      await c.query('rollback');
      throw new Error(`migração ${arquivo} falhou: ${(e as Error).message}`);
    } finally {
      c.release();
    }
  }
}
