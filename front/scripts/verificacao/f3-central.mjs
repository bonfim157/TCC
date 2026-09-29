// Verificação no navegador. Uso: npm run dev (em outro terminal) e depois node scripts/verificacao/f3-central.mjs
// Capturas de tela vão para output/verificacao/ (fora do Git).
import { chromium } from 'playwright';
import { fileURLToPath } from 'node:url';
import { mkdirSync } from 'node:fs';
const out = process.argv[2] ?? fileURLToPath(new URL('../../output/verificacao/', import.meta.url));
mkdirSync(out, { recursive: true });
const B = 'http://localhost:5173';
const b = await chromium.launch();
const log = (...a) => console.log(...a);
async function entrar(page, nome) {
  await page.goto(`${B}/entrar?rede=sp`);
  await page.waitForTimeout(700);
  await page.getByLabel(nome, { exact: false }).check();
  await page.getByRole('button', { name: 'Entrar' }).click();
  await page.waitForTimeout(900);
}
const dialogo = (p) => p.locator('dialog[open]');

const ctx = await b.newContext({ viewport: { width: 1440, height: 1000 } });
const p = await ctx.newPage();
p.on('pageerror', (e) => log('PAGEERROR', e.message));
await entrar(p, 'Beatriz Nunes');
await p.goto(`${B}/central`);
await p.waitForTimeout(1500);
log('indicadores:', (await p.locator('.indicador').allTextContents()).join(' | '));
log('fila:', (await p.locator('.fila-item .fila-linha strong').allTextContents()).join(', '));
await p.screenshot({ path: `${out}/40-central.png`, fullPage: true });

// Filtro CT
await p.getByRole('button', { name: /a comunicar ao Conselho Tutelar/ }).click();
await p.waitForTimeout(200);
log('filtro CT:', (await p.locator('.fila-item .fila-linha strong').allTextContents()).join(', '));
await p.getByRole('button', { name: /a comunicar ao Conselho Tutelar/ }).click();

// Caso 483: ofício ao CT
await p.locator('.fila-item', { hasText: '2026-000483' }).click();
await p.waitForTimeout(1200);
log('providências 483:', (await p.locator('.providencia .providencia-texto > p:first-child strong').allTextContents()).join(' | '));
await p.screenshot({ path: `${out}/41-caso-483.png`, fullPage: true });
await p.getByRole('button', { name: 'Ofício ao Conselho Tutelar' }).click();
await p.waitForTimeout(500);
await dialogo(p).getByLabel('Resumo do que aconteceu').fill('O estudante chegou com marcas no braço e disse espontaneamente que não queria voltar para casa. Foi acolhido pela orientação.');
await p.waitForTimeout(200);
log('texto do ofício começa:', (await dialogo(p).getByLabel('Texto do ofício').inputValue()).slice(0, 80).replace(/\n/g, ' '));
await p.screenshot({ path: `${out}/42-oficio.png` });
await dialogo(p).getByRole('button', { name: 'Registrar envio do ofício' }).click();
await p.waitForTimeout(1200);
log('após ofício, CT pendente na fila:', await p.locator('.fila-item[aria-current=true] .etiqueta', { hasText: 'Comunicar Conselho Tutelar' }).count());
log('encaminhamentos aba:', await p.getByRole('tab', { name: /Encaminhamentos/ }).textContent());

// Caso 482: comunicação à família com vazamento
await p.locator('.fila-item', { hasText: '2026-000482' }).click();
await p.waitForTimeout(1200);
await p.getByRole('button', { name: 'Comunicar família' }).click();
await p.waitForTimeout(400);
await dialogo(p).getByLabel('Resumo do que aconteceu').fill('Houve uma discussão com Lara T. no pátio.');
await p.waitForTimeout(200);
log('aviso de vazamento:', await dialogo(p).locator('.aviso-erro').count());
await p.screenshot({ path: `${out}/43-vazamento.png` });
await dialogo(p).getByRole('button', { name: 'Enviar à família' }).click();
await p.waitForTimeout(600);
log('diálogo continua aberto (envio bloqueado):', await dialogo(p).count());
await dialogo(p).getByLabel('Resumo do que aconteceu').fill('Houve uma discussão no pátio durante o intervalo; Gabriel foi acolhido.');
await dialogo(p).getByRole('button', { name: 'Enviar à família' }).click();
await p.waitForTimeout(1200);
await p.getByRole('tab', { name: /Comunicações/ }).click();
const link = await p.locator('a', { hasText: 'abrir a página que a família verá' }).first().getAttribute('href');
log('link de ciência:', link);

// Encerrar 482: deve bloquear? (providências obrigatórias já feitas?) tentar
await p.getByRole('button', { name: 'Encerrar caso' }).click();
await p.waitForTimeout(400);
log('pendências no encerrar:', await dialogo(p).locator('.aviso-atencao', { hasText: 'providência' }).locator('li').allTextContents());
await dialogo(p).getByLabel('Resultado e motivo do encerramento').fill('Mediação realizada; os estudantes combinaram regras de convivência e as famílias foram informadas.');
log('ações abertas no encerrar:', await dialogo(p).locator('.aviso-atencao', { hasText: 'plano de apoio' }).locator('li').allTextContents());
await dialogo(p).getByRole('button', { name: 'Encerrar caso' }).click();
await p.waitForTimeout(1000);
log('encerrar sem cancelar as ações:', await dialogo(p).count() ? (await dialogo(p).locator('.aviso-erro, .campo-erro').first().textContent().catch(() => '(sem mensagem)')) : '(fechou)');
await dialogo(p).getByLabel(/Cancelar estas 2 ações ao encerrar/).check();
await dialogo(p).getByRole('button', { name: 'Encerrar caso' }).click();
await p.waitForTimeout(1000);
log('após confirmar o cancelamento, diálogo:', await dialogo(p).count() ? 'aberto' : '(fechou)');
await p.getByRole('tab', { name: /Plano/ }).click().catch(() => {});
await p.waitForTimeout(300);
log('plano do 482 encerrado:', (await p.locator('.lista-plano .etiqueta').allTextContents()).join(' | '));
await dialogo(p).getByRole('button', { name: 'Cancelar' }).click().catch(() => {});

// 481: devolutiva atrasada
await p.locator('.fila-item', { hasText: '2026-000481' }).click();
await p.waitForTimeout(1200);
await p.getByRole('tab', { name: /Encaminhamentos/ }).click();
log('etiqueta devolutiva 481:', await p.locator('.lista-encaminhamentos .etiqueta').first().textContent());
await p.getByRole('button', { name: /Registrar devolutiva/ }).click();
await p.waitForTimeout(300);
await dialogo(p).locator('textarea').fill('Conselheira visitou a família em 29/09; o estudante volta às aulas na segunda-feira.');
await dialogo(p).getByRole('button', { name: 'Registrar devolutiva' }).click();
await p.waitForTimeout(1000);
log('etiqueta após devolutiva:', await p.locator('.lista-encaminhamentos .etiqueta').first().textContent());

// 484: triagem
await p.locator('.fila-item', { hasText: '2026-000484' }).click();
await p.waitForTimeout(1200);
await p.getByRole('button', { name: 'Concluir triagem' }).click();
await p.waitForTimeout(400);
await dialogo(p).getByLabel('Quem vai conduzir o caso').selectOption({ label: 'Carlos Mendes, coordenação' });
await dialogo(p).getByRole('button', { name: 'Concluir triagem' }).click();
await p.waitForTimeout(1000);
log('status 484:', await p.locator('.caso-central-titulo .etiqueta').first().textContent());
// Dispensar providência obrigatória sem justificativa
log('botões providência:', await p.locator('.providencias button').count(), '| caso:', await p.locator('#t-caso').textContent()); await p.locator('.providencias button', { hasText: 'Não se aplica: Comunicar a família' }).click();
await p.waitForTimeout(300);
await dialogo(p).getByRole('button', { name: 'Dispensar com justificativa' }).click();
await p.waitForTimeout(600);
log('erro dispensa sem justificativa:', await dialogo(p).locator('.campo-erro').textContent());
await dialogo(p).locator('textarea').fill('Não há estudante identificado; não há família a comunicar.');
await dialogo(p).getByRole('button', { name: 'Dispensar com justificativa' }).click();
await p.waitForTimeout(800);
log('agenda:', (await p.locator('.lista-agenda li strong').allTextContents()).join(' | '));
await p.screenshot({ path: `${out}/44-central-final.png`, fullPage: true });

// Ciência pública em outro navegador, sem login
const pub = await (await b.newContext({ viewport: { width: 390, height: 844 } })).newPage();
await pub.goto(`${B}${link}`);
await pub.waitForTimeout(1200);
log('ciência título:', await pub.locator('h1').textContent());
await pub.getByLabel('Seu nome').fill('Mãe de Gabriel M.');
await pub.getByRole('button', { name: 'Confirmo que li esta comunicação' }).click();
await pub.waitForTimeout(900);
log('ciência:', await pub.locator('.aviso h4').textContent());
await pub.screenshot({ path: `${out}/45-ciencia.png`, fullPage: true });

// Professor não acessa a Central
const prof = await (await b.newContext()).newPage();
await entrar(prof, 'Ana Ribeiro');
await prof.goto(`${B}/central`);
await prof.waitForTimeout(800);
log('professora na central:', await prof.locator('h1').textContent());

// Celular
const m = await (await b.newContext({ viewport: { width: 360, height: 780 } })).newPage();
await entrar(m, 'Carlos Mendes');
await m.goto(`${B}/central`);
await m.waitForTimeout(1300);
log('rolagem lateral central 360:', await m.evaluate(() => document.documentElement.scrollWidth - innerWidth));
await m.screenshot({ path: `${out}/46-central-360.png`, fullPage: true });
await m.goto(`${B}/central/oc-sp-482`);
await m.waitForTimeout(1300);
log('rolagem lateral caso 360:', await m.evaluate(() => document.documentElement.scrollWidth - innerWidth));
await m.screenshot({ path: `${out}/47-caso-central-360.png`, fullPage: true });
await b.close();
