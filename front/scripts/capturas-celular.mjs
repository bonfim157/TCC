// Revisão do celular: capturas de todas as telas e medidas do que costuma quebrar.
// Uso: npm run dev e depois node scripts/capturas-celular.mjs [largura] [pasta]
import { chromium } from 'playwright';
import { fileURLToPath } from 'node:url';
import { mkdirSync } from 'node:fs';

const largura = Number(process.argv[2] ?? 360);
const out = process.argv[3] ?? fileURLToPath(new URL(`../output/celular-${largura}/`, import.meta.url));
mkdirSync(out, { recursive: true });
const B = 'http://localhost:5173';
const b = await chromium.launch();

/** Medidas: rolagem lateral, onde começa o conteúdo, o que vaza da tela e alvos pequenos. */
const medir = (p) => p.evaluate(() => {
  const vw = document.documentElement.clientWidth;
  const h1 = document.querySelector('main h1');
  const vazam = [...document.querySelectorAll('body *')]
    .filter((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.right > vw + 1 && getComputedStyle(e).position !== 'fixed'; })
    .filter((e) => !e.closest('.tabela-rolagem, .abas-lista, [hidden], dialog:not([open])'))
    .slice(0, 5).map((e) => `${e.tagName.toLowerCase()}.${[...e.classList].join('.')}(${Math.round(e.getBoundingClientRect().right)})`);
  const alvos = [...document.querySelectorAll('main a, main button, main input, main select, main summary, header a, header button')]
    .filter((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && r.height < 40 && !(e.tagName === 'A' && getComputedStyle(e).display === 'inline'); })
    .slice(0, 5).map((e) => `${e.tagName.toLowerCase()}:${(e.textContent || e.getAttribute('aria-label') || '').trim().slice(0, 24)}(${Math.round(e.getBoundingClientRect().height)})`);
  return {
    lateral: document.documentElement.scrollWidth - vw,
    inicioConteudo: h1 ? Math.round(h1.getBoundingClientRect().top + scrollY) : null,
    vazam, alvos,
  };
});

let n = 0;
async function foto(p, nome) {
  await p.waitForTimeout(400);
  const m = await medir(p);
  n++;
  const id = String(n).padStart(2, '0');
  await p.screenshot({ path: `${out}/${id}-${nome}.png`, fullPage: true });
  console.log(`${id} ${nome.padEnd(28)} lateral=${m.lateral} conteúdo@${m.inicioConteudo}px` +
    (m.vazam.length ? ` VAZAM ${m.vazam.join(' ')}` : '') + (m.alvos.length ? ` PEQUENOS ${m.alvos.join(' ')}` : ''));
}

async function entrar(ctx, nome) {
  const p = await ctx.newPage();
  await p.goto(`${B}/entrar?rede=sp`);
  await p.waitForTimeout(700);
  await p.getByLabel(nome, { exact: false }).check();
  await p.getByRole('button', { name: 'Entrar' }).click();
  await p.waitForTimeout(1000);
  return p;
}
const ir = async (p, caminho) => { await p.goto(`${B}${caminho}`); await p.waitForTimeout(900); };
const novo = () => b.newContext({ viewport: { width: largura, height: 780 }, isMobile: true, hasTouch: true, deviceScaleFactor: 1 });

// Sem sessão
{
  const ctx = await novo();
  const p = await ctx.newPage();
  await ir(p, '/entrar?rede=sp'); await foto(p, 'entrar');
  await ir(p, '/duvidas'); await foto(p, 'duvidas-publica');
  await ir(p, '/ciencia/demo-482-gabriel'); await foto(p, 'ciencia');
  await ctx.close();
}
// Professora
{
  const ctx = await novo();
  const p = await entrar(ctx, 'Ana Ribeiro');
  await foto(p, 'inicio-professora');
  await p.locator('.botao-menu').click(); await foto(p, 'menu-aberto');
  await p.locator('.botao-menu').click();
  await p.locator('.contexto-celular summary').click(); await foto(p, 'contexto-aberto');
  await ir(p, '/registrar'); await foto(p, 'registrar-1');
  await p.getByRole('button', { name: 'Continuar' }).click(); await foto(p, 'registrar-1-erros');
  await p.getByLabel('Convivência ou conflito').check();
  await p.getByLabel('Data').fill('2026-09-25');
  await p.getByLabel('Horário aproximado').fill('09:40');
  await p.getByLabel('Local').fill('Pátio');
  await p.getByLabel('Relato do que aconteceu').fill('Dois estudantes discutiram na fila da cantina e um derrubou a bandeja do outro.');
  await p.getByLabel('Não').check();
  await p.getByRole('button', { name: 'Continuar' }).click(); await p.waitForTimeout(500);
  await p.getByLabel('Buscar pessoa da escola').fill('7º'); await p.waitForTimeout(600);
  await foto(p, 'registrar-2-busca');
  await p.getByRole('button', { name: 'Incluir Gabriel M.' }).click(); await foto(p, 'registrar-2');
  await p.getByRole('button', { name: 'Continuar' }).click(); await foto(p, 'registrar-3');
  await ir(p, '/meus-registros'); await foto(p, 'meus-registros');
  await ir(p, '/casos/oc-sp-482'); await foto(p, 'caso-autora');
  await ir(p, '/guia'); await foto(p, 'guia');
  await ir(p, '/acessibilidade'); await foto(p, 'acessibilidade');
  await ctx.close();
}
// Coordenação
{
  const ctx = await novo();
  const p = await entrar(ctx, 'Carlos Mendes');
  await foto(p, 'inicio-coordenacao');
  await ir(p, '/central'); await foto(p, 'central');
  await ir(p, '/central/oc-sp-483'); await foto(p, 'central-caso-483');
  await ir(p, '/central/oc-sp-482');
  await p.getByRole('button', { name: 'Encerrar caso' }).click(); await foto(p, 'dialogo-encerrar');
  await p.keyboard.press('Escape');
  await ir(p, '/buscar'); await p.getByRole('button', { name: 'Buscar' }).click(); await foto(p, 'buscar');
  await ctx.close();
}
// Direção
{
  const ctx = await novo();
  const p = await entrar(ctx, 'Beatriz Nunes');
  await ir(p, '/relatorios'); await foto(p, 'relatorios');
  await ir(p, '/administracao'); await foto(p, 'administracao');
  await ctx.close();
}
await b.close();
console.log('capturas em', out);
