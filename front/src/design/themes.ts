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
};

export type RedeTheme = { light: ModePalette; dark: ModePalette };

export const redeThemes: Record<string, RedeTheme> = {
  // Rede estadual de São Paulo (piloto: IMSIL, Limeira) — azul institucional documentado
  'rede-sp': {
    light: { accent: '#1B4B73', onAccent: '#FFFFFF', accentInk: '#1B4B73', accentSoft: '#E4ECF3' },
    dark: { accent: '#8FBEE4', onAccent: '#0B1822', accentInk: '#A9CDEB', accentSoft: '#1C2C3A' },
  },
  // Rede fictícia de testes — verde
  'rede-teste': {
    light: { accent: '#2F5D3A', onAccent: '#FFFFFF', accentInk: '#2F5D3A', accentSoft: '#E3EEE5' },
    dark: { accent: '#8CC79A', onAccent: '#0C1A10', accentInk: '#A6D6B1', accentSoft: '#1B2B1F' },
  },
};

/** Base neutra e cores de estado, iguais para todas as redes. */
export const base = {
  light: {
    paper: '#F4F5F6', surface: '#FFFFFF', ink: '#14181C', inkSoft: '#45505A', line: '#C7CDD3', lineStrong: '#8A949E',
    urgent: '#9A3412', urgentSoft: '#F7E6DD', ok: '#1E6B3A', okSoft: '#E1F0E6', warn: '#7A4F00', warnSoft: '#FBF1D9',
    neutral: '#4F5864', neutralSoft: '#E7E9EC',
  },
  dark: {
    paper: '#12161A', surface: '#1B2126', ink: '#F2F4F5', inkSoft: '#C3CBD1', line: '#3C454E', lineStrong: '#7D8892',
    urgent: '#F0A27A', urgentSoft: '#3A2419', ok: '#8FD3A6', okSoft: '#17301F', warn: '#F2C66D', warnSoft: '#33290F',
    neutral: '#B4BCC3', neutralSoft: '#262D34',
  },
} as const;
