// Verificação do login real (B2): senha, segundo fator, sessão em cookie, expiração e saída.
// Só faz sentido com o servidor real: npm run dev:servidor e VITE_API=real npm run dev.
// Com a API simulada, o roteiro avisa e termina sem erro.
import { chromium } from 'playwright';
import { AxeBuilder } from '@axe-core/playwright';
import { createHmac } from 'node:crypto';

const B = 'http://localhost:5173';
const log = (...a) => console.log(...a);

const ambiente = await fetch(`${B}/api/ambiente`).then((r) => r.json()).catch(() => null);
if (!ambiente || typeof ambiente.loginDemo !== 'boolean') {
  log('login real: pulado (API simulada não tem login por senha)');
  process.exit(0);
}
await fetch(`${B}/api/diagnostico/restaurar`, { method: 'POST' }).catch(() => {});

// Mesmos valores de acessoDemo em compartilhado/src/seed.ts (pessoas fictícias, fora de produção).
const SENHA = 'demonstracao-2026';
const SEGREDO = 'JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP';
function totp(segredo, quando = Date.now()) {
  const alfabeto = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  const bits = [...segredo].map((c) => alfabeto.indexOf(c).toString(2).padStart(5, '0')).join('');
  const chave = Buffer.from(bits.match(/.{8}/g).map((b) => parseInt(b, 2)));
  const contador = Buffer.alloc(8);
  contador.writeBigUInt64BE(BigInt(Math.floor(quando / 30_000)));
  const h = createHmac('sha1', chave).update(contador).digest();
  const pos = h[h.length - 1] & 0xf;
  return String((h.readUInt32BE(pos) & 0x7fffffff) % 1_000_000).padStart(6, '0');
}

const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 1280, height: 900 } });
const p = await ctx.newPage();
p.on('pageerror', (e) => log('PAGEERROR', e.message));
const axe = async (nome) => {
  const r = await new AxeBuilder({ page: p }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
  log(`acessibilidade ${nome}:`, r.violations.length === 0 ? 'sem violações' : r.violations.map((v) => v.id).join(', '));
};

// 1. Formulário vazio e senha errada
await p.goto(`${B}/entrar?modo=senha&rede=sp`);
await p.waitForTimeout(1000);
await p.getByRole('button', { name: 'Entrar' }).click();
log('erros do formulário vazio:', (await p.locator('.campo-erro').allTextContents()).join(' | '));
await axe('login');
await p.getByLabel('E-mail').fill('ana@demo.tcc');
await p.getByLabel('Senha').fill('senha-errada-123');
await p.getByRole('button', { name: 'Entrar' }).click();
await p.waitForTimeout(900);
log('senha errada:', await p.locator('.aviso-erro').textContent());

// 2. Professora entra só com a senha; a página não guarda token
await p.getByLabel('Senha').fill(SENHA);
await p.getByRole('button', { name: 'Entrar' }).click();
await p.waitForTimeout(1500);
log('professora logada:', await p.locator('h1').textContent());
const guardado = await p.evaluate(() => JSON.stringify({ ...sessionStorage, ...localStorage }));
log('token guardado no navegador:', /"token":"[^"]+"/.test(guardado.replace(/\\/g, '')) ? 'SIM (errado)' : 'não');
const cookies = await ctx.cookies();
const sessao = cookies.find((c) => c.name === 'sessao');
log('cookie de sessão: HttpOnly', sessao?.httpOnly, '| SameSite', sessao?.sameSite, '| lido pela página:', await p.evaluate(() => document.cookie.includes('sessao=')));

// 3. Outra aba: sem nada guardado, recupera a sessão pelo cookie
const outra = await ctx.newPage();
await outra.goto(`${B}/meus-registros`);
await outra.waitForTimeout(1500);
log('outra aba, sem digitar nada:', await outra.locator('h1').textContent());
await outra.close();

// 4. Sessão expira no servidor: a próxima ação leva ao login, com aviso
await fetch(`${B}/api/diagnostico/restaurar`, { method: 'POST' });
await p.goto(`${B}/meus-registros`);
await p.waitForTimeout(1500);
log('após a sessão vencer:', new URL(p.url()).pathname, '| aviso:', await p.getByText('Sua sessão expirou').count() ? 'Sua sessão expirou' : '(sem aviso)');

// 5. Coordenação: senha, depois o código do aplicativo
await p.goto(`${B}/entrar?modo=senha&rede=sp`);
await p.waitForTimeout(800);
await p.getByLabel('E-mail').fill('carlos@demo.tcc');
await p.getByLabel('Senha').fill(SENHA);
await p.getByRole('button', { name: 'Entrar' }).click();
await p.waitForTimeout(1200);
log('etapa do código:', await p.locator('h1').textContent(), '| foco no título:', await p.evaluate(() => document.activeElement?.tagName));
await axe('código');
await p.goto(`${B}/central`);
await p.waitForTimeout(1000);
log('só com a senha, tentar abrir a Central leva a:', new URL(p.url()).pathname);
await p.goto(`${B}/entrar?modo=senha&rede=sp`);
await p.waitForTimeout(800);
await p.getByLabel('E-mail').fill('carlos@demo.tcc');
await p.getByLabel('Senha').fill(SENHA);
await p.getByRole('button', { name: 'Entrar' }).click();
await p.waitForTimeout(1200);
await p.getByLabel('Código de 6 números').fill('000000');
await p.getByRole('button', { name: 'Entrar' }).click();
await p.waitForTimeout(900);
log('código errado:', await p.locator('.aviso-erro').textContent());
await p.getByLabel('Código de 6 números').fill(totp(SEGREDO));
await p.getByRole('button', { name: 'Entrar' }).click();
await p.waitForTimeout(1500);
await p.goto(`${B}/central`);
await p.waitForTimeout(1500);
log('com o código certo, Central:', await p.locator('h1').textContent(), '| casos na fila:', await p.locator('.fila-item').count());
log('seletor "ver como" (só demonstração):', await p.getByLabel(/Ver como/).count());

// 6. Sair apaga a sessão no servidor
await p.getByRole('button', { name: 'Sair' }).click();
await p.waitForTimeout(1000);
log('depois de sair:', new URL(p.url()).pathname, '| cookie de sessão:', (await ctx.cookies()).some((c) => c.name === 'sessao' && c.value) ? 'ainda existe' : 'apagado');
await p.goto(`${B}/central`);
await p.waitForTimeout(1200);
log('voltar para a Central depois de sair leva a:', new URL(p.url()).pathname);

// 7. Primeiro acesso de gestão: cadastro do segundo fator, em celular
const m = await (await b.newContext({ viewport: { width: 360, height: 780 } })).newPage();
await fetch(`${B}/api/diagnostico/restaurar?semSegundoFator=u-joana`, { method: 'POST' });
await m.goto(`${B}/entrar?modo=senha&rede=sp`);
await m.waitForTimeout(800);
await m.getByLabel('E-mail').fill('joana@demo.tcc');
await m.getByLabel('Senha').fill(SENHA);
await m.getByRole('button', { name: 'Entrar' }).click();
await m.waitForTimeout(1200);
log('primeiro acesso:', await m.locator('h1').textContent());
const chave = (await m.locator('.segredo-mfa').textContent())?.replace(/\s/g, '') ?? '';
log('chave mostrada:', /^[A-Z2-7]{32}$/.test(chave) ? '32 caracteres em base32' : `inesperada (${chave})`);
log('rolagem lateral no cadastro, 360px:', await m.evaluate(() => document.documentElement.scrollWidth - innerWidth));
await m.getByLabel('Código de 6 números').fill(totp(chave));
await m.getByRole('button', { name: 'Confirmar e entrar' }).click();
await m.waitForTimeout(1500);
log('depois de cadastrar:', await m.locator('h1').textContent());

// 8. Senha temporária: troca obrigatória no primeiro acesso
await fetch(`${B}/api/diagnostico/restaurar?senhaTemporaria=u-roberto`, { method: 'POST' });
const t = await (await b.newContext({ viewport: { width: 1280, height: 900 } })).newPage();
await t.goto(`${B}/entrar?modo=senha&rede=sp`);
await t.waitForTimeout(800);
await t.getByLabel('E-mail').fill('roberto@demo.tcc');
await t.getByLabel('Senha').fill(SENHA);
await t.getByRole('button', { name: 'Entrar' }).click();
await t.waitForTimeout(1200);
log('senha temporária leva a:', await t.locator('h1').textContent());
await t.getByLabel('Nova senha', { exact: true }).fill('curta');
await t.getByLabel('Repita a nova senha').fill('outra');
await t.getByRole('button', { name: 'Salvar e entrar' }).click();
log('erros da troca:', (await t.locator('.campo-erro').allTextContents()).join(' | '));
await t.getByLabel('Nova senha', { exact: true }).fill('uma frase comprida de teste');
await t.getByLabel('Repita a nova senha').fill('uma frase comprida de teste');
await t.getByRole('button', { name: 'Salvar e entrar' }).click();
await t.waitForTimeout(1500);
log('depois de trocar:', await t.locator('h1').textContent());
await t.getByRole('button', { name: 'Sair' }).click();
await t.waitForTimeout(800);
await t.goto(`${B}/entrar?modo=senha&rede=sp`);
await t.waitForTimeout(800);
await t.getByLabel('E-mail').fill('roberto@demo.tcc');
await t.getByLabel('Senha').fill('uma frase comprida de teste');
await t.getByRole('button', { name: 'Entrar' }).click();
await t.waitForTimeout(1500);
log('entra com a senha nova, sem pedir troca:', await t.locator('h1').textContent());

await b.close();
