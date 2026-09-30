import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

/* Segundo fator por aplicativo autenticador (TOTP, RFC 6238): SHA-1, 6 dígitos, 30 segundos. */

const ALFABETO = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

function base32(bytes: Uint8Array) {
  let bits = '';
  for (const b of bytes) bits += b.toString(2).padStart(8, '0');
  return (bits.match(/.{1,5}/g) ?? []).map((g) => ALFABETO[parseInt(g.padEnd(5, '0'), 2)]).join('');
}

function deBase32(texto: string) {
  const bits = [...texto.replace(/=+$/, '').toUpperCase()].map((c) => ALFABETO.indexOf(c).toString(2).padStart(5, '0')).join('');
  return Buffer.from((bits.match(/.{8}/g) ?? []).map((b) => parseInt(b, 2)));
}

export const novoSegredoTotp = () => base32(randomBytes(20));

export function codigoTotp(segredo: string, quando = Date.now()) {
  const contador = Buffer.alloc(8);
  contador.writeBigUInt64BE(BigInt(Math.floor(quando / 30_000)));
  const h = createHmac('sha1', deBase32(segredo)).update(contador).digest();
  const pos = h[h.length - 1] & 0xf;
  return String((h.readUInt32BE(pos) & 0x7fffffff) % 1_000_000).padStart(6, '0');
}

/** Aceita o código do intervalo atual e dos vizinhos (relógio do celular adiantado ou atrasado). */
export function totpConfere(segredo: string, codigo: string, quando = Date.now()) {
  const limpo = codigo.replace(/\s/g, '');
  if (!/^\d{6}$/.test(limpo)) return false;
  return [-1, 0, 1].some((d) => timingSafeEqual(Buffer.from(codigoTotp(segredo, quando + d * 30_000)), Buffer.from(limpo)));
}

/** Endereço que o aplicativo autenticador lê (por QR code ou colado). */
export const uriTotp = (segredo: string, conta: string, emissor = 'Cuidar e Registrar') =>
  `otpauth://totp/${encodeURIComponent(emissor)}:${encodeURIComponent(conta)}?secret=${segredo}&issuer=${encodeURIComponent(emissor)}&algorithm=SHA1&digits=6&period=30`;
