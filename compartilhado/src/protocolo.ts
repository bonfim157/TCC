import type { ModeloDeComunicacao, Providencia, RegraDoProtocolo } from './contrato';

/*
 * Protocolo de providências por tipo de caso, a partir do levantamento da aba
 * "Gestão da ocorrência" do plano. É uma proposta para validação com a rede,
 * o jurídico e o encarregado de dados (ver Pendências), não uma norma.
 */

const regrasBase = (redeId: string, p: string, conviva: boolean): RegraDoProtocolo[] => {
  const cat = (...n: number[]) => n.map((i) => `${p}-cat-${i}`);
  const r = (id: string, categoriaIds: RegraDoProtocolo['categoriaIds'], descricao: string, base: string, obrigatoria: boolean, somenteComRisco = false): RegraDoProtocolo => ({
    id: `${p}-${id}`, redeId, categoriaIds, somenteComRisco, descricao, base, obrigatoria,
  });
  return [
    r('emergencia', 'todas', 'Acionar emergência (190, 192 ou 193) e registrar o horário', 'Protocolo de segurança da rede', true, true),
    r('acolhimento', 'todas', 'Acolher os estudantes envolvidos', 'Decreto 9.603/2018, art. 11', true),
    r('escuta', cat(4, 8), 'Escuta protegida, sem perguntas invasivas, por profissional de referência', 'Decreto 9.603/2018, art. 11; Lei 13.431/2017', true),
    r('ct', cat(8), 'Comunicar o Conselho Tutelar, mesmo que seja só suspeita', 'ECA, arts. 13, 56 e 245', true),
    r('familia', 'todas', 'Comunicar a família ou a pessoa de referência', 'Decreto 9.603/2018, art. 11, II', true),
    r('bullying', cat(2), 'Aplicar medidas de prevenção e combate ao bullying na turma', 'Lei 13.185/2015, art. 5', false),
    r('discriminacao', cat(4), 'Avaliar comunicação à autoridade policial (possível crime de discriminação)', 'Lei 7.716/1989', false),
    r('saude', cat(5), 'Verificar necessidade de atendimento de saúde (SAMU 192 ou UBS)', 'Protocolo de atendimento da rede', false),
    r('patrimonio', cat(3), 'Preservar o local e avaliar boletim de ocorrência', 'Protocolo de segurança da rede', false),
    r('frequencia', cat(6), 'Contatar a família sobre as faltas; esgotados os recursos da escola, comunicar o Conselho Tutelar', 'ECA, art. 56, II', true),
    ...(conviva ? [r('conviva', 'todas', 'Lançar a ocorrência no Conviva SP (Placon) e anotar o código', 'Programa Conviva SP, Seduc-SP', true)] : []),
    r('plano', 'todas', 'Definir plano de apoio ou registrar por que não é necessário', 'Plano de convivência da escola', false),
  ];
};

export const regras: RegraDoProtocolo[] = [...regrasBase('rede-sp', 'sp', true), ...regrasBase('rede-teste', 'rt', false)];

/** Gera as providências de um caso a partir das regras da rede. */
export function gerarProvidencias(redeId: string, categoriaId: string, riscoImediato: boolean): Providencia[] {
  return regras
    .filter((g) => g.redeId === redeId)
    .filter((g) => g.categoriaIds === 'todas' || g.categoriaIds.includes(categoriaId))
    .filter((g) => !g.somenteComRisco || riscoImediato)
    .map((g) => ({ id: g.id, descricao: g.descricao, base: g.base, obrigatoria: g.obrigatoria, situacao: 'pendente' }));
}

export const modelos: ModeloDeComunicacao[] = (['rede-sp', 'rede-teste'] as const).flatMap((redeId) => [
  {
    id: `${redeId}-mod-familia`,
    redeId,
    tipo: 'familia' as const,
    nome: 'Comunicação à família',
    texto:
      'Prezada família de {estudante},\n\nInformamos que no dia {data} houve uma situação na escola envolvendo {estudante}, registrada sob o protocolo {protocolo}. {resumo}\n\nA escola está acompanhando e gostaria de conversar com vocês. Por favor, entre em contato com a coordenação para combinarmos um horário.\n\nAtenciosamente,\n{responsavel}\n{escola}',
  },
  {
    id: `${redeId}-mod-ct`,
    redeId,
    tipo: 'conselho_tutelar' as const,
    nome: 'Ofício ao Conselho Tutelar',
    texto:
      'Ao Conselho Tutelar\n\nA direção da {escola} comunica, nos termos do art. 13 do Estatuto da Criança e do Adolescente, situação de suspeita de violação de direitos envolvendo o(a) estudante {estudante}, identificada em {data} (protocolo interno {protocolo}).\n\n{resumo}\n\nColocamo-nos à disposição para informações complementares e solicitamos devolutiva sobre as providências adotadas.\n\n{responsavel}\n{escola}',
  },
]);
