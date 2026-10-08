// Confere contraste WCAG AA de todos os pares de cor usados na interface.
import { readFileSync } from 'node:fs';
const src = readFileSync(new URL('../src/design/themes.ts', import.meta.url), 'utf8');
const js = src.replace(/export type[\s\S]*?};\n/g, '').replace(/: Record<[^=]+=/, ' =').replace(/ as const/g, '').replace(/export const/g, 'const') + '\nexport { redeThemes, base };';
const { redeThemes, base } = await import('data:text/javascript,' + encodeURIComponent(js));
const lum = (hex) => { const c = hex.slice(1).match(/../g).map((h) => parseInt(h, 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; };
const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m); return (x + 0.05) / (y + 0.05); };
let fail = 0;
const check = (label, fg, bg, min = 4.5) => { const r = ratio(fg, bg); const ok = r >= min; if (!ok) fail++; console.log(`${ok ? 'ok  ' : 'FALHA'} ${r.toFixed(2).padStart(5)}  ${label}`); };
for (const mode of ['light', 'dark']) {
  const b = base[mode];
  console.log(`\n== base ${mode}`);
  check('tinta / papel', b.ink, b.paper); check('tinta suave / papel', b.inkSoft, b.paper); check('tinta suave / superfície', b.inkSoft, b.surface);
  check('urgente / superfície', b.urgent, b.surface); check('urgente / fundo suave', b.urgent, b.urgentSoft);
  check('ok / fundo suave', b.ok, b.okSoft); check('aviso / fundo suave', b.warn, b.warnSoft); check('neutro / fundo suave', b.neutral, b.neutralSoft);
  check('borda forte / superfície (não-texto)', b.lineStrong, b.surface, 3);
  check('texto da faixa escura', b.onFaixa, b.faixa);
  for (const [id, t] of Object.entries(redeThemes)) {
    const p = t[mode];
    console.log(`-- ${id} ${mode}`);
    check('texto sobre acento', p.onAccent, p.accent); check('acento-texto / superfície', p.accentInk, b.surface);
    check('acento-texto / papel', p.accentInk, b.paper); check('acento-texto / fundo suave', p.accentInk, p.accentSoft);
    check('tinta / fundo suave', b.ink, p.accentSoft); check('ícone sobre decoração', p.onDecor, p.decor); check('acento / papel (foco, não-texto)', p.accent, b.paper, 3);
  }
}
console.log(fail ? `\n${fail} par(es) abaixo do mínimo.` : '\nTodos os pares atendem WCAG AA.');
process.exit(fail ? 1 : 0);
