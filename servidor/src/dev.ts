import { serve } from '@hono/node-server';
import { criarApp } from './app';
import { comoDono, configurarBanco, temDono } from './banco/conexao';
import { DONO_LOCAL, iniciarBancoLocal } from './banco/local';
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
const pool = configurarBanco(url, local ? { max: 1, donoLocal: DONO_LOCAL } : { max: 5, urlDono: process.env.DATABASE_URL_DONO });
if (temDono()) {
  await migrar(console.log);
  // A semente só entra num banco vazio: reiniciar o servidor não apaga o que foi digitado.
  // SEMEAR=1 força o recarregamento (volta aos dados fictícios).
  const vazio = (await comoDono((c) => c.query<{ n: number }>('select count(*)::int n from redes'))).rows[0].n === 0;
  if (vazio || process.env.SEMEAR === '1') {
    await carregarSeed();
    console.log('dados fictícios carregados');
  } else {
    console.log('banco já tem dados: semente não recarregada (use SEMEAR=1 para voltar aos dados fictícios)');
  }
} else {
  console.log('sem DATABASE_URL_DONO: migrações e seed não foram aplicados');
}

serve({ fetch: criarApp().fetch, port: porta }, () => console.log(`API em http://localhost:${porta}/api`));

process.on('SIGINT', async () => {
  await pool.end();
  await local?.parar();
  process.exit(0);
});
