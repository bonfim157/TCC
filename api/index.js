// Função única da Vercel: toda requisição a /api/* chega aqui (ver "rewrites" em vercel.json).
// O servidor em si (servidor/src) é empacotado em _app.cjs durante o build.
import servidor from './_app.cjs';

export const GET = servidor.manipulador;
export const POST = servidor.manipulador;
export const PUT = servidor.manipulador;
export const PATCH = servidor.manipulador;
export const DELETE = servidor.manipulador;
