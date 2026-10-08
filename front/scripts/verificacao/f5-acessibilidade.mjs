// Auditoria automática de acessibilidade (F5) com axe-core, regras WCAG 2.0/2.1 A e AA.
// Uso: npm run dev (em outro terminal) e depois node scripts/verificacao/f5-acessibilidade.mjs
// Percorre as telas principais com professora, coordenação, direção e secretaria,
// nos temas claro e escuro, em 360px e 1440px. Termina com código 1 se houver
// violação crítica ou grave. Não substitui a passada com leitor de tela (NVDA).
import { chromium } from 'playwright';
import { AxeBuilder } from '@axe-core/playwright';

const B = 'http://localhost:5173';
// Com o servidor real (VITE_API=real), volta o banco aos dados iniciais; na simulação não faz nada.
await fetch(`${B}/api/diagnostico/restaurar`, { method: 'POST' }).catch(() => {});
const log = (...a) => console.log(...a);
const b = await chromium.launch();

/** Violações por regra: { id: { impacto, ajuda, telas: Set, exemplos: [] } } */
const achados = new Map();
let telas = 0;
/** Itens que o axe não conseguiu decidir sozinho (revisão manual). */
const inconclusivos = new Map();

async function auditar(p, nome) {
  await p.waitForTimeout(500);
  const r = await new AxeBuilder({ page: p }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
  telas++;
  for (const v of r.violations) {
    const a = achados.get(v.id) ?? { impacto: v.impact, ajuda: v.help, telas: new Set(), exemplos: [] };
    a.telas.add(nome);
    if (a.exemplos.length < 3) a.exemplos.push(`${nome}: ${v.nodes[0]?.target.join(' ')}`);
    achados.set(v.id, a);
  }
  for (const v of r.incomplete) {
    const a = inconclusivos.get(v.id) ?? { telas: new Set(), exemplo: '' };
    a.telas.add(nome);
    a.exemplo ||= `${nome}: ${v.nodes[0]?.target.join(' ')} (${v.nodes[0]?.any[0]?.message ?? ''})`;
    inconclusivos.set(v.id, a);
  }
}

async function entrar(ctx, nome, rede = 'sp') {
  const p = await ctx.newPage();
  p.on('pageerror', (e) => log('PAGEERROR', e.message));
  await p.goto(`${B}/entrar?rede=${rede}`);
  await p.waitForTimeout(700);
  if (rede === 'sp') await auditar(p, 'entrar');
  await p.getByLabel(nome, { exact: false }).check();
  await p.getByRole('button', { name: 'Entrar' }).click();
  await p.waitForTimeout(900);
  return p;
}

async function visitar(p, caminho, nome = caminho) {
  await p.goto(`${B}${caminho}`);
  await p.waitForTimeout(900);
  await auditar(p, nome);
}

/** Abre cada aba da tela e audita o conteúdo de cada uma. */
async function porAba(p, prefixo) {
  const abas = p.getByRole('tab');
  const n = await abas.count();
  for (let i = 0; i < n; i++) {
    const rotulo = (await abas.nth(i).textContent())?.trim();
    await abas.nth(i).click();
    await p.waitForTimeout(500);
    await auditar(p, `${prefixo} › ${rotulo}`);
  }
}

for (const esquema of ['light', 'dark']) {
  for (const largura of [360, 1440]) {
    const ctx = await b.newContext({ viewport: { width: largura, height: 900 }, colorScheme: esquema });
    const sufixo = `${esquema === 'light' ? 'claro' : 'escuro'} ${largura}`;
    log(`— ${sufixo}`);

    // Professora: início, registro (com erros e nos três passos), meus registros, caso próprio
    const ana = await entrar(ctx, 'Ana Ribeiro');
    await auditar(ana, 'início (professora)');
    await visitar(ana, '/registrar', 'registrar passo 1');
    await ana.getByRole('button', { name: /Continuar/ }).click();
    await auditar(ana, 'registrar com erros');
    await visitar(ana, '/meus-registros');
    await visitar(ana, '/casos/oc-sp-482', 'caso (autora)');
    await visitar(ana, '/guia');
    await visitar(ana, '/duvidas', 'dúvidas (com sessão)');
    await ana.locator('.sanfona summary').first().click();
    await auditar(ana, 'dúvidas com uma resposta aberta');
    await visitar(ana, '/acessibilidade', 'acessibilidade (com sessão)');
    await visitar(ana, '/pagina-inexistente', 'não encontrada');
    await visitar(ana, '/central', 'sem permissão');
    await ana.close();

    // Coordenação: central, caso na central (abas e diálogos), busca
    const carlos = await entrar(ctx, 'Carlos Mendes');
    await visitar(carlos, '/central');
    await visitar(carlos, '/central/oc-sp-483', 'central › caso 483');
    await porAba(carlos, 'caso 483');
    // 482 tem ações do plano em aberto: o diálogo mostra o aviso e a caixa de cancelamento
    await visitar(carlos, '/central/oc-sp-482', 'central › caso 482');
    await carlos.getByRole('button', { name: 'Encerrar caso' }).click();
    await auditar(carlos, 'diálogo encerrar com ações abertas');
    await carlos.keyboard.press('Escape');
    await visitar(carlos, '/buscar');
    await carlos.getByRole('button', { name: 'Buscar' }).click();
    await auditar(carlos, 'buscar com resultados');
    await carlos.close();

    // Direção: relatórios e administração da escola
    const beatriz = await entrar(ctx, 'Beatriz Nunes');
    await visitar(beatriz, '/relatorios');
    await visitar(beatriz, '/administracao', 'administração (direção)');
    await porAba(beatriz, 'administração (direção)');
    await beatriz.close();

    // Secretaria: administração da rede e auditoria
    const paulo = await entrar(ctx, 'Paulo Arantes');
    await visitar(paulo, '/relatorios', 'relatórios (secretaria)');
    await visitar(paulo, '/administracao', 'administração (secretaria)');
    await porAba(paulo, 'administração (secretaria)');
    await paulo.close();

    // Regional da rede de testes: relatório com duas escolas, no tema dessa rede
    const rita = await entrar(ctx, 'Rita Moraes', 'teste');
    await visitar(rita, '/relatorios', 'relatórios (regional, duas escolas)');
    await rita.close();

    await ctx.close();

    // Páginas públicas, sem sessão: família, dúvidas e acessibilidade
    const ctxPublico = await b.newContext({ viewport: { width: largura, height: 900 }, colorScheme: esquema });
    const pub = await ctxPublico.newPage();
    await visitar(pub, '/ciencia/demo-482-gabriel', 'ciência (família)');
    await visitar(pub, '/duvidas', 'dúvidas (sem sessão)');
    await pub.locator('.sanfona summary').first().click();
    await auditar(pub, 'dúvidas sem sessão, resposta aberta');
    await visitar(pub, '/acessibilidade', 'acessibilidade (sem sessão)');
    await ctxPublico.close();
  }
}
await b.close();

log(`\ntelas auditadas: ${telas}`);
const graves = [...achados].filter(([, a]) => a.impacto === 'critical' || a.impacto === 'serious');
if (achados.size === 0) log('nenhuma violação WCAG A/AA encontrada');
for (const [id, a] of achados) {
  log(`\n[${a.impacto}] ${id}: ${a.ajuda} (${a.telas.size} telas)`);
  for (const e of a.exemplos) log(`   ${e}`);
}
log(`\ninconclusivos (revisar à mão): ${inconclusivos.size ? '' : 'nenhum'}`);
for (const [id, a] of inconclusivos) log(`   ${id} em ${a.telas.size} telas; ex.: ${a.exemplo}`);
log(`\ncríticas ou graves: ${graves.length}`);
process.exitCode = graves.length > 0 ? 1 : 0;
