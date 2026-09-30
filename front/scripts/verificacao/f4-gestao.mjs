// Verificação no navegador da F4 (busca, relatórios, administração, auditoria).
// Uso: npm run dev (em outro terminal) e depois node scripts/verificacao/f4-gestao.mjs
// Capturas de tela vão para output/verificacao/ (fora do Git).
import { chromium } from 'playwright';
import { fileURLToPath } from 'node:url';
import { mkdirSync } from 'node:fs';
const out = process.argv[2] ?? fileURLToPath(new URL('../../output/verificacao/', import.meta.url));
mkdirSync(out, { recursive: true });
const B = 'http://localhost:5173';
// Com o servidor real (VITE_API=real), volta o banco aos dados iniciais; na simulação não faz nada.
await fetch(`${B}/api/diagnostico/restaurar`, { method: 'POST' }).catch(() => {});
const log = (...a) => console.log(...a);
const b = await chromium.launch();

// Um só navegador para todos: as abas compartilham os dados da demonstração, como numa máquina real.
const navegador = await b.newContext({ viewport: { width: 1440, height: 1000 }, acceptDownloads: true });
async function sessao(nome, largura = 1440) {
  const p = await navegador.newPage();
  await p.setViewportSize({ width: largura, height: 1000 });
  p.on('pageerror', (e) => log('PAGEERROR', e.message));
  await p.goto(`${B}/entrar?rede=sp`);
  await p.waitForTimeout(700);
  await p.getByLabel(nome, { exact: false }).check();
  await p.getByRole('button', { name: 'Entrar' }).click();
  await p.waitForTimeout(900);
  return p;
}
const lateral = (p) => p.evaluate(() => document.documentElement.scrollWidth - innerWidth);

// Coordenação: busca
const c = await sessao('Carlos Mendes');
await c.goto(`${B}/buscar`);
await c.waitForTimeout(800);
await c.getByRole('button', { name: 'Buscar' }).click();
await c.waitForTimeout(1200);
log('coordenação, busca geral:', await c.locator('#t-resultados').textContent());
await c.getByLabel('Tipo').selectOption({ label: 'Bullying ou cyberbullying' });
await c.getByRole('button', { name: 'Buscar' }).click();
await c.waitForTimeout(1000);
log('coordenação, só bullying:', await c.locator('#t-resultados').textContent());
await c.screenshot({ path: `${out}/50-busca.png`, fullPage: true });

// Regional: busca sem abrir casos, relatório da regional, exportação com motivo
const r = await sessao('Marta Siqueira');
await r.goto(`${B}/buscar`);
await r.waitForTimeout(800);
await r.getByRole('button', { name: 'Buscar' }).click();
await r.waitForTimeout(1200);
log('regional, links para abrir casos:', await r.locator('tbody a').count(), '| linhas:', await r.locator('tbody tr').count());
await r.goto(`${B}/relatorios`);
await r.waitForTimeout(1500);
log('regional, escopo:', await r.locator('.relatorio-resumo').textContent());
log('regional, suprimidos:', await r.locator('.barra-suprimida').count());
await r.screenshot({ path: `${out}/51-relatorios.png`, fullPage: true });
await r.getByRole('button', { name: 'Exportar planilha' }).click();
await r.waitForTimeout(300);
await r.locator('dialog[open]').getByRole('button', { name: 'Gerar planilha' }).click();
await r.waitForTimeout(800);
log('exportar sem motivo:', await r.locator('dialog[open] .campo-erro').textContent());
await r.locator('dialog[open] textarea').fill('Relatório bimestral de bullying para a Unidade Regional, Lei 13.185.');
const [download] = await Promise.all([r.waitForEvent('download'), r.locator('dialog[open]').getByRole('button', { name: 'Gerar planilha' }).click()]);
log('arquivo exportado:', download.suggestedFilename());

// Secretaria: altera o protocolo e vê a auditoria da rede
const s = await sessao('Paulo Arantes');
await s.goto(`${B}/administracao`);
await s.waitForTimeout(1200);
const antes = await s.getByLabel(/Obrigatória: Definir plano de apoio/).isChecked();
await s.getByLabel(/Obrigatória: Definir plano de apoio/).click();
await s.waitForTimeout(900);
log('secretaria alterou "plano de apoio" obrigatória:', antes, '->', await s.getByLabel(/Obrigatória: Definir plano de apoio/).isChecked());
await s.getByRole('tab', { name: 'Auditoria' }).click();
await s.waitForTimeout(1200);
log('auditoria (secretaria), ações:', [...new Set(await s.locator('[role=tabpanel]:not([hidden]) tbody tr td:nth-child(3)').allTextContents())].join(', '));
log('exportação da regional aparece:', (await s.locator('tbody tr', { hasText: 'Relatório bimestral' }).count()) > 0);
await s.screenshot({ path: `${out}/52-auditoria.png`, fullPage: true });

// Direção: protocolo só leitura, contatos e pessoas editáveis
const d = await sessao('Beatriz Nunes');
await d.goto(`${B}/administracao`);
await d.waitForTimeout(1200);
log('direção, protocolo só leitura:', (await d.locator('.aviso', { hasText: 'Só a secretaria da rede' }).count()) > 0);
await d.getByRole('tab', { name: 'Contatos da escola' }).click();
await d.waitForTimeout(800);
await d.getByLabel('Conselho Tutelar').fill('Conselho Tutelar de Limeira, sede central');
await d.getByRole('button', { name: 'Salvar contatos' }).click();
await d.waitForTimeout(800);
await d.getByRole('tab', { name: 'Pessoas e turmas' }).click();
await d.waitForTimeout(800);
await d.getByLabel('Nome', { exact: true }).fill('Bianca F.');
await d.getByRole('textbox', { name: 'Turma' }).fill('6º ano A');
await d.getByRole('button', { name: 'Cadastrar' }).click();
await d.waitForTimeout(900);
log('direção cadastrou pessoa:', (await d.locator('tbody tr', { hasText: 'Bianca F.' }).count()) > 0);
await d.goto(`${B}/central/oc-sp-484`);
await d.waitForTimeout(1300);
await d.getByRole('button', { name: 'Encaminhar' }).click();
await d.waitForTimeout(400);
log('encaminhamento usa o contato salvo:', await d.locator('dialog[open]').getByLabel('Nome da unidade').inputValue());

// Professora: sem acesso à busca
const a = await sessao('Ana Ribeiro');
await a.goto(`${B}/buscar`);
await a.waitForTimeout(700);
log('professora na busca:', await a.locator('h1').textContent());

// Celular
const m = await sessao('Paulo Arantes', 360);
for (const rota of ['/relatorios', '/administracao', '/buscar']) {
  await m.goto(`${B}${rota}`);
  await m.waitForTimeout(1300);
  log(`rolagem lateral ${rota} 360:`, await lateral(m));
  if (await lateral(m) > 0) log('  elementos largos:', await m.evaluate(() => [...document.querySelectorAll('body *')].filter((el) => el.getBoundingClientRect().right > innerWidth + 1 && el.getBoundingClientRect().width > 0).slice(0, 5).map((el) => `${el.tagName}.${el.className}`).join(' | ')));
}
await m.goto(`${B}/relatorios`);
await m.waitForTimeout(1300);
await m.screenshot({ path: `${out}/53-relatorios-360.png`, fullPage: true });
await b.close();
