// Verificação no navegador. Uso: npm run dev (em outro terminal) e depois node scripts/verificacao/f2-registro.mjs
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
const log = (...a) => console.log(...a);

async function entrar(page, nome) {
  await page.goto(`${B}/entrar?rede=sp`);
  await page.waitForTimeout(700);
  await page.getByLabel(nome, { exact: false }).check();
  await page.getByRole('button', { name: 'Entrar' }).click();
  await page.waitForTimeout(900);
}

const ctx = await b.newContext({ viewport: { width: 1280, height: 900 } });
const p = await ctx.newPage();
p.on('pageerror', (e) => log('PAGEERROR', e.message));
await entrar(p, 'Ana Ribeiro');
await p.screenshot({ path: `${out}/30-inicio-ana.png` });
await p.getByRole('link', { name: 'Registrar ocorrência' }).first().click();
await p.waitForTimeout(800);

// 1. Continuar vazio: resumo de erros
await p.getByRole('button', { name: 'Continuar' }).click();
await p.waitForTimeout(300);
log('erros:', await p.locator('.resumo-erros li').allTextContents());
log('foco no resumo:', await p.evaluate(() => document.activeElement?.className));
await p.screenshot({ path: `${out}/31-erros.png`, fullPage: true });

// 2. Teclado: Tab pelo passo 1 a partir do título
await p.locator('h1').focus();
const ordem = [];
for (let i = 0; i < 16; i++) {
  await p.keyboard.press('Tab');
  ordem.push(await p.evaluate(() => { const a = document.activeElement; const l = a.labels?.[0]?.textContent || a.getAttribute('aria-label') || a.textContent; return `${a.tagName}:${(l || '').trim().slice(0, 28)}`; }));
}
log('ordem de tab:', ordem.join(' | '));

// Preencher com teclado onde possível
await p.getByLabel('Convivência ou conflito').focus();
await p.keyboard.press('Space');
await p.getByLabel('Data').fill('2026-09-25');
await p.getByLabel('Horário aproximado').fill('09:40');
await p.getByLabel('Local').fill('Pátio');
await p.getByLabel('Relato do que aconteceu').fill('Dois estudantes discutiram na fila da cantina e um derrubou a bandeja do outro.');
await p.getByLabel('Não').check();
await p.waitForTimeout(300);
log('salvo:', await p.locator('.registrar-salvo p').textContent());
log('url com rascunho:', p.url());

// 3. Recarregar mantém o rascunho
await p.reload();
await p.waitForTimeout(1500);
log('após recarregar, local =', await p.getByLabel('Local').inputValue(), '| relato tem', (await p.getByLabel('Relato do que aconteceu').inputValue()).length, 'caracteres');

await p.getByRole('button', { name: 'Continuar' }).click();
await p.waitForTimeout(500);
log('passo 2 título:', await p.locator('h1').textContent(), '| foco:', await p.evaluate(() => document.activeElement?.tagName));

// Envolvidos: busca
await p.getByLabel('Buscar pessoa da escola').fill('7º');
await p.waitForTimeout(800);
log('resultados:', await p.locator('.resultados-busca strong').allTextContents());
await p.getByRole('button', { name: 'Incluir Gabriel M.' }).click();
await p.getByLabel('Buscar pessoa da escola').fill('davi');
await p.waitForTimeout(800);
await p.getByRole('button', { name: 'Incluir Davi R.' }).click();
await p.getByRole('button', { name: 'A pessoa não está na lista' }).click();
await p.getByLabel('Nome ou forma de identificar').fill('Funcionária da cantina');
await p.getByLabel('Quem é').selectOption('outro');
await p.getByRole('button', { name: 'Incluir pessoa' }).click();
await p.locator('select').filter({ has: p.locator('option[value=somente_direcao]') }).nth(1).selectOption('somente_direcao');
await p.screenshot({ path: `${out}/32-envolvidos.png`, fullPage: true });
await p.getByRole('button', { name: 'Continuar' }).click();
await p.waitForTimeout(1200);

// 4. Revisão reflete e avisa duplicata
log('revisão onde:', await p.locator('.resumo div', { hasText: 'Onde' }).locator('dd').first().textContent());
log('revisão envolvidos:', await p.locator('.lista-revisao li strong').allTextContents());
log('aviso duplicata:', (await p.locator('.aviso', { hasText: 'Pode já existir' }).count()) > 0);
await p.screenshot({ path: `${out}/33-revisao.png`, fullPage: true });

// Sem conexão: envio bloqueado
await ctx.setOffline(true);
await p.evaluate(() => dispatchEvent(new Event('offline')));
await p.waitForTimeout(300);
log('botão enviar desativado offline:', await p.getByRole('button', { name: 'Enviar para triagem' }).isDisabled());
await ctx.setOffline(false);
await p.evaluate(() => dispatchEvent(new Event('online')));
await p.waitForTimeout(300);

// Enviar sem confirmar
await p.getByRole('button', { name: 'Enviar para triagem' }).click();
await p.waitForTimeout(300);
log('erro confirmação:', await p.locator('.resumo-erros li').allTextContents());
await p.getByLabel(/Confirmo que o relato/).check();
await p.getByRole('button', { name: 'Enviar para triagem' }).click();
await p.waitForTimeout(1500);
log('protocolo:', await p.locator('.protocolo-numero').textContent());
await p.screenshot({ path: `${out}/34-enviado.png` });

// 5. Caso + adendo
await p.getByRole('link', { name: 'Acompanhar este caso' }).click();
await p.waitForTimeout(1200);
log('caso:', await p.locator('h1').textContent(), '| envolvidos vistos pela autora:', await p.locator('.lista-revisao li strong').allTextContents());
await p.getByLabel('Acrescentar ou corrigir informação').fill('Correção: o fato ocorreu na fila da cantina, não no pátio.');
await p.getByRole('button', { name: 'Registrar adendo' }).click();
await p.waitForTimeout(1000);
log('eventos:', await p.locator('.evento h3').allTextContents());
await p.screenshot({ path: `${out}/35-caso.png`, fullPage: true });

// Meus registros
await p.goto(`${B}/meus-registros`);
await p.waitForTimeout(1200);
log('meus enviados:', await p.locator('.cartao-registro').count());

// 6. Professora não abre caso de outra pessoa
await p.goto(`${B}/casos/oc-sp-483`);
await p.waitForTimeout(1200);
log('Ana abre 483:', await p.locator('.aviso').first().textContent());
await ctx.close();

// 7. Visibilidade: coordenação x direção no caso 483
for (const nome of ['Carlos Mendes', 'Beatriz Nunes']) {
  const c = await b.newContext({ viewport: { width: 1280, height: 900 } });
  const q = await c.newPage();
  await entrar(q, nome);
  if (nome === 'Beatriz Nunes') await q.screenshot({ path: `${out}/36-inicio-direcao.png`, fullPage: true });
  await q.goto(`${B}/casos/oc-sp-483`);
  await q.waitForTimeout(1200);
  log(`${nome} vê em 483:`, await q.locator('.lista-revisao li strong').allTextContents());
  await c.close();
}

// 8. Celular 360
const m = await b.newContext({ viewport: { width: 360, height: 780 } });
const mp = await m.newPage();
await entrar(mp, 'Ana Ribeiro');
await mp.goto(`${B}/registrar`);
await mp.waitForTimeout(1200);
log('rolagem lateral /registrar 360:', await mp.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth));
await mp.screenshot({ path: `${out}/37-registrar-360.png`, fullPage: true });
await mp.goto(`${B}/casos/oc-sp-482`);
await mp.waitForTimeout(1200);
log('rolagem lateral /casos 360:', await mp.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth));
await mp.screenshot({ path: `${out}/38-caso-360.png`, fullPage: true });
await b.close();
