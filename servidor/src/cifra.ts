import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';

/*
 * Cifra os segredos do segundo fator antes de gravar (AES-256-GCM). A chave
 * vem de TCC_CHAVE_SEGREDOS (32 bytes em base64), definida só nas variáveis
 * de ambiente: quem copiar o banco não consegue gerar códigos.
 */
function chave() {
  const definida = process.env.TCC_CHAVE_SEGREDOS;
  if (definida) {
    const k = Buffer.from(definida, 'base64');
    if (k.length !== 32) throw new Error('TCC_CHAVE_SEGREDOS precisa ter 32 bytes em base64.');
    return k;
  }
  if (process.env.VERCEL_ENV === 'production') throw new Error('TCC_CHAVE_SEGREDOS não definida.');
  // Desenvolvimento e testes: chave fixa, sem valor fora deste ambiente.
  return createHash('sha256').update('chave-de-desenvolvimento-sem-valor').digest();
}

export function cifrar(texto: string) {
  const iv = randomBytes(12);
  const c = createCipheriv('aes-256-gcm', chave(), iv);
  const corpo = Buffer.concat([c.update(texto, 'utf8'), c.final()]);
  return [iv, c.getAuthTag(), corpo].map((b) => b.toString('base64')).join('.');
}

export function decifrar(cifrado: string) {
  const [iv, selo, corpo] = cifrado.split('.').map((p) => Buffer.from(p, 'base64'));
  const d = createDecipheriv('aes-256-gcm', chave(), iv);
  d.setAuthTag(selo);
  return Buffer.concat([d.update(corpo), d.final()]).toString('utf8');
}
