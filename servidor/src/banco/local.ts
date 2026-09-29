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
export async function iniciarBancoLocal(opcoes: { pasta?: string; porta?: number } = {}) {
  const db = await PGlite.create(opcoes.pasta ? { dataDir: opcoes.pasta } : undefined);
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
