/**
 * Paletas de cada rede. O acento é da rede; a base neutra é do produto.
 * Cada acento declara o próprio "texto sobre acento" por modo, e o
 * script `npm run contrast` confere todos os pares contra WCAG AA.
 */
export type ModePalette = {
  accent: string;       // fundo de botões primários, item ativo
  onAccent: string;     // texto sobre accent
  accentInk: string;    // texto/ícone colorido sobre superfície
  accentSoft: string;   // fundo suave (seleção, aviso informativo)
  decor: string;        // tom decorativo (círculos de ícone, filetes); nunca leva texto nem foco
  onDecor: string;      // ícone sobre decor
};

export type RedeTheme = { light: ModePalette; dark: ModePalette };

export const redeThemes: Record<string, RedeTheme> = {
  // Rede estadual de São Paulo (piloto: IMSIL, Limeira). Azul de escola, calmo,
  // escuro o bastante para o texto branco passar de 4,5:1; o azul claro fica só como decoração.
  'rede-sp': {
    light: { accent: '#1F5AA6', onAccent: '#FFFFFF', accentInk: '#1A4F93', accentSoft: '#E7EEF8', decor: '#A9C3E6', onDecor: '#1E1F2E' },
    dark: { accent: '#8DB8F2', onAccent: '#0B1626', accentInk: '#A9CAF6', accentSoft: '#17253A', decor: '#8DB8F2', onDecor: '#0B1626' },
  },
  // Rede fictícia de testes — verde
  'rede-teste': {
    light: { accent: '#2F5D3A', onAccent: '#FFFFFF', accentInk: '#2F5D3A', accentSoft: '#E3EEE5', decor: '#8DBB97', onDecor: '#14181C' },
    dark: { accent: '#8CC79A', onAccent: '#0C1A10', accentInk: '#A6D6B1', accentSoft: '#1B2B1F', decor: '#8CC79A', onDecor: '#0C1A10' },
  },
};

/** Base neutra e cores de estado, iguais para todas as redes. */
export const base = {
  light: {
    paper: '#F7F7F9', surface: '#FFFFFF', ink: '#1E1F2E', inkSoft: '#4B4D63', line: '#E1E2E9', lineStrong: '#878A9E',
    urgent: '#9A3412', urgentSoft: '#F7E6DD', ok: '#1E6B3A', okSoft: '#E1F0E6', warn: '#7A4F00', warnSoft: '#FBF1D9',
    neutral: '#4F5864', neutralSoft: '#E7E9EC',
    faixa: '#16171F', onFaixa: '#FFFFFF',
  },
  dark: {
    paper: '#12161A', surface: '#1B2126', ink: '#F2F4F5', inkSoft: '#C3CBD1', line: '#3C454E', lineStrong: '#7D8892',
    urgent: '#F0A27A', urgentSoft: '#3A2419', ok: '#8FD3A6', okSoft: '#17301F', warn: '#F2C66D', warnSoft: '#33290F',
    neutral: '#B4BCC3', neutralSoft: '#262D34',
    faixa: '#07090B', onFaixa: '#F2F4F5',
  },
} as const;
