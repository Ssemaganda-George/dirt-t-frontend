// Small client-side JSON encrypt/decrypt helpers using Web Crypto.
// NOTE: Storing an encryption passphrase in frontend code or env that ships to browsers
// is NOT secure for production. Use these helpers for staging/local or as a stop-gap until
// server-side KMS / DB-side encryption is implemented.

const enc = new TextEncoder()
const dec = new TextDecoder()

function toBase64(bytes: Uint8Array) {
  let binary = ''
  const len = bytes.byteLength
  for (let i = 0; i < len; i++) binary += String.fromCharCode(bytes[i])
  return btoa(binary)
}

function fromBase64(b64: string) {
  const binary = atob(b64)
  const len = binary.length
  const bytes = new Uint8Array(len)
  for (let i = 0; i < len; i++) bytes[i] = binary.charCodeAt(i)
  return bytes
}

async function deriveKey(passphrase: string, salt: Uint8Array) {
  const keyMaterial = await crypto.subtle.importKey('raw', enc.encode(passphrase).buffer, { name: 'PBKDF2' }, false, ['deriveKey'])
  return crypto.subtle.deriveKey({ name: 'PBKDF2', salt: salt, iterations: 100000, hash: 'SHA-256' } as Pbkdf2Params, keyMaterial, { name: 'AES-GCM', length: 256 } as AesDerivedKeyParams, false, ['encrypt', 'decrypt'])
}

export async function encryptJSON(passphrase: string, value: any) {
  const json = JSON.stringify(value)
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const key = await deriveKey(passphrase, salt)
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, enc.encode(json)))

  return toBase64(enc.encode(JSON.stringify({ salt: toBase64(salt), iv: toBase64(iv), ct: toBase64(ct) })))
}

export async function decryptJSON(passphrase: string, blobB64: string) {
  const blobJson = dec.decode(fromBase64(blobB64))
  const { salt: s64, iv: iv64, ct: ct64 } = JSON.parse(blobJson)
  const salt = fromBase64(s64)
  const iv = fromBase64(iv64)
  const ct = fromBase64(ct64)
  const key = await deriveKey(passphrase, salt)
  const pt = new Uint8Array(await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ct))
  return JSON.parse(dec.decode(pt))
}

export function isEncryptionEnabled(): boolean {
  // Vite exposes env vars prefixed with VITE_ to the client
  return Boolean((import.meta as any).env?.VITE_ENCRYPTION_PASSPHRASE)
}

export function getEncryptionPassphrase(): string | null {
  return ((import.meta as any).env?.VITE_ENCRYPTION_PASSPHRASE as string) || null
}

export default { encryptJSON, decryptJSON, isEncryptionEnabled, getEncryptionPassphrase }
