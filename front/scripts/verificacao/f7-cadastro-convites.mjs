// Verificação do cadastro de escola e dos convites, no navegador e com o servidor real:
// cadastra uma escola, entra com senha e código do celular, convida uma pessoa nova e
// uma que já tem conta, aceita pelo link (voltando a ele depois de entrar) e por
// Minha conta. Só faz sentido com o servidor real: npm run dev:servidor e VITE_API=real npm run dev.
import { chromium } from 'playwright';
import { createHmac } from 'node:crypto';

const B = 'http://localhost:5173';
const log = (...a) => console.log(...a);
const ok = (condicao, mensagem) => {
  if (!condicao) throw new Error(`FALHOU: ${mensagem}`);
  log('ok:', mensagem);
};

const ambiente = await fetch(`${B}/api/ambiente`).then((r) => r.json()).catch(() => null);
if (!ambiente || typeof ambiente.loginDemo !== 'boolean') {
  log('cadastro e convites: pulado (API simulada não tem login por senha)');
  process.exit(0);
}
await fetch(`${B}/api/diagnostico/restaurar`, { method: 'POST' }).catch(() => {});

// Mesma senha de acessoDemo em compartilhado/src/seed.ts (pessoas fictícias, fora de produção).
const SENHA_DEMO = 'demonstracao-2026';
const SENHA = 'uma frase longa de senha';
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
const novaPagina = async () => {
  const p = await (await b.newContext({ viewport: { width: 1280, height: 900 } })).newPage();
  p.on('pageerror', (e) => log('PAGEERROR', e.message));
  return p;
};
async function entrar(p, email, senha) {
  await p.getByLabel('E-mail').fill(email);
  await p.getByLabel('Senha').fill(senha);
  await p.getByRole('button', { name: 'Entrar' }).click();
  await p.waitForTimeout(1200);
}
async function sair(p) {
  await p.getByRole('link', { name: /Minha conta/ }).click();
  await p.getByRole('button', { name: 'Sair da conta' }).click();
  await p.waitForTimeout(800);
}

// 1. Cadastro da escola pela direção
const inep = String(35000000 + Math.floor(Math.random() * 999999));
const p = await novaPagina();
await p.goto(`${B}/entrar`);
await p.getByRole('link', { name: 'Cadastrar minha escola' }).click();
await p.getByLabel('Código INEP da escola').fill(inep);
await p.getByLabel('Nome da escola').fill('E.E. Escola do Teste de Convites');
await p.getByLabel('Secretaria responsável').fill('Secretaria da Educação do Estado de São Paulo');
await p.getByLabel('Município').fill('Limeira');
await p.getByLabel('Bairro').fill('Centro');
await p.getByLabel('Seu nome completo').fill('Diretora do Teste');
await p.getByLabel('E-mail').fill(`direcao${inep}@exemplo.tcc`);
await p.getByLabel('Crie uma senha').fill(SENHA);
await p.getByRole('button', { name: 'Cadastrar escola' }).click();
await p.waitForTimeout(1200);
ok((await p.locator('h1').textContent()) === 'Escola cadastrada', 'escola cadastrada pela tela');

// O mesmo INEP de novo é recusado
const p2 = await novaPagina();
await p2.goto(`${B}/cadastrar-escola`);
await p2.getByLabel('Código INEP da escola').fill(inep);
for (const [rotulo, valor] of [['Nome da escola', 'Outra'], ['Secretaria responsável', 'Outra'], ['Município', 'Limeira'], ['Bairro', 'Centro'], ['Seu nome completo', 'Outra Pessoa'], ['E-mail', `outra${inep}@exemplo.tcc`], ['Crie uma senha', SENHA]]) {
  await p2.getByLabel(rotulo).fill(valor);
}
await p2.getByRole('button', { name: 'Cadastrar escola' }).click();
await p2.waitForTimeout(1000);
ok(/já está cadastrada/.test(await p2.locator('.aviso-erro').textContent()), 'INEP repetido recusado com mensagem clara');

// 2. Primeiro acesso da direção: senha e cadastro do código do celular
await p.getByRole('link', { name: 'Entrar', exact: true }).click();
await p.waitForTimeout(600);
await entrar(p, `direcao${inep}@exemplo.tcc`, SENHA);
const segredo = (await p.locator('.segredo-mfa').textContent()).replace(/\s/g, '');
await p.getByLabel('Código de 6 números').fill(totp(segredo));
await p.getByRole('button', { name: 'Confirmar e entrar' }).click();
await p.waitForTimeout(1500);
ok((await p.locator('.lateral .contexto-resumo strong').textContent()).includes('Escola do Teste de Convites'), 'direção entra na própria escola');

// 3. Convite para alguém sem conta e para alguém que já tem (Ana, professora na rede SP)
await p.getByRole('link', { name: 'Escola' }).click();
await p.getByRole('tab', { name: 'Equipe' }).click();
const convidar = async (email) => {
  await p.getByLabel('E-mail da pessoa').fill(email);
  await p.getByRole('button', { name: 'Criar convite' }).click();
  await p.waitForTimeout(900);
  return p.locator('.link-convite output').textContent();
};
const linkNovo = await convidar(`novo${inep}@exemplo.tcc`);
const linkAna = await convidar('ana@demo.tcc');
ok(linkNovo.includes('/convite/') && linkAna.includes('/convite/') && linkNovo !== linkAna, 'dois convites com links diferentes');
await p.getByLabel('E-mail da pessoa').fill('roberto@demo.tcc');
await p.getByLabel('Vai entrar como').selectOption('apoio');
await p.getByRole('button', { name: 'Criar convite' }).click();
await p.waitForTimeout(900);
ok((await p.locator('.lista-linhas li').count()) >= 3, 'convites aparecem em "esperando resposta"');

// 4. Pessoa nova aceita pelo link e cria a conta
const q = await novaPagina();
await q.goto(linkNovo);
await q.waitForTimeout(900);
ok((await q.locator('h1').textContent()) === 'Criar sua conta', 'link de pessoa nova pede nome e senha');
await q.getByLabel('Seu nome completo').fill('Pessoa Nova');
await q.getByLabel('Crie uma senha').fill(SENHA);
await q.getByRole('button', { name: /Aceitar convite/ }).click();
await q.waitForTimeout(1000);
ok((await q.locator('h1').textContent()) === 'Conta criada', 'conta criada pelo convite');
await q.getByRole('link', { name: 'Entrar', exact: true }).click();
await entrar(q, `novo${inep}@exemplo.tcc`, SENHA);
ok((await q.locator('.lateral .contexto-resumo strong').textContent()).includes('Escola do Teste de Convites'), 'pessoa nova entra na escola que convidou');
await q.goto(linkNovo);
await q.waitForTimeout(900);
ok(/não vale mais/.test(await q.locator('.aviso').first().textContent()), 'o mesmo link não serve duas vezes');

// 5. Ana, que já tem conta: o link pede para entrar, volta ao convite e só acrescenta a escola
const a = await novaPagina();
await a.goto(linkAna);
await a.waitForTimeout(900);
ok((await a.locator('h1').textContent()) === 'Aceitar convite', 'conta existente: o link não pede senha nova');
await a.getByRole('link', { name: 'Entrar com a minha conta' }).click();
await a.waitForTimeout(600);
await entrar(a, 'ana@demo.tcc', SENHA_DEMO);
ok(new URL(a.url()).pathname.startsWith('/convite/'), 'depois de entrar, volta ao link do convite');
await a.getByRole('button', { name: 'Aceitar convite' }).click();
await a.waitForTimeout(1500);
await a.getByRole('link', { name: /Minha conta/ }).click();
await a.waitForTimeout(800);
ok((await a.locator('.lista-linhas').first().textContent()).includes('Escola do Teste de Convites'), 'escola nova em Suas escolas, junto das outras');
await sair(a);
await a.goto(`${B}/entrar?modo=senha`);
await entrar(a, 'ana@demo.tcc', SENHA_DEMO);
ok(new URL(a.url()).pathname === '/', 'a senha antiga da Ana continua valendo');

// 6. Roberto recebe o convite em Minha conta e aceita sem o link
const r = await novaPagina();
await r.goto(`${B}/entrar?modo=senha`);
await entrar(r, 'roberto@demo.tcc', SENHA_DEMO);
await r.getByRole('link', { name: /Minha conta/ }).click();
await r.waitForTimeout(1000);
ok(await r.locator('.convite-recebido', { hasText: 'Escola do Teste de Convites' }).isVisible(), 'convite aparece em Minha conta');
await r.getByRole('button', { name: 'Aceitar convite' }).click();
await r.waitForTimeout(1500);
ok((await r.locator('.lista-linhas').first().textContent()).includes('Escola do Teste de Convites'), 'aceito em Minha conta: escola em Suas escolas');
ok((await r.locator('.convite-recebido').count()) === 0, 'convite some depois de aceito');

await b.close();
log('cadastro e convites: tudo certo');
