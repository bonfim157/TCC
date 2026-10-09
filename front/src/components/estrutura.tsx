import { useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { Botao } from './controles';

/* ---------- Painel ---------- */
export function Painel({ titulo, acao, children, className = '' }: { titulo?: string; acao?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`painel ${className}`}>
      {(titulo || acao) && (
        <div className="painel-cabeca">
          {titulo && <h3>{titulo}</h3>}
          {acao}
        </div>
      )}
      {children}
    </section>
  );
}

/* ---------- Tabela ---------- */
export type Coluna<T> = { titulo: string; celula: (linha: T) => ReactNode; chave: string };

export function Tabela<T>({ legenda, colunas, linhas, chaveLinha }: {
  legenda: string;
  colunas: Coluna<T>[];
  linhas: T[];
  chaveLinha: (l: T) => string;
}) {
  return (
    <div className="tabela-rolagem tabela-responsiva" tabIndex={0} role="region" aria-label={legenda}>
      {/* Papéis explícitos: no celular a tabela muda de display, e alguns navegadores
          perderiam a semântica de tabela sem eles. */}
      <table className="tabela" role="table">
        <caption className="visualmente-oculto">{legenda}</caption>
        <thead role="rowgroup">
          <tr role="row">{colunas.map((c) => <th key={c.chave} scope="col" role="columnheader">{c.titulo}</th>)}</tr>
        </thead>
        <tbody role="rowgroup">
          {linhas.map((l) => (
            <tr key={chaveLinha(l)} role="row">{colunas.map((c) => <td key={c.chave} role="cell" data-rotulo={c.titulo}>{c.celula(l)}</td>)}</tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ---------- Abas (padrão WAI-ARIA, setas trocam de aba) ---------- */
export function Abas({ rotulo, abas }: { rotulo: string; abas: { id: string; titulo: string; conteudo: ReactNode }[] }) {
  const base = useId();
  const [ativa, setAtiva] = useState(abas[0]?.id);
  const refs = useRef<Record<string, HTMLButtonElement | null>>({});

  const mover = (e: KeyboardEvent, i: number) => {
    const alvo =
      e.key === 'ArrowRight' ? (i + 1) % abas.length :
      e.key === 'ArrowLeft' ? (i - 1 + abas.length) % abas.length :
      e.key === 'Home' ? 0 : e.key === 'End' ? abas.length - 1 : -1;
    if (alvo < 0) return;
    e.preventDefault();
    const id = abas[alvo].id;
    setAtiva(id);
    refs.current[id]?.focus();
  };

  return (
    <div className="abas">
      <div className="abas-lista" role="tablist" aria-label={rotulo}>
        {abas.map((a, i) => (
          <button
            key={a.id}
            ref={(el) => { refs.current[a.id] = el; }}
            type="button"
            role="tab"
            className="aba"
            id={`${base}-aba-${a.id}`}
            aria-controls={`${base}-painel-${a.id}`}
            aria-selected={ativa === a.id}
            tabIndex={ativa === a.id ? 0 : -1}
            onClick={() => setAtiva(a.id)}
            onKeyDown={(e) => mover(e, i)}
          >
            {a.titulo}
          </button>
        ))}
      </div>
      {abas.map((a) => (
        <div
          key={a.id}
          role="tabpanel"
          className="aba-painel"
          id={`${base}-painel-${a.id}`}
          aria-labelledby={`${base}-aba-${a.id}`}
          hidden={ativa !== a.id}
          tabIndex={0}
        >
          {/* Só a aba aberta é montada: cada uma carrega seus dados quando é aberta. */}
          {ativa === a.id && a.conteudo}
        </div>
      ))}
    </div>
  );
}

/* ---------- Etapas ---------- */
export function Etapas({ etapas, atual }: { etapas: string[]; atual: number }) {
  return (
    <ol className="etapas" aria-label="Etapas do registro">
      {etapas.flatMap((e, i) => {
        const n = i + 1;
        const item = (
          <li
            key={e}
            className={`etapa ${n < atual ? 'etapa-feita' : ''}`}
            aria-current={n === atual ? 'step' : undefined}
          >
            <span className="etapa-num" aria-hidden="true">{n}</span>
            <span className="etapa-rotulo">
              {e}
              <span className="visualmente-oculto">
                {n < atual ? ', concluída' : n === atual ? ', etapa atual' : ''}
              </span>
            </span>
          </li>
        );
        return i === 0 ? [item] : [<li key={`l${i}`} className="etapa-ligacao" aria-hidden="true" />, item];
      })}
    </ol>
  );
}

/* ---------- Diálogo de confirmação ---------- */
export function DialogoConfirmacao({
  aberto, titulo, children, confirmar, cancelar = 'Voltar', perigoso = false, aoConfirmar, aoCancelar,
}: {
  aberto: boolean;
  titulo: string;
  children: ReactNode;
  confirmar: string;
  cancelar?: string;
  perigoso?: boolean;
  aoConfirmar: () => void;
  aoCancelar: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const id = useId();
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (aberto && !d.open) d.showModal();
    if (!aberto && d.open) d.close();
  }, [aberto]);

  return (
    <dialog
      ref={ref}
      className="dialogo"
      aria-labelledby={`${id}-titulo`}
      onCancel={(e) => { e.preventDefault(); aoCancelar(); }}
    >
      <div className="dialogo-corpo">
        <h2 id={`${id}-titulo`} style={{ fontSize: 'var(--t-h3)' }}>{titulo}</h2>
        {typeof children === 'string' ? <p>{children}</p> : children}
      </div>
      <div className="dialogo-acoes">
        <Botao variante="secundario" onClick={aoCancelar} autoFocus>{cancelar}</Botao>
        <Botao variante={perigoso ? 'perigo' : 'primario'} onClick={aoConfirmar}>{confirmar}</Botao>
      </div>
    </dialog>
  );
}

/* ---------- Diálogo com formulário ---------- */
export function DialogoFormulario({
  aberto, titulo, descricao, children, enviar, carregando = false, erro, perigoso = false, largo = false, aoEnviar, aoCancelar,
}: {
  aberto: boolean;
  titulo: string;
  descricao?: string;
  children: ReactNode;
  enviar: string;
  carregando?: boolean;
  erro?: string | null;
  perigoso?: boolean;
  largo?: boolean;
  aoEnviar: () => void;
  aoCancelar: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const id = useId();
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (aberto && !d.open) d.showModal();
    if (!aberto && d.open) d.close();
  }, [aberto]);

  return (
    <dialog
      ref={ref}
      className={largo ? 'dialogo dialogo-largo' : 'dialogo'}
      aria-labelledby={`${id}-titulo`}
      onCancel={(e) => { e.preventDefault(); if (!carregando) aoCancelar(); }}
    >
      <form
        noValidate
        onSubmit={(e) => { e.preventDefault(); aoEnviar(); }}
      >
        <div className="dialogo-corpo">
          <h2 id={`${id}-titulo`} style={{ fontSize: 'var(--t-h3)' }}>{titulo}</h2>
          {descricao && <p className="campo-ajuda">{descricao}</p>}
          {aberto && children}
          {erro && <p className="campo-erro" role="alert">{erro}</p>}
        </div>
        <div className="dialogo-acoes">
          <Botao variante="secundario" onClick={aoCancelar} disabled={carregando}>Cancelar</Botao>
          <Botao type="submit" variante={perigoso ? 'perigo' : 'primario'} carregando={carregando}>{enviar}</Botao>
        </div>
      </form>
    </dialog>
  );
}

/* ---------- Brasão da rede ---------- */
export function Brasao({ sigla, tamanho = 40 }: { sigla: string; tamanho?: number }) {
  // Marca neutra: um quadrado arredondado com a sigla da rede. Sem escudo nem brasão,
  // para não lembrar órgão policial.
  return (
    <svg className="brasao" width={tamanho} height={tamanho} viewBox="0 0 40 40" aria-hidden="true" focusable="false">
      <rect width="40" height="40" rx="11" fill="var(--accent)" />
      <text x="20" y="25.5" textAnchor="middle" fontFamily="var(--titulo)" fontWeight="600" fontSize="14" fill="var(--on-accent)">{sigla}</text>
    </svg>
  );
}
