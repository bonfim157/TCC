/*
 * Ilustrações planas, desenhadas para o projeto. Usam as cores do tema
 * (dourado decorativo, tinta e superfície), então acompanham a rede e o modo escuro.
 * Sempre decorativas: o texto ao lado diz tudo o que importa.
 */
const props = { 'aria-hidden': true, focusable: false } as const;

/** Pessoa com um celular e balões de conversa: boas-vindas e tour. */
export function IlustracaoBoasVindas({ largura = 220 }: { largura?: number }) {
  return (
    <svg {...props} className="ilustracao" width={largura} height={largura * 0.8} viewBox="0 0 220 176">
      <ellipse cx="110" cy="164" rx="86" ry="8" fill="var(--line)" />
      <path d="M150 20c30 6 52 38 40 72s-52 46-82 40-52-34-44-66 56-52 86-46Z" fill="var(--accent-soft)" />
      <rect x="86" y="40" width="58" height="108" rx="10" fill="var(--ink)" />
      <rect x="91" y="50" width="48" height="86" rx="4" fill="var(--surface)" />
      <rect x="97" y="60" width="36" height="6" rx="3" fill="var(--decor)" />
      <rect x="97" y="72" width="28" height="4" rx="2" fill="var(--line)" />
      <rect x="97" y="82" width="32" height="4" rx="2" fill="var(--line)" />
      <rect x="97" y="118" width="36" height="10" rx="5" fill="var(--decor)" />
      <rect x="40" y="58" width="44" height="22" rx="6" fill="var(--decor)" />
      <path d="M52 80l-4 8 10-8Z" fill="var(--decor)" />
      <rect x="47" y="66" width="30" height="3" rx="1.5" fill="var(--on-decor)" opacity=".7" />
      <rect x="47" y="72" width="20" height="3" rx="1.5" fill="var(--on-decor)" opacity=".7" />
      <rect x="150" y="84" width="46" height="22" rx="6" fill="var(--decor)" />
      <path d="M182 106l6 8-12-8Z" fill="var(--decor)" />
      <rect x="157" y="92" width="32" height="3" rx="1.5" fill="var(--on-decor)" opacity=".7" />
      <rect x="157" y="98" width="22" height="3" rx="1.5" fill="var(--on-decor)" opacity=".7" />
      <circle cx="166" cy="40" r="5" fill="var(--decor)" />
      <circle cx="44" cy="112" r="4" fill="var(--decor)" opacity=".7" />
    </svg>
  );
}

/** Prédio de escola com bandeira: estados vazios e página de dúvidas. */
export function IlustracaoEscola({ largura = 200 }: { largura?: number }) {
  return (
    <svg {...props} className="ilustracao" width={largura} height={largura * 0.8} viewBox="0 0 200 160">
      <ellipse cx="100" cy="150" rx="84" ry="7" fill="var(--line)" />
      <path d="M40 30c26-20 92-22 122 4s20 84-16 100-96 6-112-28-20-56 6-76Z" fill="var(--accent-soft)" />
      <rect x="44" y="74" width="112" height="72" rx="3" fill="var(--surface)" stroke="var(--ink)" strokeWidth="3" />
      <path d="M36 78 100 40l64 38" fill="none" stroke="var(--ink)" strokeWidth="3" strokeLinejoin="round" />
      <path d="M100 40V18" stroke="var(--ink)" strokeWidth="3" />
      <path d="M100 18h22l-6 6 6 6h-22Z" fill="var(--decor)" />
      <circle cx="100" cy="72" r="9" fill="var(--decor)" />
      <rect x="58" y="92" width="18" height="16" rx="2" fill="var(--decor)" opacity=".55" />
      <rect x="124" y="92" width="18" height="16" rx="2" fill="var(--decor)" opacity=".55" />
      <rect x="88" y="108" width="24" height="38" rx="2" fill="var(--ink)" />
      <rect x="58" y="118" width="18" height="16" rx="2" fill="var(--decor)" opacity=".55" />
      <rect x="124" y="118" width="18" height="16" rx="2" fill="var(--decor)" opacity=".55" />
    </svg>
  );
}

/** Prancheta com marca de conferido: registro enviado, acompanhamento. */
export function IlustracaoPrancheta({ largura = 180 }: { largura?: number }) {
  return (
    <svg {...props} className="ilustracao" width={largura} height={largura * 0.9} viewBox="0 0 180 162">
      <ellipse cx="90" cy="152" rx="70" ry="7" fill="var(--line)" />
      <circle cx="90" cy="80" r="66" fill="var(--accent-soft)" />
      <rect x="52" y="26" width="76" height="116" rx="8" fill="var(--surface)" stroke="var(--ink)" strokeWidth="3" />
      <rect x="72" y="18" width="36" height="16" rx="5" fill="var(--ink)" />
      <rect x="64" y="52" width="40" height="5" rx="2.5" fill="var(--line)" />
      <rect x="64" y="64" width="52" height="5" rx="2.5" fill="var(--line)" />
      <rect x="64" y="76" width="34" height="5" rx="2.5" fill="var(--line)" />
      <circle cx="112" cy="112" r="20" fill="var(--decor)" />
      <path d="m102 112 7 7 13-14" fill="none" stroke="var(--on-decor)" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
