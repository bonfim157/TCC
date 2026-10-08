import { useId, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react';
import { IconeErro } from './icones';

/* ---------- Botão ---------- */
type Variante = 'primario' | 'secundario' | 'perigo' | 'texto';
export function Botao({
  variante = 'primario',
  carregando = false,
  children,
  className = '',
  ...resto
}: ButtonHTMLAttributes<HTMLButtonElement> & { variante?: Variante; carregando?: boolean }) {
  return (
    <button
      type="button"
      className={`btn btn-${variante} ${className}`}
      aria-busy={carregando || undefined}
      disabled={resto.disabled || carregando}
      {...resto}
    >
      {carregando && <span className="spinner" aria-hidden="true" />}
      {children}
    </button>
  );
}

/* ---------- Partes comuns de campo ---------- */
type BaseCampo = { rotulo: string; ajuda?: ReactNode; erro?: string; opcional?: boolean };

function Rotulo({ rotulo, opcional }: { rotulo: string; opcional?: boolean }) {
  return (
    <>
      {rotulo}
      {opcional && <span className="campo-opcional"> (opcional)</span>}
    </>
  );
}

function Erro({ id, erro }: { id: string; erro?: string }) {
  if (!erro) return null;
  return (
    <p className="campo-erro" id={id}>
      <IconeErro />
      {erro}
    </p>
  );
}

const descritores = (ajudaId: string, erroId: string, ajuda?: ReactNode, erro?: string) =>
  [ajuda ? ajudaId : null, erro ? erroId : null].filter(Boolean).join(' ') || undefined;

/* ---------- Texto ---------- */
export function CampoTexto({ rotulo, ajuda, erro, opcional, id: idExterno, ...resto }: BaseCampo & InputHTMLAttributes<HTMLInputElement>) {
  const gerado = useId();
  const id = idExterno ?? gerado;
  return (
    <div className="campo">
      <label htmlFor={id}><Rotulo rotulo={rotulo} opcional={opcional} /></label>
      {ajuda && <p className="campo-ajuda" id={`${id}-ajuda`}>{ajuda}</p>}
      <input
        id={id}
        className="entrada"
        aria-invalid={erro ? true : undefined}
        aria-describedby={descritores(`${id}-ajuda`, `${id}-erro`, ajuda, erro)}
        required={!opcional}
        {...resto}
      />
      <Erro id={`${id}-erro`} erro={erro} />
    </div>
  );
}

/* ---------- Texto longo, com contador ---------- */
export function CampoAreaTexto({
  rotulo, ajuda, erro, opcional, maxLength, value, id: idExterno, ...resto
}: BaseCampo & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const gerado = useId();
  const id = idExterno ?? gerado;
  const usado = typeof value === 'string' ? value.length : 0;
  return (
    <div className="campo">
      <label htmlFor={id}><Rotulo rotulo={rotulo} opcional={opcional} /></label>
      {ajuda && <p className="campo-ajuda" id={`${id}-ajuda`}>{ajuda}</p>}
      <textarea
        id={id}
        className="entrada"
        value={value}
        maxLength={maxLength}
        aria-invalid={erro ? true : undefined}
        aria-describedby={descritores(`${id}-ajuda`, `${id}-erro`, ajuda, erro)}
        required={!opcional}
        {...resto}
      />
      {maxLength && (
        <span className="contador" aria-live="polite">
          {usado} de {maxLength} caracteres
        </span>
      )}
      <Erro id={`${id}-erro`} erro={erro} />
    </div>
  );
}

/* ---------- Lista de seleção ---------- */
export function CampoSelecao({
  rotulo, ajuda, erro, opcional, children, id: idExterno, ...resto
}: BaseCampo & SelectHTMLAttributes<HTMLSelectElement>) {
  const gerado = useId();
  const id = idExterno ?? gerado;
  return (
    <div className="campo">
      <label htmlFor={id}><Rotulo rotulo={rotulo} opcional={opcional} /></label>
      {ajuda && <p className="campo-ajuda" id={`${id}-ajuda`}>{ajuda}</p>}
      <select
        id={id}
        className="entrada"
        aria-invalid={erro ? true : undefined}
        aria-describedby={descritores(`${id}-ajuda`, `${id}-erro`, ajuda, erro)}
        {...resto}
      >
        {children}
      </select>
      <Erro id={`${id}-erro`} erro={erro} />
    </div>
  );
}

/* ---------- Grupo de opções (rádio) ---------- */
export type Opcao = { valor: string; rotulo: string; desativada?: boolean; icone?: ReactNode };

export function GrupoOpcoes({
  rotulo, ajuda, erro, opcional, opcoes, valor, aoMudar, nome, estilo = 'livre', id: idExterno,
}: BaseCampo & {
  id?: string;
  opcoes: Opcao[];
  valor: string | null;
  aoMudar: (v: string) => void;
  nome?: string;
  estilo?: 'livre' | 'sim-nao' | 'cartoes';
}) {
  const gerado = useId();
  const id = idExterno ?? gerado;
  const nomeGrupo = nome ?? id;
  return (
    <fieldset className="campo" id={id} tabIndex={-1} aria-describedby={descritores(`${id}-ajuda`, `${id}-erro`, ajuda, erro)}>
      <legend><Rotulo rotulo={rotulo} opcional={opcional} /></legend>
      {ajuda && <p className="campo-ajuda" id={`${id}-ajuda`}>{ajuda}</p>}
      <div className={estilo === 'sim-nao' ? 'opcoes sim-nao' : estilo === 'cartoes' ? 'opcoes opcoes-cartoes' : 'opcoes'} aria-invalid={erro ? true : undefined}>
        {opcoes.map((o) => (
          <label className="opcao" key={o.valor}>
            <input
              type="radio"
              name={nomeGrupo}
              value={o.valor}
              checked={valor === o.valor}
              disabled={o.desativada}
              onChange={() => aoMudar(o.valor)}
            />
            <span>{o.icone && <span className="opcao-icone" aria-hidden="true">{o.icone}</span>}{o.rotulo}</span>
          </label>
        ))}
      </div>
      <Erro id={`${id}-erro`} erro={erro} />
    </fieldset>
  );
}

/* ---------- Caixa de seleção ---------- */
export function CaixaMarcar({
  rotulo, ajuda, ...resto
}: { rotulo: string; ajuda?: string } & InputHTMLAttributes<HTMLInputElement>) {
  const id = useId();
  return (
    <label className="marcar" htmlFor={id}>
      <input id={id} type="checkbox" aria-describedby={ajuda ? `${id}-ajuda` : undefined} {...resto} />
      <span className="marcar-texto">
        <span>{rotulo}</span>
        {ajuda && <span className="campo-ajuda" id={`${id}-ajuda`}>{ajuda}</span>}
      </span>
    </label>
  );
}
