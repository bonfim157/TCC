import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { comoDono } from './conexao';

const pasta = fileURLToPath(new URL('./migracoes/', import.meta.url));

/**
 * Aplica as migrações ainda não aplicadas, em ordem, como o dono do banco.
 * Cada migração roda numa transação: ou entra inteira, ou nada muda.
 */
export function migrar(log: (m: string) => void = () => {}) {
  return comoDono(async (c) => {
    await c.query('create table if not exists migracoes (nome text primary key, aplicada_em timestamptz not null default now())');
    const aplicadas = new Set((await c.query<{ nome: string }>('select nome from migracoes')).rows.map((r) => r.nome));
    const arquivos = readdirSync(pasta).filter((a) => a.endsWith('.sql')).sort();
    for (const arquivo of arquivos) {
      if (aplicadas.has(arquivo)) continue;
      try {
        await c.query('begin');
        await c.query(readFileSync(pasta + arquivo, 'utf8'));
        await c.query('insert into migracoes (nome) values ($1)', [arquivo]);
        await c.query('commit');
        log(`migração aplicada: ${arquivo}`);
      } catch (e) {
        await c.query('rollback');
        throw new Error(`migração ${arquivo} falhou: ${(e as Error).message}`);
      }
    }
  });
}
