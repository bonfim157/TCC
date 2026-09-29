import { serve } from '@hono/node-server';
import { criarApp } from './app';
import { configurarBanco } from './banco/conexao';
import { iniciarBancoLocal } from './banco/local';
import { migrar } from './banco/migrar';
import { carregarSeed } from './banco/seed';

/*
 * Servidor de desenvolvimento: banco local (PGlite), migrações, dados
 * fictícios e a API em http://localhost:3000/api. O front em modo real
 * (VITE_API=real) encaminha /api para cá.
 *
 * Com DATABASE_URL definida, usa esse banco (ex.: uma branch da Neon) em vez do local.
 */
process.env.TCC_LOGIN_DEMO ??= '1';

const porta = Number(process.env.PORTA ?? 3000);
let url = process.env.DATABASE_URL;
let local: Awaited<ReturnType<typeof iniciarBancoLocal>> | null = null;
if (!url) {
  local = await iniciarBancoLocal();
  url = local.url;
  console.log('banco local (PGlite) em memória');
}
const pool = configurarBanco(url, { max: local ? 1 : 5 });
await migrar(pool, console.log);
await carregarSeed(pool);
console.log('dados fictícios carregados');

serve({ fetch: criarApp().fetch, port: porta }, () => console.log(`API em http://localhost:${porta}/api`));

process.on('SIGINT', async () => {
  await pool.end();
  await local?.parar();
  process.exit(0);
});
