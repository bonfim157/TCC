import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { base, redeThemes } from '../design/themes';

export type Tema = 'sistema' | 'claro' | 'escuro';
export type Fonte = 100 | 115 | 130;

type Preferencias = {
  tema: Tema;
  fonte: Fonte;
  modoEfetivo: 'light' | 'dark';
  definirTema: (t: Tema) => void;
  definirFonte: (f: Fonte) => void;
};

const Ctx = createContext<Preferencias | null>(null);

function ler<T>(chave: string, padrao: T): T {
  try {
    const v = localStorage.getItem(chave);
    return v ? (JSON.parse(v) as T) : padrao;
  } catch {
    return padrao;
  }
}
function gravar(chave: string, valor: unknown) {
  try {
    localStorage.setItem(chave, JSON.stringify(valor));
  } catch {
    /* armazenamento indisponível: a preferência vale só nesta visita */
  }
}

export function PreferenciasProvider({ children }: { children: ReactNode }) {
  const [tema, setTema] = useState<Tema>(() => ler('pref.tema', 'sistema'));
  const [fonte, setFonte] = useState<Fonte>(() => ler('pref.fonte', 100));
  const [sistemaEscuro, setSistemaEscuro] = useState(() => matchMedia('(prefers-color-scheme: dark)').matches);

  useEffect(() => {
    const mq = matchMedia('(prefers-color-scheme: dark)');
    const ouvir = (e: MediaQueryListEvent) => setSistemaEscuro(e.matches);
    mq.addEventListener('change', ouvir);
    return () => mq.removeEventListener('change', ouvir);
  }, []);

  const modoEfetivo = tema === 'sistema' ? (sistemaEscuro ? 'dark' : 'light') : tema === 'escuro' ? 'dark' : 'light';

  useEffect(() => {
    const raiz = document.documentElement;
    raiz.dataset.theme = modoEfetivo;
    raiz.style.colorScheme = modoEfetivo;
    const b = base[modoEfetivo];
    for (const [k, v] of Object.entries(b)) raiz.style.setProperty(`--${k}`, v);
  }, [modoEfetivo]);

  useEffect(() => {
    document.documentElement.style.setProperty('--escala', String(fonte / 100));
  }, [fonte]);

  const valor = useMemo<Preferencias>(
    () => ({
      tema,
      fonte,
      modoEfetivo,
      definirTema: (t) => { setTema(t); gravar('pref.tema', t); },
      definirFonte: (f) => { setFonte(f); gravar('pref.fonte', f); },
    }),
    [tema, fonte, modoEfetivo],
  );
  return <Ctx.Provider value={valor}>{children}</Ctx.Provider>;
}

export function usePreferencias() {
  const v = useContext(Ctx);
  if (!v) throw new Error('usePreferencias fora do provedor');
  return v;
}

/** Aplica o acento da rede como variáveis CSS. Sem rede, usa o azul institucional. */
export function useTemaDaRede(redeId: string | null) {
  const { modoEfetivo } = usePreferencias();
  useEffect(() => {
    const tema = redeThemes[redeId ?? ''] ?? redeThemes['rede-sp'];
    const p = tema[modoEfetivo];
    const raiz = document.documentElement.style;
    raiz.setProperty('--accent', p.accent);
    raiz.setProperty('--on-accent', p.onAccent);
    raiz.setProperty('--accent-ink', p.accentInk);
    raiz.setProperty('--accent-soft', p.accentSoft);
  }, [redeId, modoEfetivo]);
}
