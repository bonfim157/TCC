import { randomBytes } from 'node:crypto';
import { argon2id, argon2Verify } from 'hash-wasm';

/*
 * Senhas com Argon2id (parâmetros mínimos recomendados pela OWASP: 19 MiB,
 * 2 iterações, 1 via). A biblioteca é WebAssembly puro: roda igual no
 * computador de desenvolvimento e nas funções da Vercel, sem binário nativo.
 */
export const hashDaSenha = (senha: string) =>
  argon2id({ password: senha.normalize('NFKC'), salt: randomBytes(16), parallelism: 1, iterations: 2, memorySize: 19 * 1024, hashLength: 32, outputType: 'encoded' });

export const senhaConfere = (senha: string, hash: string) =>
  argon2Verify({ password: senha.normalize('NFKC'), hash }).catch(() => false);

/** Hash de uma senha qualquer, para gastar o mesmo tempo de conferência quando o e-mail não existe. */
let engodo: Promise<string> | null = null;
export const hashDeEngodo = () => (engodo ??= hashDaSenha('senha que ninguém usa'));

/** Regra mínima: 12 caracteres. Frases longas são melhores que símbolos obrigatórios. */
export const senhaAceitavel = (senha: string) => senha.length >= 12 && senha.length <= 200;
