/**
 * Keyset (cursor) pagination utilities.
 *
 * Keyset pagination records WHERE we left off and tells Postgres to
 * start from there using an indexed comparison — O(log n) vs O(n).
 *
 * Cursor format: base64url( JSON payload + "." + HMAC-SHA256 signature )
 * The signature prevents clients from crafting or tampering with cursors.
 */

import crypto from "node:crypto";
import { env } from "@/config/env";

const HMAC_ALGO = "sha256";

function sign(data: string): string {
  return crypto.createHmac(HMAC_ALGO, env.JWT_SECRET).update(data).digest("base64url");
}

function verify(data: string, signature: string): boolean {
  const expected = sign(data);
  try {
    return crypto.timingSafeEqual(
      Buffer.from(expected, "base64url"),
      Buffer.from(signature, "base64url"),
    );
  } catch {
    return false;
  }
}

export function encodeCursor(payload: Record<string, unknown>): string {
  const data = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = sign(data);
  return `${data}.${sig}`;
}

export function decodeCursor<T extends Record<string, unknown>>(cursor: string): T | null {
  const dotIdx = cursor.lastIndexOf(".");
  if (dotIdx === -1) return null;

  const data = cursor.slice(0, dotIdx);
  const sig = cursor.slice(dotIdx + 1);

  if (!verify(data, sig)) return null;

  try {
    return JSON.parse(Buffer.from(data, "base64url").toString("utf-8")) as T;
  } catch {
    return null;
  }
}

export interface OffsetMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export function offsetMeta(total: number, page: number, limit: number): OffsetMeta {
  return {
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
  };
}
