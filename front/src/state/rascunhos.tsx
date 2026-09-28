import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

/*
 * Guarda de rascunho. Formulários informam se têm alterações não enviadas;
 * ações que trocariam de contexto (rede, escola, sair) pedem confirmação.
 */

type Guarda = {
  haRascunho: boolean;
  marcar: (id: string, sujo: boolean) => void;
};

const Ctx = createContext<Guarda | null>(null);

export function RascunhosProvider({ children }: { children: ReactNode }) {
  const [sujos, setSujos] = useState<Set<string>>(new Set());
  const marcar = useCallback((id: string, sujo: boolean) => {
    setSujos((atual) => {
      if (atual.has(id) === sujo) return atual;
      const novo = new Set(atual);
      if (sujo) novo.add(id);
      else novo.delete(id);
      return novo;
    });
  }, []);

  const haRascunho = sujos.size > 0;

  // Também protege contra fechar ou recarregar a aba.
  useEffect(() => {
    if (!haRascunho) return;
    const aviso = (e: BeforeUnloadEvent) => e.preventDefault();
    addEventListener('beforeunload', aviso);
    return () => removeEventListener('beforeunload', aviso);
  }, [haRascunho]);

  const valor = useMemo(() => ({ haRascunho, marcar }), [haRascunho, marcar]);
  return <Ctx.Provider value={valor}>{children}</Ctx.Provider>;
}

export function useGuardaDeRascunho() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useGuardaDeRascunho fora do provedor');
  return v;
}

/** Registra um formulário na guarda enquanto ele estiver montado. */
export function useRascunho(sujo: boolean) {
  const { marcar } = useGuardaDeRascunho();
  const id = useRef(`form-${Math.random().toString(36).slice(2)}`).current;
  useEffect(() => {
    marcar(id, sujo);
  }, [id, sujo, marcar]);
  useEffect(() => () => marcar(id, false), [id, marcar]);
}
