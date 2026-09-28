/* Formatação de datas no padrão brasileiro, por extenso quando é para ler. */

const meses = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];

const hora = (d: Date) => `${d.getHours()}h${String(d.getMinutes()).padStart(2, '0')}`;

/** "25 de setembro de 2026, 9h52" */
export function dataHoraPorExtenso(iso: string) {
  const d = new Date(iso);
  return `${d.getDate()} de ${meses[d.getMonth()]} de ${d.getFullYear()}, ${hora(d)}`;
}

/** "25 de setembro, 9h52" (sem ano quando é o ano corrente) */
export function dataHoraCurta(iso: string) {
  const d = new Date(iso);
  const ano = d.getFullYear() === new Date().getFullYear() ? '' : ` de ${d.getFullYear()}`;
  return `${d.getDate()} de ${meses[d.getMonth()]}${ano}, ${hora(d)}`;
}

/** Data de calendário (AAAA-MM-DD) por extenso, sem fuso: "2 de outubro de 2026" */
export function diaPorExtenso(dia: string) {
  const [a, m, d] = dia.split('-').map(Number);
  return `${d} de ${meses[m - 1]} de ${a}`;
}

/** Hora "09:40" como "9h40" */
export const horaLegivel = (hhmm: string) => {
  const [h, m] = hhmm.split(':');
  return `${Number(h)}h${m}`;
};

/** Hoje como AAAA-MM-DD, no fuso local. */
export function hojeISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Dias entre hoje e uma data de calendário (negativo = passou). */
export function diasAte(dia: string) {
  const [a, m, d] = dia.split('-').map(Number);
  const alvo = new Date(a, m - 1, d).getTime();
  const [ha, hm, hd] = hojeISO().split('-').map(Number);
  return Math.round((alvo - new Date(ha, hm - 1, hd).getTime()) / 864e5);
}
