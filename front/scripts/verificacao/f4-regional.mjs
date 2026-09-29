// Verificação: visão da regional com mais de uma escola, sem nunca misturar redes (pendência 26).
// Usa a rede fictícia de testes, que tem duas escolas na mesma regional.
// Uso: npm run dev (em outro terminal) e depois node scripts/verificacao/f4-regional.mjs
import { chromium } from 'playwright';

const B = 'http://localhost:5173';
const log = (...a) => console.log(...a);
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 1440, height: 1000 } });

async function entrar(rede, nome) {
  const p = await ctx.newPage();
  p.on('pageerror', (e) => log('PAGEERROR', e.message));
  await p.goto(`${B}/entrar?rede=${rede}`);
  await p.waitForTimeout(700);
  await p.getByLabel(nome, { exact: false }).check();
  await p.getByRole('button', { name: 'Entrar' }).click();
  await p.waitForTimeout(900);
  return p;
}

const rita = await entrar('teste', 'Rita Moraes');
log('escolas no seletor da regional:', (await rita.locator('.contexto select option').allTextContents()).join(' | '));

await rita.goto(`${B}/buscar`);
await rita.waitForTimeout(800);
await rita.getByRole('button', { name: 'Buscar' }).click();
await rita.waitForTimeout(1200);
log('regional fictícia, busca:', await rita.locator('#t-resultados').textContent());
const escolasNaBusca = [...new Set(await rita.locator('tbody tr td:nth-child(5)').allTextContents())];
log('escolas nos resultados:', escolasNaBusca.join(' | '));
log('algum caso da IMSIL (rede SP):', escolasNaBusca.some((e) => e.includes('IMSIL')));
log('links para abrir casos:', await rita.locator('tbody a').count());

await rita.goto(`${B}/relatorios`);
await rita.waitForTimeout(800);
await rita.getByRole('button', { name: /Gerar|Atualizar|Ver relatório/ }).first().click().catch(() => {});
await rita.waitForTimeout(1200);
const escopo = await rita.locator('.pagina').getByText(/Regional Fictícia/).first().textContent().catch(() => '(sem escopo)');
log('escopo do relatório:', escopo.trim().slice(0, 90));
const porEscola = rita.locator('table.barras', { has: rita.locator('caption', { hasText: 'Casos por escola' }) });
log('barras por escola:', (await porEscola.locator('tbody tr').allTextContents()).map((t) => t.replace(/\s+/g, ' ').trim()).join(' | '));

// A regional de São Paulo continua vendo só a IMSIL e não recebe a quebra por escola
const marta = await entrar('sp', 'Marta Siqueira');
await marta.goto(`${B}/relatorios`);
await marta.waitForTimeout(800);
await marta.getByRole('button', { name: /Gerar|Atualizar|Ver relatório/ }).first().click().catch(() => {});
await marta.waitForTimeout(1200);
log('regional SP, barras por escola:', await marta.locator('caption', { hasText: 'Casos por escola' }).count());
await marta.goto(`${B}/buscar`);
await marta.waitForTimeout(800);
await marta.getByRole('button', { name: 'Buscar' }).click();
await marta.waitForTimeout(1200);
const escolasSP = [...new Set(await marta.locator('tbody tr td:nth-child(5)').allTextContents())];
log('regional SP, escolas nos resultados:', escolasSP.join(' | '));

await b.close();
