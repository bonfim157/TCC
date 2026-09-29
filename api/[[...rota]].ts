import { handle } from 'hono/vercel';
import { criarApp } from '@tcc/servidor';

/*
 * Ponto de entrada das Vercel Functions: toda requisição a /api/* cai aqui e
 * vai para a API (servidor/src/app.ts). A conexão com o banco vem de
 * DATABASE_URL, definida nas variáveis de ambiente do projeto na Vercel.
 */
const app = handle(criarApp());

export const GET = app;
export const POST = app;
export const PUT = app;
export const PATCH = app;
export const DELETE = app;
