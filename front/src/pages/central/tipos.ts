import type { Canal, Encaminhamento, Orgao, Providencia, TipoComunicacao } from '../../api/contract';

/** Diálogos que o caso na Central pode abrir. */
export type Dialogo =
  | { tipo: 'triagem' }
  | { tipo: 'registro' }
  | { tipo: 'encaminhar' }
  | { tipo: 'devolutiva'; enc: Encaminhamento }
  | { tipo: 'plano' }
  | { tipo: 'comunicar'; para: TipoComunicacao }
  | { tipo: 'providencia'; prov: Providencia; acao: 'feita' | 'dispensada' | 'pendente' }
  | { tipo: 'rede' }
  | { tipo: 'encerrar' }
  | null;

export const nomeOrgao: Record<Orgao, string> = {
  conselho_tutelar: 'Conselho Tutelar', policia: 'Polícia', samu: 'SAMU', cras: 'CRAS', creas: 'CREAS', saude: 'Serviço de saúde', outro: 'Outro órgão',
};
export const nomeCanal: Record<Canal, string> = { oficio: 'Ofício', telefone: 'Telefone', email: 'E-mail', presencial: 'Presencial', sistema: 'Sistema do órgão' };
