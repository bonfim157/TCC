import { PGlite } from '@electric-sql/pglite';
import { PGLiteSocketServer } from '@electric-sql/pglite-socket';

/**
 * Postgres local sem Docker: o PGlite (Postgres compilado para WebAssembly)
 * atende no protocolo padrão, então o servidor usa o mesmo driver `pg` que
 * usa com a Neon. Só para desenvolvimento e testes.
 *
 * O PGlite atende uma conexão por vez; o servidor e os testes usam pool com
 * uma conexão só, para as transações não se misturarem.
 */
/** Dono das tabelas no banco local: papel comum, sem superusuário. */
export const DONO_LOCAL = 'dono_tcc';

export async function iniciarBancoLocal(opcoes: { pasta?: string; porta?: number } = {}) {
  const db = await PGlite.create(opcoes.pasta ? { dataDir: opcoes.pasta } : undefined);
  // O usuário padrão do PGlite é superusuário e ignora a Row-Level Security.
  // Na Neon o dono do banco não é superusuário: criamos um dono igual aqui,
  // para os testes pegarem o que só falharia em produção.
  await db.exec(`
    do $$ begin
      if not exists (select 1 from pg_roles where rolname = '${DONO_LOCAL}') then
        create role ${DONO_LOCAL} nologin createrole;
      end if;
    end $$;
    grant all on database postgres to ${DONO_LOCAL};
    grant all on schema public to ${DONO_LOCAL};
  `);
  const servidor = new PGLiteSocketServer({ db, port: opcoes.porta ?? 0, host: '127.0.0.1' });
  await servidor.start();
  const endereco = (servidor as unknown as { server: { address(): { port: number } } }).server.address();
  return {
    url: `postgres://postgres@127.0.0.1:${endereco.port}/postgres`,
    async parar() {
      await servidor.stop();
      await db.close();
    },
  };
}
