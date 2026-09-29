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
