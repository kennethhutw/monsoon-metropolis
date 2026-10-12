// Cleanverse Cooperate API client — low-level HTTP + AES encryption.
// Reads CLEANVERSE_API_ID / CLEANVERSE_API_KEY from env — never import this
// from a 'use client' component. No `import 'server-only'` guard here
// (unlike lib/contracts/real.ts) because this module is also imported by
// standalone tsx scripts (scripts/launch-atoken.ts) outside Next's bundler,
// where that guard throws unconditionally.
// Spec source: docs.cleanverse.com API v5.6 (read 2026-08-01).

import { createCipheriv, createDecipheriv, randomUUID } from 'node:crypto'

const ZERO_IV = Buffer.alloc(16, 0)

function aesAlgoForKeyLength(keyBytes: number): string {
  if (keyBytes === 16) return 'aes-128-cbc'
  if (keyBytes === 24) return 'aes-192-cbc'
  if (keyBytes === 32) return 'aes-256-cbc'
  throw new Error(`Unexpected CLEANVERSE_API_KEY length after base64 decode: ${keyBytes} bytes (expected 16/24/32)`)
}

function getApiKeyBuffer(): Buffer {
  const raw = process.env.CLEANVERSE_API_KEY
  if (!raw) throw new Error('CLEANVERSE_API_KEY is not set')
  return Buffer.from(raw, 'base64')
}

/** AES/CBC/PKCS5Padding, fixed zero IV, key = base64-decoded api-key. */
export function encryptBody(payload: unknown): { data: string } {
  const key = getApiKeyBuffer()
  const cipher = createCipheriv(aesAlgoForKeyLength(key.length), key, ZERO_IV)
  const encrypted = Buffer.concat([cipher.update(JSON.stringify(payload), 'utf8'), cipher.final()])
  return { data: encrypted.toString('base64') }
}

function decryptBase64<T>(base64Ciphertext: string): T {
  const key = getApiKeyBuffer()
  const decipher = createDecipheriv(aesAlgoForKeyLength(key.length), key, ZERO_IV)
  const decrypted = Buffer.concat([decipher.update(Buffer.from(base64Ciphertext, 'base64')), decipher.final()])
  return JSON.parse(decrypted.toString('utf8'))
}

export class CleanverseApiError extends Error {
  constructor(public code: string, message: string) {
    super(`Cleanverse API error [${code}]: ${message}`)
    this.name = 'CleanverseApiError'
  }
}

interface CleanverseEnvelope<T> {
  code: string
  message: string
  data: T
}

// Gateway-level failures (e.g. a 403 "Forbidden." when api-id is missing or
// revoked) come back as plain text, not the JSON envelope — surface them
// with the HTTP status instead of an opaque JSON.parse error.
async function parseEnvelope<T>(res: Response): Promise<CleanverseEnvelope<T>> {
  const text = await res.text()
  try {
    return JSON.parse(text) as CleanverseEnvelope<T>
  } catch {
    throw new CleanverseApiError(`HTTP_${res.status}`, text.slice(0, 200) || 'non-JSON response')
  }
}

function baseUrl(): string {
  return process.env.CLEANVERSE_BASE_URL ?? 'https://uatapi.cleanverse.com/api/cooperate'
}

function headers(): HeadersInit {
  const apiId = process.env.CLEANVERSE_API_ID
  if (!apiId) throw new Error('CLEANVERSE_API_ID is not set')
  return {
    'Content-Type': 'application/json',
    'api-id': apiId,
    'X-Request-ID': randomUUID(),
  }
}

/** POST with an AES-encrypted request body (see docs "Encryption" section for which endpoints require this). */
export async function postEncrypted<TResponse>(path: string, plaintextBody: unknown): Promise<TResponse> {
  const res = await fetch(`${baseUrl()}${path}`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify(encryptBody(plaintextBody)),
  })
  const json = await parseEnvelope<unknown>(res)
  if (json.code !== '0000') throw new CleanverseApiError(json.code, json.message)
  // Some endpoints' example responses return plaintext data; guard in case a
  // given deployment does return an encrypted string per the general spec.
  if (typeof json.data === 'string' && json.data.length > 0) {
    try {
      return decryptBase64<TResponse>(json.data)
    } catch {
      return json.data as TResponse
    }
  }
  return json.data as TResponse
}

/** POST with a plain (unencrypted) JSON body — e.g. query_apass, verify_apass. */
export async function postPlain<TResponse>(path: string, body: unknown): Promise<TResponse> {
  const res = await fetch(`${baseUrl()}${path}`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify(body),
  })
  const json = await parseEnvelope<TResponse>(res)
  if (json.code !== '0000') throw new CleanverseApiError(json.code, json.message)
  return json.data
}

/** GET with no body — e.g. query_apply_status/{requestId}. */
export async function getPlain<TResponse>(path: string): Promise<TResponse> {
  const res = await fetch(`${baseUrl()}${path}`, {
    method: 'GET',
    headers: headers(),
  })
  const json = await parseEnvelope<TResponse>(res)
  if (json.code !== '0000') throw new CleanverseApiError(json.code, json.message)
  return json.data
}
