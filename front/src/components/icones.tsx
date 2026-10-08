import type { SVGProps } from 'react';

/* Ícones em traço simples, herdando a cor do texto. Sempre decorativos (aria-hidden). */
const base = (props: SVGProps<SVGSVGElement>) => ({
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
  focusable: false,
  width: 22,
  height: 22,
  ...props,
});

export const IconeInfo = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><circle cx="12" cy="12" r="9.5" /><path d="M12 11v6M12 7.5v.01" /></svg>
);
export const IconeAtencao = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><path d="M12 3 2.5 20h19L12 3Z" /><path d="M12 10v4.5M12 17.5v.01" /></svg>
);
export const IconeErro = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><circle cx="12" cy="12" r="9.5" /><path d="m9 9 6 6M15 9l-6 6" /></svg>
);
export const IconeOk = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><circle cx="12" cy="12" r="9.5" /><path d="m7.5 12.5 3 3 6-6.5" /></svg>
);
export const IconeCadeado = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><rect x="5" y="10.5" width="14" height="10" rx="2" /><path d="M8 10.5V7.5a4 4 0 0 1 8 0v3" /></svg>
);
export const IconeSemConexao = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><path d="M3 3l18 18M8.5 16.5a5 5 0 0 1 7 0M5 12.5a10 10 0 0 1 4.2-2.4M19 12.5a10 10 0 0 0-2.1-1.6M12 20v.01" /></svg>
);
export const IconeMenu = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><path d="M4 7h16M4 12h16M4 17h16" /></svg>
);
export const IconeFechar = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><path d="m6 6 12 12M18 6 6 18" /></svg>
);
export const IconeCasa = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><path d="M3.5 10.5 12 3.5l8.5 7" /><path d="M5.5 9v11h13V9" /><path d="M10 20v-6h4v6" /></svg>
);
export const IconeLapis = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><path d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16v4Z" /><path d="m13.5 6.5 4 4" /></svg>
);
export const IconeMais = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><circle cx="12" cy="12" r="9.5" /><path d="M12 8v8M8 12h8" /></svg>
);
export const IconeDocumento = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><path d="M6 2.5h8l4 4v15H6z" /><path d="M14 2.5v4h4M9 12h6M9 16h6" /></svg>
);
export const IconePainel = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><rect x="3.5" y="3.5" width="7" height="7" rx="1.5" /><rect x="13.5" y="3.5" width="7" height="7" rx="1.5" /><rect x="3.5" y="13.5" width="7" height="7" rx="1.5" /><rect x="13.5" y="13.5" width="7" height="7" rx="1.5" /></svg>
);
export const IconeLupa = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><circle cx="10.5" cy="10.5" r="6.5" /><path d="m15.5 15.5 5 5" /></svg>
);
export const IconeGrafico = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><path d="M4 20V4M4 20h16" /><path d="M8 16v-4M12 16V8M16 16v-6" /></svg>
);
export const IconeEngrenagem = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><circle cx="12" cy="12" r="3" /><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M5.3 18.7l2.1-2.1M16.6 7.4l2.1-2.1" /></svg>
);
export const IconeAjuda = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><circle cx="12" cy="12" r="9.5" /><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6v.6M12 17v.01" /></svg>
);
export const IconeAcessibilidade = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><circle cx="12" cy="4.5" r="1.8" /><path d="M5 8.5l7 1.5 7-1.5M12 10v4.5M12 14.5 8.5 21M12 14.5l3.5 6.5" /></svg>
);
export const IconeTelefone = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><path d="M5 3.5h3.5l1.5 4.5-2.2 1.3a11 11 0 0 0 6.9 6.9l1.3-2.2 4.5 1.5V19a1.5 1.5 0 0 1-1.6 1.5A16.5 16.5 0 0 1 3.5 5.1 1.5 1.5 0 0 1 5 3.5Z" /></svg>
);
export const IconeLua = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><path d="M20 14.5A8.5 8.5 0 1 1 9.5 4a7 7 0 0 0 10.5 10.5Z" /></svg>
);
export const IconeSeta = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><path d="M4 12h16M14 6l6 6-6 6" /></svg>
);
export const IconeSair = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><path d="M14 4h4.5a1.5 1.5 0 0 1 1.5 1.5v13a1.5 1.5 0 0 1-1.5 1.5H14" /><path d="M10 8l-4 4 4 4M6 12h10" /></svg>
);
export const IconeEscudo = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><path d="M12 2.5 19.5 5v6.5c0 4.8-3.2 8.3-7.5 10-4.3-1.7-7.5-5.2-7.5-10V5L12 2.5Z" /><path d="m8.5 12 2.5 2.5 4.5-5" /></svg>
);
export const IconeRelogio = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><circle cx="12" cy="12" r="9.5" /><path d="M12 7v5l3.5 2" /></svg>
);
export const IconePessoas = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20a6.5 6.5 0 0 1 13 0" /><circle cx="17" cy="9" r="2.5" /><path d="M17 14.5a5 5 0 0 1 4.5 5" /></svg>
);
export const IconeConversa = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><path d="M4 5.5h16v10H9l-5 4v-14Z" /><path d="M8.5 9.5h7M8.5 12.5h4" /></svg>
);
export const IconeCelular = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><rect x="6.5" y="2.5" width="11" height="19" rx="2.5" /><path d="M11 18.5h2" /></svg>
);
export const IconeMartelo = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><path d="M4 20 13 11" /><path d="m11.5 5.5 3-3 7 7-3 3z" /><path d="m10 7 7 7" /></svg>
);
export const IconeCoracao = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><path d="M12 20s-8-4.7-8-10.5A4.5 4.5 0 0 1 12 7a4.5 4.5 0 0 1 8 2.5C20 15.3 12 20 12 20Z" /><path d="M9 12h2l1-2 1.5 4 1-2H16" /></svg>
);
export const IconeCalendario = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><rect x="3.5" y="5" width="17" height="15.5" rx="2" /><path d="M3.5 10h17M8 3v4M16 3v4" /></svg>
);
export const IconeRegra = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><circle cx="12" cy="12" r="9.5" /><path d="m5.5 5.5 13 13" /></svg>
);
