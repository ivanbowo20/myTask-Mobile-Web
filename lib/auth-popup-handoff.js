import crypto from "crypto";
import { getDbPool, isPlaceholderEnv, isUsingRealDatabase } from "./db.js";

const FLOW_PENDING_TTL_MS = 5 * 60 * 1000; // 5 minutes for user to finish Google login in popup
const FLOW_COMPLETED_TTL_MS = 90 * 1000; // 90 seconds window for parent iframe to claim cookie
const MAX_PENDING_FLOWS = 300;
const FLOW_PREFIX = "popup_oauth_flow:";
const FLOW_IDENTIFIER = "popup_oauth_flow";
const FLOW_ID_REGEX = /^[a-f0-9]{64}$/i;

function getMemoryStore() {
  if (!globalThis.__mytaskAuthPopupFlows) {
    globalThis.__mytaskAuthPopupFlows = new Map();
  }
  return globalThis.__mytaskAuthPopupFlows;
}

function pruneMemoryStore(store) {
  const now = Date.now();
  for (const [key, entry] of store.entries()) {
    if (!entry || entry.expiresAt <= now) {
      store.delete(key);
    }
  }
}

function getEncryptionKey() {
  const rawSecret = process.env.BETTER_AUTH_SECRET;
  const material =
    !isPlaceholderEnv(rawSecret) && rawSecret.trim().length >= 16
      ? rawSecret.trim()
      : globalThis.__ephemeralBetterAuthSecret ||
        (globalThis.__ephemeralBetterAuthSecret = crypto.randomBytes(32).toString("hex"));
  return crypto.createHash("sha256").update(`mytask-popup-handoff:${material}`).digest();
}

function encryptPayload(obj) {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const plaintext = Buffer.from(JSON.stringify(obj), "utf8");
  const encrypted = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `${iv.toString("base64url")}.${authTag.toString("base64url")}.${encrypted.toString("base64url")}`;
}

function decryptPayload(token) {
  if (typeof token !== "string") return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  try {
    const key = getEncryptionKey();
    const iv = Buffer.from(parts[0], "base64url");
    const authTag = Buffer.from(parts[1], "base64url");
    const encrypted = Buffer.from(parts[2], "base64url");
    const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
    decipher.setAuthTag(authTag);
    const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
    return JSON.parse(decrypted.toString("utf8"));
  } catch {
    return null;
  }
}

export function isValidPopupFlowId(flowId) {
  return typeof flowId === "string" && FLOW_ID_REGEX.test(flowId);
}

/**
 * Registers a server-side OAuth popup flow ID before opening the popup window.
 * Bridges Chrome's COOP (which severs window.opener on accounts.google.com) and
 * Storage Partitioning (which isolates BroadcastChannel/cookies between iframe and popup).
 */
export async function createPopupFlow() {
  const flowId = crypto.randomBytes(32).toString("hex");
  const expiresAtMs = Date.now() + FLOW_PENDING_TTL_MS;
  const payload = { status: "pending" };

  if (isUsingRealDatabase()) {
    const pool = getDbPool();
    if (pool) {
      try {
        await pool.query(
          `DELETE FROM public."verification" WHERE identifier = $1 AND "expiresAt" <= NOW()`,
          [FLOW_IDENTIFIER]
        );
        await pool.query(
          `INSERT INTO public."verification" (id, identifier, value, "expiresAt", "createdAt", "updatedAt")
           VALUES ($1, $2, $3, $4, NOW(), NOW())`,
          [`${FLOW_PREFIX}${flowId}`, FLOW_IDENTIFIER, encryptPayload(payload), new Date(expiresAtMs)]
        );
        return flowId;
      } catch (err) {
        console.error("[AUTH-POPUP] Failed to persist popup flow to DB, falling back to memory:", err?.message || err);
      }
    }
  }

  const store = getMemoryStore();
  pruneMemoryStore(store);
  if (store.size >= MAX_PENDING_FLOWS) {
    const oldestKey = store.keys().next().value;
    if (oldestKey) store.delete(oldestKey);
  }
  store.set(flowId, { ...payload, expiresAt: expiresAtMs });
  return flowId;
}

/**
 * Attaches a verified Better Auth session cookie to a pending popup flow so the
 * parent iframe can claim it once via POST /api/auth/popup-session.
 */
export async function completePopupFlow(flowId, { cookieName, cookieValue }) {
  if (!isValidPopupFlowId(flowId) || !cookieName || !cookieValue) return false;

  const expiresAtMs = Date.now() + FLOW_COMPLETED_TTL_MS;
  const payload = {
    status: "completed",
    cookieName,
    cookieValue,
  };

  if (isUsingRealDatabase()) {
    const pool = getDbPool();
    if (pool) {
      try {
        const res = await pool.query(
          `UPDATE public."verification"
           SET value = $1, "expiresAt" = $2, "updatedAt" = NOW()
           WHERE id = $3 AND identifier = $4 AND "expiresAt" > NOW()`,
          [encryptPayload(payload), new Date(expiresAtMs), `${FLOW_PREFIX}${flowId}`, FLOW_IDENTIFIER]
        );
        if (res.rowCount > 0) return true;
      } catch (err) {
        console.error("[AUTH-POPUP] Failed to complete popup flow in DB:", err?.message || err);
      }
    }
  }

  const store = getMemoryStore();
  pruneMemoryStore(store);
  const existing = store.get(flowId);
  if (!existing || existing.expiresAt <= Date.now()) {
    return false;
  }
  store.set(flowId, { ...payload, expiresAt: expiresAtMs });
  return true;
}

/**
 * Records an OAuth failure for a pending popup flow so the parent iframe stops polling.
 */
export async function failPopupFlow(flowId, errorCode = "auth_callback_failed") {
  if (!isValidPopupFlowId(flowId)) return false;

  const safeError =
    String(errorCode || "auth_callback_failed")
      .replace(/[^a-zA-Z0-9_-]/g, "")
      .slice(0, 64) || "auth_callback_failed";
  const expiresAtMs = Date.now() + FLOW_COMPLETED_TTL_MS;
  const payload = { status: "error", error: safeError };

  if (isUsingRealDatabase()) {
    const pool = getDbPool();
    if (pool) {
      try {
        const res = await pool.query(
          `UPDATE public."verification"
           SET value = $1, "expiresAt" = $2, "updatedAt" = NOW()
           WHERE id = $3 AND identifier = $4 AND "expiresAt" > NOW()`,
          [encryptPayload(payload), new Date(expiresAtMs), `${FLOW_PREFIX}${flowId}`, FLOW_IDENTIFIER]
        );
        if (res.rowCount > 0) return true;
      } catch (err) {
        console.error("[AUTH-POPUP] Failed to mark popup flow error in DB:", err?.message || err);
      }
    }
  }

  const store = getMemoryStore();
  pruneMemoryStore(store);
  const existing = store.get(flowId);
  if (!existing || existing.expiresAt <= Date.now()) {
    return false;
  }
  store.set(flowId, { ...payload, expiresAt: expiresAtMs });
  return true;
}

/**
 * Checks a popup flow's status. If completed or errored, atomically deletes the record
 * (strict single-use, prevents replay) and returns the decrypted result.
 */
export async function pollOrConsumePopupFlow(flowId) {
  if (!isValidPopupFlowId(flowId)) {
    return { status: "expired" };
  }

  if (isUsingRealDatabase()) {
    const pool = getDbPool();
    if (pool) {
      try {
        const selectRes = await pool.query(
          `SELECT value, "expiresAt" FROM public."verification"
           WHERE id = $1 AND identifier = $2`,
          [`${FLOW_PREFIX}${flowId}`, FLOW_IDENTIFIER]
        );

        if (selectRes.rows.length > 0) {
          const row = selectRes.rows[0];
          const isExpired = new Date(row.expiresAt).getTime() <= Date.now();
          if (isExpired) {
            await pool.query(
              `DELETE FROM public."verification" WHERE id = $1 AND identifier = $2`,
              [`${FLOW_PREFIX}${flowId}`, FLOW_IDENTIFIER]
            );
            return { status: "expired" };
          }

          const parsed = decryptPayload(row.value);
          if (!parsed) {
            await pool.query(
              `DELETE FROM public."verification" WHERE id = $1 AND identifier = $2`,
              [`${FLOW_PREFIX}${flowId}`, FLOW_IDENTIFIER]
            );
            return { status: "expired" };
          }

          if (parsed.status === "pending") {
            return { status: "pending" };
          }

          // Atomically consume completed or errored flow so only one caller can ever claim it
          const deleteRes = await pool.query(
            `DELETE FROM public."verification"
             WHERE id = $1 AND identifier = $2 AND "expiresAt" > NOW()
             RETURNING value`,
            [`${FLOW_PREFIX}${flowId}`, FLOW_IDENTIFIER]
          );

          if (deleteRes.rows.length === 0) {
            return { status: "expired" };
          }

          const consumed = decryptPayload(deleteRes.rows[0].value);
          if (!consumed) return { status: "expired" };

          if (consumed.status === "completed" && consumed.cookieName && consumed.cookieValue) {
            return {
              status: "completed",
              cookieName: consumed.cookieName,
              cookieValue: consumed.cookieValue,
            };
          }

          if (consumed.status === "error") {
            return { status: "error", error: consumed.error || "auth_callback_failed" };
          }

          return { status: "expired" };
        }
      } catch (err) {
        console.error("[AUTH-POPUP] Failed to poll popup flow in DB:", err?.message || err);
      }
    }
  }

  // In-memory store check (fallback or mock DB mode)
  const store = getMemoryStore();
  pruneMemoryStore(store);
  const entry = store.get(flowId);
  if (!entry || entry.expiresAt <= Date.now()) {
    store.delete(flowId);
    return { status: "expired" };
  }

  if (entry.status === "pending") {
    return { status: "pending" };
  }

  store.delete(flowId);

  if (entry.status === "completed" && entry.cookieName && entry.cookieValue) {
    return {
      status: "completed",
      cookieName: entry.cookieName,
      cookieValue: entry.cookieValue,
    };
  }

  if (entry.status === "error") {
    return { status: "error", error: entry.error || "auth_callback_failed" };
  }

  return { status: "expired" };
}
