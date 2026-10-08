import { useEffect, useId, useRef, useState } from 'react';
import { IconeLua } from '../components/icones';
import { usePreferencias, type Fonte, type Tema } from '../state/preferencias';

/** Tema e tamanho do texto. Guardados só neste aparelho. */
export function MenuAparencia() {
  const { tema, fonte, definirTema, definirFonte } = usePreferencias();
  const [aberto, setAberto] = useState(false);
  const id = useId();
  const raiz = useRef<HTMLDivElement>(null);
  const botao = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!aberto) return;
    // Ao fechar com o foco dentro do painel, devolve o foco ao botão.
    const fechar = () => {
      const focoDentro = raiz.current?.contains(document.activeElement);
      setAberto(false);
      if (focoDentro) botao.current?.focus();
    };
    const fora = (e: MouseEvent) => { if (!raiz.current?.contains(e.target as Node)) fechar(); };
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') fechar(); };
    document.addEventListener('mousedown', fora);
    document.addEventListener('keydown', esc);
    return () => {
      document.removeEventListener('mousedown', fora);
      document.removeEventListener('keydown', esc);
    };
  }, [aberto]);

  const temas: [Tema, string][] = [['sistema', 'Igual ao aparelho'], ['claro', 'Claro'], ['escuro', 'Escuro']];
  const fontes: [Fonte, string][] = [[100, 'Normal'], [115, 'Grande'], [130, 'Maior']];

  return (
    <div className="aparencia" ref={raiz}>
      <button
        ref={botao}
        type="button"
        className="btn btn-secundario btn-aparencia"
        aria-expanded={aberto}
        aria-controls={`${id}-painel`}
        onClick={() => setAberto((a) => !a)}
      >
        <IconeLua width={18} height={18} />
        Aparência
      </button>
      <div className="aparencia-painel" id={`${id}-painel`} hidden={!aberto}>
        <fieldset className="campo">
          <legend>Tamanho do texto</legend>
          <div className="opcoes">
            {fontes.map(([v, r]) => (
              <label className="opcao" key={v}>
                <input type="radio" name={`${id}-fonte`} checked={fonte === v} onChange={() => definirFonte(v)} />
                <span>{r}</span>
              </label>
            ))}
          </div>
        </fieldset>
        <fieldset className="campo">
          <legend>Cores</legend>
          <div className="opcoes">
            {temas.map(([v, r]) => (
              <label className="opcao" key={v}>
                <input type="radio" name={`${id}-tema`} checked={tema === v} onChange={() => definirTema(v)} />
                <span>{r}</span>
              </label>
            ))}
          </div>
        </fieldset>
      </div>
    </div>
  );
}

const tamanhos: Fonte[] = [100, 115, 130];

/** Atalhos visíveis no topo, como nos portais de serviço público: aumentar e diminuir o texto, e a aparência. */
export function ControlesDeAcessibilidade() {
  const { fonte, definirFonte } = usePreferencias();
  const i = tamanhos.indexOf(fonte);
  return (
    <div className="acessibilidade-rapida">
      <div className="acessibilidade-texto" role="group" aria-label="Tamanho do texto">
        <button type="button" aria-label="Aumentar o texto" disabled={i === tamanhos.length - 1} onClick={() => definirFonte(tamanhos[i + 1])}>
          A<sup aria-hidden="true">+</sup>
        </button>
        <button type="button" aria-label="Diminuir o texto" disabled={i === 0} onClick={() => definirFonte(tamanhos[i - 1])}>
          A<sup aria-hidden="true">−</sup>
        </button>
      </div>
      <MenuAparencia />
    </div>
  );
}
