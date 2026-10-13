import { useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { deISO, diaCompleto, diasDaSemana, hojeISO, meses, paraISO } from '../util/formato';
import { Erro, Rotulo, descritores } from './controles';
import { IconeAnterior, IconeProximo, IconeRelogio } from './icones';

/*
 * Data e horário feitos aqui, e não com <input type="date|time">: o calendário e o
 * relógio nativos seguem o idioma do navegador (muitas vezes inglês) e mudam de cara
 * em cada aparelho. Estes ficam em português e com o visual do sistema em todo lugar.
 */

const somarDias = (dia: string, n: number) => {
  const d = deISO(dia);
  d.setDate(d.getDate() + n);
  return paraISO(d);
};
const primeiroDoMes = (dia: string) => `${dia.slice(0, 8)}01`;
const somarMeses = (dia: string, n: number) => {
  const d = deISO(dia);
  const alvo = new Date(d.getFullYear(), d.getMonth() + n, 1);
  // Mantém o dia quando dá; em meses mais curtos, para no último dia.
  const ultimo = new Date(alvo.getFullYear(), alvo.getMonth() + 1, 0).getDate();
  alvo.setDate(Math.min(d.getDate(), ultimo));
  return paraISO(alvo);
};
const nomeDoMes = (dia: string) => {
  const d = deISO(dia);
  const nome = meses[d.getMonth()];
  return `${nome[0].toUpperCase()}${nome.slice(1)} de ${d.getFullYear()}`;
};
const abreviacoes = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];

/** Semanas do mês (domingo a sábado), com os dias de fora como null. */
function semanasDoMes(dia: string) {
  const inicio = deISO(primeiroDoMes(dia));
  const total = new Date(inicio.getFullYear(), inicio.getMonth() + 1, 0).getDate();
  const celulas: (string | null)[] = Array(inicio.getDay()).fill(null);
  for (let n = 1; n <= total; n++) celulas.push(paraISO(new Date(inicio.getFullYear(), inicio.getMonth(), n)));
  while (celulas.length % 7) celulas.push(null);
  const semanas: (string | null)[][] = [];
  for (let i = 0; i < celulas.length; i += 7) semanas.push(celulas.slice(i, i + 7));
  return semanas;
}

/* ---------- Calendário ---------- */
function Calendario({ valor, aoEscolher, min, max, focarAoAbrir }: {
  valor: string;
  aoEscolher: (dia: string) => void;
  min?: string;
  max?: string;
  focarAoAbrir?: boolean;
}) {
  const idTitulo = useId();
  const hoje = hojeISO();
  const limitar = (dia: string) => (max && dia > max ? max : min && dia < min ? min : dia);
  // "foco" é o dia que recebe Tab e anda com as setas; o mês visível acompanha.
  const [foco, setFoco] = useState(() => limitar(valor || hoje));
  const [moverFoco, setMoverFoco] = useState(!!focarAoAbrir);
  const grade = useRef<HTMLTableElement>(null);

  useEffect(() => {
    if (!moverFoco) return;
    grade.current?.querySelector<HTMLButtonElement>(`button[data-dia="${foco}"]`)?.focus();
    setMoverFoco(false);
  }, [foco, moverFoco]);

  const fora = (dia: string) => (!!max && dia > max) || (!!min && dia < min);
  const mes = primeiroDoMes(foco);
  const podeVoltar = !min || primeiroDoMes(min) < mes;
  const podeAvancar = !max || primeiroDoMes(max) > mes;

  const irPara = (dia: string, focar = true) => {
    setFoco(limitar(dia));
    setMoverFoco(focar);
  };

  const teclas = (e: KeyboardEvent<HTMLButtonElement>, dia: string) => {
    const d = deISO(dia).getDay();
    const destino =
      e.key === 'ArrowLeft' ? somarDias(dia, -1)
        : e.key === 'ArrowRight' ? somarDias(dia, 1)
          : e.key === 'ArrowUp' ? somarDias(dia, -7)
            : e.key === 'ArrowDown' ? somarDias(dia, 7)
              : e.key === 'Home' ? somarDias(dia, -d)
                : e.key === 'End' ? somarDias(dia, 6 - d)
                  : e.key === 'PageUp' ? somarMeses(dia, -1)
                    : e.key === 'PageDown' ? somarMeses(dia, 1)
                      : null;
    if (!destino) return;
    e.preventDefault();
    irPara(destino);
  };

  return (
    <div className="calendario">
      <div className="calendario-cabeca">
        <button type="button" className="calendario-mes-botao" aria-label="Mês anterior" disabled={!podeVoltar} onClick={() => irPara(somarMeses(foco, -1), false)}>
          <IconeAnterior />
        </button>
        <p className="calendario-mes" id={idTitulo} aria-live="polite">{nomeDoMes(foco)}</p>
        <button type="button" className="calendario-mes-botao" aria-label="Próximo mês" disabled={!podeAvancar} onClick={() => irPara(somarMeses(foco, 1), false)}>
          <IconeProximo />
        </button>
      </div>
      <table className="calendario-grade" role="grid" aria-labelledby={idTitulo} ref={grade}>
        <thead>
          <tr>
            {abreviacoes.map((a, i) => <th key={a} scope="col"><abbr title={diasDaSemana[i]}>{a}</abbr></th>)}
          </tr>
        </thead>
        <tbody>
          {semanasDoMes(mes).map((semana, i) => (
            <tr key={i}>
              {semana.map((dia, j) => (
                <td key={dia ?? `vazio-${j}`}>
                  {dia && (
                    <button
                      type="button"
                      className="calendario-dia"
                      data-dia={dia}
                      tabIndex={dia === foco ? 0 : -1}
                      aria-label={`${diaCompleto(dia)}${dia === hoje ? ', hoje' : ''}`}
                      aria-pressed={dia === valor}
                      aria-current={dia === hoje ? 'date' : undefined}
                      disabled={fora(dia)}
                      onClick={() => { setFoco(dia); aoEscolher(dia); }}
                      onKeyDown={(e) => teclas(e, dia)}
                    >
                      {deISO(dia).getDate()}
                    </button>
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <p className="calendario-dica">Use as setas para andar pelos dias e Page Up ou Page Down para trocar de mês.</p>
    </div>
  );
}

/* ---------- Campo de data com atalhos ---------- */
type Atalho = 'hoje' | 'ontem' | 'outro';

/**
 * Data do fato: "Hoje" e "Ontem" resolvem a maioria dos registros com um toque;
 * "Outro dia" abre o calendário. Sem atalhos, o calendário fica sempre aberto.
 */
export function CampoData({ id: idExterno, rotulo, valor, aoMudar, min, max, erro, ajuda, opcional, atalhos = true }: {
  id?: string;
  rotulo: string;
  valor: string;
  aoMudar: (dia: string) => void;
  min?: string;
  max?: string;
  erro?: string;
  ajuda?: ReactNode;
  opcional?: boolean;
  atalhos?: boolean;
}) {
  const gerado = useId();
  const id = idExterno ?? gerado;
  const hoje = hojeISO();
  const ontem = somarDias(hoje, -1);
  const atalhoDoValor: Atalho | null = !valor ? null : valor === hoje ? 'hoje' : valor === ontem ? 'ontem' : 'outro';
  const [escolhaOutro, setEscolhaOutro] = useState(false);
  const atalho = escolhaOutro ? 'outro' : atalhoDoValor;
  const calendarioAberto = !atalhos || atalho === 'outro';

  const escolherAtalho = (a: Atalho) => {
    setEscolhaOutro(a === 'outro');
    if (a === 'hoje') aoMudar(hoje);
    if (a === 'ontem') aoMudar(ontem);
  };

  const quando = valor === hoje ? 'Hoje, ' : valor === ontem ? 'Ontem, ' : '';
  const extenso = valor ? diaCompleto(valor) : '';
  return (
    <fieldset className="campo campo-data" id={id} tabIndex={-1} aria-describedby={descritores(`${id}-ajuda`, `${id}-erro`, ajuda, erro)}>
      <legend><Rotulo rotulo={rotulo} opcional={opcional} /></legend>
      {ajuda && <p className="campo-ajuda" id={`${id}-ajuda`}>{ajuda}</p>}
      {atalhos && (
        <div className="opcoes datas-rapidas" aria-invalid={erro ? true : undefined}>
          {([['hoje', 'Hoje'], ['ontem', 'Ontem'], ['outro', 'Outro dia']] as [Atalho, string][]).map(([a, texto]) => (
            <label className="opcao" key={a}>
              <input type="radio" name={`${id}-atalho`} value={a} checked={atalho === a} onChange={() => escolherAtalho(a)} />
              <span>{texto}</span>
            </label>
          ))}
        </div>
      )}
      {calendarioAberto && (
        <Calendario valor={valor} aoEscolher={aoMudar} min={min} max={max} focarAoAbrir={escolhaOutro && atalhos} />
      )}
      <p className="data-escolhida" aria-live="polite">
        {!valor ? 'Nenhuma data escolhida.' : quando ? <>{quando}<strong>{extenso}</strong></> : <strong>{extenso[0].toUpperCase() + extenso.slice(1)}</strong>}
      </p>
      <Erro id={`${id}-erro`} erro={erro} />
    </fieldset>
  );
}

/* ---------- Horário ---------- */
const horas = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
const minutos = Array.from({ length: 12 }, (_, i) => String(i * 5).padStart(2, '0'));

/**
 * Horário em duas listas (hora e minuto, de 5 em 5), que abrem como lista simples no
 * celular. "Agora" preenche com o horário atual arredondado.
 */
export function CampoHorario({ id: idExterno, rotulo, valor, aoMudar, erro, ajuda, opcional }: {
  id?: string;
  rotulo: string;
  valor: string;
  aoMudar: (hhmm: string) => void;
  erro?: string;
  ajuda?: ReactNode;
  opcional?: boolean;
}) {
  const gerado = useId();
  const id = idExterno ?? gerado;
  const [h, m] = valor ? valor.split(':') : ['', ''];
  // Um minuto fora do passo de 5 (rascunho antigo) continua aparecendo na lista.
  const opcoesMinuto = m && !minutos.includes(m) ? [...minutos, m].sort() : minutos;
  const agora = () => {
    const d = new Date();
    const arredondado = Math.floor(d.getMinutes() / 5) * 5;
    aoMudar(`${String(d.getHours()).padStart(2, '0')}:${String(arredondado).padStart(2, '0')}`);
  };
  const invalido = erro ? true : undefined;
  return (
    <fieldset className="campo campo-horario" id={id} tabIndex={-1} aria-describedby={descritores(`${id}-ajuda`, `${id}-erro`, ajuda, erro)}>
      <legend><Rotulo rotulo={rotulo} opcional={opcional} /></legend>
      {ajuda && <p className="campo-ajuda" id={`${id}-ajuda`}>{ajuda}</p>}
      <div className="horario-linha">
        <div className="horario-parte">
          <label htmlFor={`${id}-h`}>Hora</label>
          <select id={`${id}-h`} className="entrada" value={h} aria-invalid={invalido} onChange={(e) => aoMudar(`${e.target.value}:${m || '00'}`)}>
            <option value="" disabled>--</option>
            {horas.map((x) => <option key={x} value={x}>{x}</option>)}
          </select>
        </div>
        <span className="horario-separador" aria-hidden="true">:</span>
        <div className="horario-parte">
          <label htmlFor={`${id}-m`}>Minuto</label>
          <select id={`${id}-m`} className="entrada" value={m} aria-invalid={invalido} onChange={(e) => aoMudar(`${h || '00'}:${e.target.value}`)}>
            <option value="" disabled>--</option>
            {opcoesMinuto.map((x) => <option key={x} value={x}>{x}</option>)}
          </select>
        </div>
        <button type="button" className="btn btn-secundario horario-agora" onClick={agora}>
          <IconeRelogio width={18} height={18} />
          Agora
        </button>
      </div>
      {valor && <p className="data-escolhida">Por volta das <strong>{Number(h)}h{m}</strong></p>}
      <Erro id={`${id}-erro`} erro={erro} />
    </fieldset>
  );
}
