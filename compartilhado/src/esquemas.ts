import { z } from 'zod';

/*
 * Esquemas de validação dos pedidos. O servidor valida toda entrada com eles;
 * o front pode usar os mesmos para validar antes de enviar. Cada esquema
 * corresponde a um tipo do contrato (contrato.ts).
 */

export const esquemaNovaSessao = z.object({
  redeId: z.string().min(1),
  usuarioId: z.string().min(1),
});

const texto = (max: number) => z.string().max(max);

export const esquemaNovaOcorrencia = z.object({
  escolaId: z.string().min(1),
  fato: z.object({
    categoriaId: z.string(),
    data: z.string(),
    hora: z.string(),
    local: texto(200),
    relato: texto(5000),
    riscoImediato: z.boolean(),
    providenciaImediata: texto(2000),
  }),
  envolvidos: z.array(z.object({
    pessoaId: z.string().min(1).max(100),
    nome: texto(200),
    tipo: z.enum(['estudante', 'profissional', 'familiar', 'outro']),
    turma: texto(60).optional(),
    papel: z.enum(['envolvido_direto', 'afetado', 'testemunha']),
    visibilidade: z.enum(['equipe_do_caso', 'coordenacao_direcao', 'somente_direcao']),
  })).max(30),
  anexos: z.array(z.object({
    id: z.string().max(100),
    nome: texto(200),
    tamanhoKb: z.number().nonnegative(),
    justificativa: texto(500),
  })).max(10),
});

export const esquemaNovoAdendo = z.object({ texto: texto(5000) });

/* ---------- Central de Gestão ---------- */

const dia = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const prioridade = z.enum(['urgente', 'alta', 'media', 'baixa']);

export const esquemaTriagem = z.object({
  prioridade,
  responsavelId: z.string(),
  categoriaId: z.string(),
  observacao: texto(2000),
});

export const esquemaProvidencia = z.object({
  situacao: z.enum(['feita', 'dispensada', 'pendente']),
  observacao: texto(2000),
});

export const esquemaEncaminhamento = z.object({
  orgao: z.enum(['conselho_tutelar', 'policia', 'samu', 'cras', 'creas', 'saude', 'outro']),
  orgaoNome: texto(200),
  canal: z.enum(['oficio', 'telefone', 'email', 'presencial', 'sistema']),
  protocoloExterno: texto(100),
  devolutivaAte: z.union([dia, z.literal('')]),
});

export const esquemaDevolutiva = z.object({ texto: texto(5000) });

export const esquemaRegistroEscola = z.object({
  tipo: z.enum(['escuta', 'reavaliacao']),
  texto: texto(5000),
});

export const esquemaAcaoPlano = z.object({
  descricao: texto(500),
  responsavel: texto(200),
  prazo: z.union([dia, z.literal('')]),
});

export const esquemaComunicacao = z.object({
  tipo: z.enum(['familia', 'conselho_tutelar']),
  destinatario: texto(200),
  texto: texto(8000),
  estudanteId: z.string().max(100).optional(),
});

export const esquemaRegistroRede = z.object({ codigo: texto(100) });

export const esquemaEncerramento = z.object({
  justificativa: texto(5000),
  reavaliarEm: dia.nullable(),
  cancelarAcoesAbertas: z.boolean().optional(),
});

export const esquemaCiencia = z.object({ nome: texto(200) });

/* ---------- Gestão e administração ---------- */

export const esquemaExportacao = z.object({
  motivo: texto(1000),
  de: z.string().max(10),
  ate: z.string().max(10),
  escolaId: z.string().max(100),
  somenteCategoriaId: z.string().max(100),
});

export const esquemaRegra = z.object({
  descricao: texto(500).optional(),
  base: texto(300).optional(),
  obrigatoria: z.boolean().optional(),
});

export const esquemaCategoria = z.object({ ativa: z.boolean(), nome: texto(120).optional() });

export const esquemaModelo = z.object({ texto: texto(8000).optional() });

export const esquemaContatos = z.object({
  conselhoTutelar: texto(200),
  cras: texto(200),
  creas: texto(200),
  delegacia: texto(200),
  saude: texto(200),
});

export const esquemaNovaPessoa = z.object({
  nome: texto(200),
  tipo: z.enum(['estudante', 'profissional', 'familiar', 'outro']),
  turma: texto(60).optional(),
});
