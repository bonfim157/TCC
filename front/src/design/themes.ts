/**
 * Paleta única do produto, "caderno da escola": lousa verde no menu e nos
 * botões principais, caneta azul nos links, marca-texto no que precisa de
 * atenção. Igual para todas as redes e escolas. O script `npm run contrast`
 * confere todos os pares contra WCAG AA.
 */
export type ModePalette = {
  accent: string;       // lousa: fundo de botões primários, item ativo
  onAccent: string;     // texto sobre accent
  accentInk: string;    // caneta azul: links e texto colorido sobre superfície
  accentSoft: string;   // fundo suave (seleção, opção marcada)
  decor: string;        // tom decorativo (avatar, círculos de ícone); nunca leva texto nem foco
  onDecor: string;      // texto ou ícone sobre decor
};

export type RedeTheme = { light: ModePalette; dark: ModePalette };

export const acento: RedeTheme = {
  light: { accent: '#234A3F', onAccent: '#FFFFFF', accentInk: '#2445B5', accentSoft: '#EDF4F1', decor: '#9CCBB8', onDecor: '#141A21' },
  dark: { accent: '#9CCBB8', onAccent: '#141A21', accentInk: '#9DB4FF', accentSoft: '#1F3A32', decor: '#9CCBB8', onDecor: '#141A21' },
};

/** Base neutra, cores de estado e as superfícies do caderno. */
export const base = {
  light: {
    paper: '#F6F8FB', surface: '#FFFFFF', ink: '#1B2433', inkSoft: '#4A5468', line: '#DCE3EC', lineStrong: '#7F889A',
    urgent: '#9A3412', urgentSoft: '#F7E6DD', ok: '#1E6B3A', okSoft: '#E1F0E6', warn: '#7A4F00', warnSoft: '#FBF1D9',
    neutral: '#4F5864', neutralSoft: '#E7E9EC',
    faixa: '#16171F', onFaixa: '#FFFFFF',
    // Menu (lousa), marca-texto e as linhas do caderno
    lousa: '#234A3F', onLousa: '#E9EFE9', lousaSuave: '#C9D2DD', lousaAtivo: '#3E6158',
    marca: '#FFE58A', marcaSoft: '#FFF4C2', marcaLinha: '#E9D27A',
    pauta: '#C9D6EA', margem: '#E8A0A8',
  },
  dark: {
    paper: '#141A21', surface: '#1C232C', ink: '#EEF2F6', inkSoft: '#B9C2CE', line: '#2E3843', lineStrong: '#7D8892',
    urgent: '#F0A27A', urgentSoft: '#3A2419', ok: '#8FD3A6', okSoft: '#17301F', warn: '#F2C66D', warnSoft: '#33290F',
    neutral: '#B4BCC3', neutralSoft: '#262D34',
    faixa: '#07090B', onFaixa: '#F2F4F5',
    lousa: '#1F3A32', onLousa: '#E9EFE9', lousaSuave: '#C9D2DD', lousaAtivo: '#3E6158',
    marca: '#5A4A10', marcaSoft: '#3A3212', marcaLinha: '#6B5A1F',
    pauta: '#2E3843', margem: '#7A3A44',
  },
} as const;
