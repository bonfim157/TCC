import { createHash, randomBytes } from 'node:crypto';

/** Tokens (sessão, link de ciência) só são guardados como hash SHA-256. */
export const hashDoToken = (token: string) => createHash('sha256').update(token).digest('hex');

/** Token aleatório de 256 bits, em base64url. */
export const novoToken = () => randomBytes(32).toString('base64url');
