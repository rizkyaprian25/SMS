import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

const ALG = 'aes-256-gcm';

/**
 * Enkripsi data sensitif at-rest (face embedding, UU PDP).
 * Kunci 32 byte hex dari ENKRIPSI_WAJAH_KEY. Format simpan: iv:ct:tag (base64).
 * Rotasi kunci di luar scope MVP — catat kunci aktif di secret manager prod.
 */
function kunci(): Buffer {
  const buf = Buffer.from(process.env.ENKRIPSI_WAJAH_KEY ?? '', 'hex');
  if (buf.length !== 32) {
    throw new Error('ENKRIPSI_WAJAH_KEY harus 64 char hex (32 byte)');
  }
  return buf;
}

export function enkripsiTeks(plain: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALG, kunci(), iv);
  const ct = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  return `${iv.toString('base64')}:${ct.toString('base64')}:${cipher.getAuthTag().toString('base64')}`;
}

export function dekripsiTeks(paket: string): string {
  const [ivB64, ctB64, tagB64] = paket.split(':');
  if (!ivB64 || !ctB64 || !tagB64) throw new Error('Format cipher tidak valid');
  const decipher = createDecipheriv(ALG, kunci(), Buffer.from(ivB64, 'base64'));
  decipher.setAuthTag(Buffer.from(tagB64, 'base64'));
  return Buffer.concat([
    decipher.update(Buffer.from(ctB64, 'base64')),
    decipher.final(),
  ]).toString('utf8');
}
