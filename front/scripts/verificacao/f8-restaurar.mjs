import { chromium } from 'playwright';
const B = 'http://localhost:5173';
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 1280, height: 900 } });
const a = await ctx.newPage();
a.on('pageerror', (e) => console.log('ERRO A', e.message));
await a.goto(`${B}/entrar?rede=sp`); await a.waitForTimeout(800);
await a.getByLabel('Beatriz Nunes', { exact: false }).check();
await a.getByRole('button', { name: 'Entrar', exact: true }).click(); await a.waitForTimeout(900);
await a.goto(`${B}/equipamentos`); await a.waitForTimeout(800);
await a.locator('#eq-item').fill('Item de teste das duas abas');
await a.locator('#eq-local').fill('Sala teste');
await a.locator('#eq-descricao').fill('Pedido criado para testar a restauração.');
await a.getByRole('button', { name: 'Enviar pedido' }).click(); await a.waitForTimeout(900);
console.log('aba A criou o pedido:', await a.getByText('Item de teste das duas abas').count() > 0);
// Aba B restaura os dados
const bpag = await ctx.newPage();
await bpag.goto(`${B}/entrar?rede=sp`); await bpag.waitForTimeout(800);
await bpag.getByLabel('Beatriz Nunes', { exact: false }).check();
await bpag.getByRole('button', { name: 'Entrar', exact: true }).click(); await bpag.waitForTimeout(900);
await bpag.goto(`${B}/guia`); await bpag.waitForTimeout(800);
await bpag.getByRole('button', { name: 'Restaurar dados de demonstração' }).click();
await bpag.getByRole('button', { name: 'Restaurar', exact: true }).click(); await bpag.waitForTimeout(1500);
console.log('chave apagada:', await bpag.evaluate(() => Object.keys(localStorage).filter(k => k.startsWith('demo.banco')).length === 0));
// Aba A faz uma ação que grava (consulta de caso é auditada) e lista os pedidos, sem recarregar
const r = await a.evaluate(async () => {
  const s = JSON.parse(sessionStorage.getItem('sessao.demo'));
  const h = { Authorization: 'Bearer ' + s.sessao.token, 'X-Rede-Id': s.redeId, 'X-Escola-Id': s.escolaId ?? '' };
  await fetch('/api/ocorrencias/oc-sp-482', { headers: h });
  return (await (await fetch('/api/equipamentos', { headers: h })).json()).map((p) => p.item);
});
console.log('itens na aba A depois da restauração:', JSON.stringify(r));
const gravado = await bpag.evaluate(() => Object.keys(localStorage).some(k => k.startsWith('demo.banco') && localStorage.getItem(k).includes('Item de teste das duas abas')));
console.log('item reapareceu no armazenamento:', gravado);
await b.close();
