// Verificação: a Central se atualiza sozinha quando outra pessoa altera um caso (pendência 22).
// Uso: npm run dev (em outro terminal) e depois node scripts/verificacao/f3-atualizacao.mjs
import { chromium } from 'playwright';

const B = 'http://localhost:5173';
const log = (...a) => console.log(...a);
const b = await chromium.launch();
// Um só contexto: as duas abas compartilham os dados da demonstração, como duas pessoas na mesma rede.
const ctx = await b.newContext({ viewport: { width: 1440, height: 1000 } });
const dialogo = (p) => p.locator('dialog[open]');

async function entrar(nome) {
  const p = await ctx.newPage();
  p.on('pageerror', (e) => log('PAGEERROR', e.message));
  await p.goto(`${B}/entrar?rede=sp`);
  await p.waitForTimeout(700);
  await p.getByLabel(nome, { exact: false }).check();
  await p.getByRole('button', { name: 'Entrar' }).click();
  await p.waitForTimeout(900);
  return p;
}

const carlos = await entrar('Carlos Mendes');
await carlos.goto(`${B}/central/oc-sp-484`);
await carlos.waitForTimeout(1200);
const item484 = carlos.locator('.fila-item', { hasText: '2026-000484' });
log('Carlos vê 484 antes:', await item484.locator('.fila-sinais .etiqueta').first().textContent(), '|', await item484.locator('.fila-meta').textContent());
// Carlos deixa um diálogo aberto enquanto a direção age
await carlos.getByRole('button', { name: 'Registrar escuta' }).click().catch(() => log('(sem botão Registrar escuta)'));
await carlos.waitForTimeout(300);
const dialogoAntes = await dialogo(carlos).count();

const beatriz = await entrar('Beatriz Nunes');
await beatriz.goto(`${B}/central/oc-sp-484`);
await beatriz.waitForTimeout(1200);
await beatriz.getByRole('button', { name: 'Concluir triagem' }).click();
await beatriz.waitForTimeout(400);
await dialogo(beatriz).getByLabel('Quem vai conduzir o caso').selectOption({ label: 'Carlos Mendes, coordenação' });
await dialogo(beatriz).getByRole('button', { name: 'Concluir triagem' }).click();
await beatriz.waitForTimeout(1000);

// Sem recarregar a página de Carlos
await carlos.waitForTimeout(1500);
log('Carlos vê 484 depois, sem recarregar:', await item484.locator('.fila-sinais .etiqueta').first().textContent(), '|', await item484.locator('.fila-meta').textContent());
log('caso aberto de Carlos:', await carlos.locator('.caso-central-titulo .etiqueta').first().textContent());
log('diálogo de Carlos continua aberto:', dialogoAntes, '->', await dialogo(carlos).count());

// Volta à aba também atualiza (visibilitychange); a consulta repetida não enche a auditoria
const consultas = await carlos.evaluate(() => {
  const chave = Object.keys(localStorage).find((k) => k.startsWith('demo.banco'));
  const banco = JSON.parse(localStorage.getItem(chave));
  return banco.auditoria.filter((r) => r.acao === 'consulta' && r.recurso === 'caso 2026-000484' && r.ator === 'Carlos Mendes').length;
});
log('registros de consulta de Carlos ao 484 na auditoria:', consultas);

await b.close();
