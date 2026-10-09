// Verificação no navegador. Uso: npm run dev (em outro terminal) e depois node scripts/verificacao/f1-regressao.mjs
// Capturas de tela vão para output/verificacao/ (fora do Git).
import { chromium } from 'playwright';
import { fileURLToPath } from 'node:url';
import { mkdirSync } from 'node:fs';
const out = process.argv[2] ?? fileURLToPath(new URL('../../output/verificacao/', import.meta.url));
mkdirSync(out, { recursive: true });
const B = 'http://localhost:5173';
// Com o servidor real (VITE_API=real), volta o banco aos dados iniciais; na simulação não faz nada.
await fetch(`${B}/api/diagnostico/restaurar`, { method: 'POST' }).catch(() => {});
const b = await chromium.launch();
const sw = (p) => p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
// 2. Timbre segue a rede escolhida; tema sobrevive à troca claro/escuro
{ const p = await (await b.newContext({ viewport: { width: 1280, height: 800 } })).newPage();
  await p.goto(B + '/entrar?rede=sp'); await p.waitForTimeout(700);
  await p.locator('.entrar-mais > summary').click(); await p.getByLabel('Rede Fictícia de Testes').check(); await p.waitForTimeout(300);
  const acc = () => p.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--accent').trim());
  console.log('timbre após escolher SC:', await p.locator('.timbre-rede').textContent(), '| brasão:', await p.locator('.brasao text').textContent(), '| acento:', await acc());
  await p.getByRole('button', { name: 'Aparência' }).click(); await p.getByLabel('Escuro').check(); await p.waitForTimeout(300);
  console.log('após modo escuro, acento:', await acc());
  // 3. Esc devolve foco
  await p.getByLabel('Claro').focus(); await p.keyboard.press('Escape'); await p.waitForTimeout(100);
  console.log('foco após Esc:', await p.evaluate(() => document.activeElement?.textContent));
  await p.close(); }
// 1. 360px com texto "Maior"
const ctx = await b.newContext({ viewport: { width: 360, height: 800 } });
await ctx.addInitScript(() => localStorage.setItem('pref.fonte', '130'));
const p = await ctx.newPage();
await p.goto(B + '/entrar?rede=sp'); await p.waitForTimeout(800);
console.log('/entrar 130% rolagem lateral:', await sw(p));
await p.screenshot({ path: `${out}/20-entrar-360-130.png` });
await p.getByLabel('Beatriz Nunes').check(); await p.getByRole('button', { name: 'Entrar' }).click(); await p.waitForTimeout(1000);
console.log('/ 130% rolagem lateral:', await sw(p));
await p.screenshot({ path: `${out}/21-inicio-360-130.png` });
await p.goto(B + '/guia'); await p.waitForTimeout(1500);
console.log('/guia 130% rolagem lateral:', await sw(p));
await p.evaluate(() => localStorage.setItem('pref.fonte', '100')); await p.reload(); await p.waitForTimeout(1200);
console.log('/guia 100% rolagem lateral:', await sw(p));
await p.screenshot({ path: `${out}/22-guia-360-100-topo.png` });
await b.close();
