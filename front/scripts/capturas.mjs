// Capturas das telas principais para revisão visual. Uso: npm run dev e depois node scripts/capturas.mjs [pasta]
import { chromium } from 'playwright';
import { fileURLToPath } from 'node:url';
import { mkdirSync } from 'node:fs';

const out = process.argv[2] ?? fileURLToPath(new URL('../output/capturas/', import.meta.url));
mkdirSync(out, { recursive: true });
const B = 'http://localhost:5173';
const b = await chromium.launch();

async function entrar(p, nome) {
  await p.goto(`${B}/entrar?rede=sp`);
  await p.waitForTimeout(700);
  // Perfis fora do dia a dia da escola ficam recolhidos em "Outros perfis e redes de teste".
  if (!(await p.getByLabel(nome, { exact: false }).isVisible())) await p.locator(".entrar-mais > summary").click();
  await p.getByLabel(nome, { exact: false }).check();
  await p.getByRole('button', { name: 'Entrar' }).click();
  await p.waitForTimeout(1000);
}

for (const [largura, sufixo] of [[1280, ''], [390, '-celular']]) {
  for (const esquema of ['light', 'dark']) {
    const ctx = await b.newContext({ viewport: { width: largura, height: 900 }, colorScheme: esquema });
    const p = await ctx.newPage();
    const tema = esquema === 'dark' ? '-escuro' : '';
    const foto = async (nome) => p.screenshot({ path: `${out}/${nome}${sufixo}${tema}.png`, fullPage: true });
    await p.goto(`${B}/entrar?rede=sp`);
    await p.waitForTimeout(800);
    await foto('01-entrar');
    if (esquema === 'dark' && largura !== 1280) { await ctx.close(); continue; }
    await entrar(p, 'Ana Ribeiro');
    await foto('02-inicio-professora');
    await p.goto(`${B}/meus-registros`); await p.waitForTimeout(900);
    await foto('03-meus-registros');
    await p.goto(`${B}/registrar`); await p.waitForTimeout(900);
    await foto('04-registrar');
    await p.goto(`${B}/casos/oc-sp-482`); await p.waitForTimeout(900);
    await foto('05-caso');
    await p.goto(`${B}/duvidas`); await p.waitForTimeout(700);
    await foto('06-duvidas');
    await p.goto(`${B}/acessibilidade`); await p.waitForTimeout(700);
    await foto('07-acessibilidade');
    await ctx.close();
    const ctx2 = await b.newContext({ viewport: { width: largura, height: 900 }, colorScheme: esquema });
    const q = await ctx2.newPage();
    const foto2 = async (nome) => q.screenshot({ path: `${out}/${nome}${sufixo}${tema}.png`, fullPage: true });
    await entrar(q, 'Beatriz Nunes');
    await foto2('08-inicio-direcao');
    await q.goto(`${B}/central/oc-sp-483`); await q.waitForTimeout(1200);
    await foto2('09-central');
    await q.goto(`${B}/relatorios`); await q.waitForTimeout(1000);
    await foto2('10-relatorios');
    await ctx2.close();
  }
}
await b.close();
console.log('capturas em', out);
