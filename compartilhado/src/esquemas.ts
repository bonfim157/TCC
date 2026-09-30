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
