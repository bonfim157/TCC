import type { Context } from 'hono';
import type { ZodType } from 'zod';
import { validacao } from './erros';

/** Corpo do pedido validado pelo esquema; qualquer problema vira 422 com a mensagem dada. */
export async function corpo<T>(c: Context, esquema: ZodType<T>, mensagem = 'Os dados enviados não estão no formato esperado.'): Promise<T> {
  let bruto: unknown;
  try {
    bruto = await c.req.json();
  } catch {
    throw validacao('O pedido não veio em JSON válido.');
  }
  const r = esquema.safeParse(bruto);
  if (!r.success) throw validacao(mensagem);
  return r.data;
}

export const semAcento = (t: string) => t.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();

/** Dia de hoje em Brasília, AAAA-MM-DD. */
export const hojeISO = () => new Date(Date.now() - 3 * 3600_000).toISOString().slice(0, 10);
