// Minimal Cleanverse A-Pass client shared by the setup scripts in this repo.
// Not a full port of Monsoon_App/lib/cleanverse — this repo is kept
// independent and doesn't import across the two projects.

import { createCipheriv, randomUUID } from "node:crypto";
import type { Address } from "viem";

function aesAlgoForKeyLength(keyBytes: number): string {
  if (keyBytes === 16) return "aes-128-cbc";
  if (keyBytes === 24) return "aes-192-cbc";
  if (keyBytes === 32) return "aes-256-cbc";
  throw new Error(`Unexpected CLEANVERSE_API_KEY length after base64 decode: ${keyBytes} bytes`);
}

function encryptBody(payload: unknown): { data: string } {
  const raw = process.env.CLEANVERSE_API_KEY;
  if (!raw) throw new Error("CLEANVERSE_API_KEY is not set in .env");
  const key = Buffer.from(raw, "base64");
  const cipher = createCipheriv(aesAlgoForKeyLength(key.length), key, Buffer.alloc(16, 0));
  const encrypted = Buffer.concat([cipher.update(JSON.stringify(payload), "utf8"), cipher.final()]);
  return { data: encrypted.toString("base64") };
}

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not set in Monsoon_contract/.env — copy it from Monsoon_App/.env.local`);
  return value;
}

/** Parses a Cleanverse response, surfacing the raw status/body when it isn't
 *  the documented JSON envelope (e.g. a gateway-level 403 "Forbidden." in
 *  plain text — usually means api-id is missing/invalid, per their docs). */
async function parseCleanverseResponse<T>(res: Response): Promise<T> {
  const text = await res.text();
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(`Cleanverse returned a non-JSON response (HTTP ${res.status}): ${text.slice(0, 200)}`);
  }
}

function baseUrl(): string {
  return process.env.CLEANVERSE_BASE_URL ?? "https://uatapi.cleanverse.com/api/cooperate";
}

export async function generateApass(wallet: Address, subTier: number, customerIdPrefix: string) {
  const apiId = requiredEnv("CLEANVERSE_API_ID");
  const customerId = `${customerIdPrefix}${wallet.replace(/^0x/i, "").toUpperCase()}`.slice(0, 32);
  const res = await fetch(`${baseUrl()}/generate_apass`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "api-id": apiId, "X-Request-ID": randomUUID() },
    body: JSON.stringify(
      encryptBody({
        customerId,
        subTier,
        expirationTime: Math.floor(Date.now() / 1000) + 365 * 24 * 60 * 60,
        wallet: { address: wallet, chain: "monad" },
      }),
    ),
  });
  const json = await parseCleanverseResponse<{ code: string; message: string; data: unknown }>(res);
  if (json.code !== "0000") throw new Error(`Cleanverse generate_apass failed [${json.code}]: ${json.message}`);
  return json.data as { cvRecordId: string; tier: string };
}

export async function queryApass(wallet: Address) {
  const apiId = requiredEnv("CLEANVERSE_API_ID");
  const res = await fetch(`${baseUrl()}/query_apass`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "api-id": apiId },
    body: JSON.stringify({ chain: "monad", address: wallet }),
  });
  const json = await parseCleanverseResponse<{ code: string; message: string; data: { tier: string } | string }>(res);
  if (json.code === "0000") return json.data as { tier: string };
  // 0002 = business failure — this is the "no A-Pass registered yet" case
  // per Cleanverse's docs, so it's the only code we treat as "not found".
  // Any other code is a real problem and must not be silently swallowed.
  if (json.code === "0002") return null;
  throw new Error(`Cleanverse query_apass failed [${json.code}]: ${json.message}`);
}

/** Registers an A-Pass for `wallet` only if it doesn't already have one. */
export async function ensureApass(wallet: Address, label: string, subTier = 50) {
  const existing = await queryApass(wallet);
  if (existing) {
    console.log(`${label} already has an A-Pass (tier ${existing.tier}) — skipping generate_apass.`);
    return;
  }
  console.log(`${label} has no A-Pass yet — registering via Cleanverse generate_apass...`);
  const apass = await generateApass(wallet, subTier, label.replace(/[^A-Za-z0-9]/g, "").slice(0, 10));
  console.log(`  done. cvRecordId=${apass.cvRecordId}, tier=${apass.tier}`);
}
