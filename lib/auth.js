import crypto from "crypto";
import { betterAuth, APIError } from "better-auth";
import { memoryAdapter } from "better-auth/adapters/memory";
import {
  getDbConfigSignature,
  getDbPool,
  isPlaceholderEnv,
  isUsingRealDatabase,
} from "./db.js";
import { sendWelcomeEmail } from "./email.js";
import { evaluasiAturanPassword } from "./utils.js";

function getMemoryAuthDb() {
  if (!globalThis.__mockAuthDb) {
    globalThis.__mockAuthDb = {
      user: [],
      session: [],
      account: [],
      verification: [],
    };
  }
  return globalThis.__mockAuthDb;
}

function getResolvedAuthSecret() {
  const rawSecret = process.env.BETTER_AUTH_SECRET;
  if (!isPlaceholderEnv(rawSecret) && rawSecret.trim().length >= 16) {
    return rawSecret.trim();
  }
  if (!globalThis.__ephemeralBetterAuthSecret) {
    globalThis.__ephemeralBetterAuthSecret = crypto.randomBytes(32).toString("hex");
  }
  return globalThis.__ephemeralBetterAuthSecret;
}

function getRuntimeAppUrl() {
  const raw = process.env.APP_URL;
  if (isPlaceholderEnv(raw)) return undefined;
  const trimmed = raw.trim();
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol === "http:" || parsed.protocol === "https:") {
      return trimmed.replace(/\/$/, "");
    }
  } catch {
    // Ignore malformed APP_URL
  }
  return undefined;
}

function getResolvedBaseURL() {
  const runtimeAppUrl = getRuntimeAppUrl();
  if (runtimeAppUrl) return runtimeAppUrl;

  const candidates = [
    process.env.BETTER_AUTH_URL,
    process.env.NEXT_PUBLIC_APP_URL,
    process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "",
  ];
  for (const candidate of candidates) {
    if (!isPlaceholderEnv(candidate)) {
      const trimmed = candidate.trim();
      try {
        const parsed = new URL(trimmed);
        if (parsed.protocol === "http:" || parsed.protocol === "https:") {
          return trimmed.replace(/\/$/, "");
        }
      } catch {
        // Ignore malformed URL candidate
      }
    }
  }
  return undefined;
}

function getAllowedAuthHosts(configuredBaseURL) {
  const hosts = new Set([
    "localhost:3000",
    "127.0.0.1:3000",
    "*.run.app",
    "*.aistudio.google.com",
    "*.vercel.app",
  ]);
  const addHostFromUrl = (raw) => {
    if (isPlaceholderEnv(raw)) return;
    try {
      const parsed = new URL(raw.trim());
      if (parsed.host) hosts.add(parsed.host);
    } catch {
      // Ignore malformed URL
    }
  };
  addHostFromUrl(process.env.APP_URL);
  addHostFromUrl(configuredBaseURL);
  addHostFromUrl(process.env.BETTER_AUTH_URL);
  addHostFromUrl(process.env.NEXT_PUBLIC_APP_URL);
  if (process.env.VERCEL_URL) {
    hosts.add(process.env.VERCEL_URL.trim());
  }
  return Array.from(hosts);
}

export function getAuthConfigStatus() {
  return {
    secretConfigured:
      !isPlaceholderEnv(process.env.BETTER_AUTH_SECRET) &&
      process.env.BETTER_AUTH_SECRET.trim().length >= 16,
    googleOAuthConfigured:
      !isPlaceholderEnv(process.env.GOOGLE_CLIENT_ID) &&
      !isPlaceholderEnv(process.env.GOOGLE_CLIENT_SECRET),
    supabasePublicConfigured:
      !isPlaceholderEnv(process.env.NEXT_PUBLIC_SUPABASE_URL) &&
      !isPlaceholderEnv(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
  };
}

function createAuthInstance() {
  const useRealDb = isUsingRealDatabase();
  const runtimeAppUrl = getRuntimeAppUrl();
  const configuredBaseURL = getResolvedBaseURL();
  const secret = getResolvedAuthSecret();
  const allowedHosts = getAllowedAuthHosts(configuredBaseURL);
  const { googleOAuthConfigured } = getAuthConfigStatus();

  return betterAuth({
    // When running behind AI Studio's reverse proxy, APP_URL is authoritative so OAuth
    // redirect_uri never degrades to http://localhost:3000.
    baseURL: runtimeAppUrl
      ? runtimeAppUrl
      : {
          allowedHosts,
          fallback: configuredBaseURL || "http://localhost:3000",
          protocol: "auto",
        },
    secret,
    database: useRealDb ? getDbPool() : memoryAdapter(getMemoryAuthDb()),
    advanced: {
      trustedProxyHeaders: true,
      defaultCookieAttributes: {
        sameSite: "none",
        secure: true,
        partitioned: true,
      },
    },
    hooks: {
      before: async (context) => {
        if (context.path === "/sign-up/email") {
          const password = context.body?.password;
          const evaluation = evaluasiAturanPassword(password);
          if (!evaluation.isValid) {
            throw new APIError("BAD_REQUEST", {
              message:
                "Kata sandi harus minimal 8 karakter dan mengandung setidaknya 1 huruf besar, 1 angka, dan 1 simbol.",
            });
          }
        }
      },
    },
    databaseHooks: {
      user: {
        create: {
          after: async (user) => {
            try {
              if (user?.email) {
                sendWelcomeEmail({
                  to: user.email,
                  name: user.name || "Pengguna",
                }).catch((err) => {
                  console.error("[MAIL] Gagal mengirim Welcome Email ke user baru:", err);
                });
              }
            } catch (err) {
              console.error("[AUTH] Error pada hook user create after:", err);
            }
          },
        },
      },
    },
    emailAndPassword: {
      enabled: true,
      minPasswordLength: 8,
    },
    account: {
      storeStateStrategy: useRealDb ? "database" : "cookie",
      // In cross-origin iframe previews, a top-level OAuth popup cannot read the iframe's
      // partitioned state cookie; state + PKCE S256 are still enforced via PostgreSQL verification table.
      skipStateCookieCheck: Boolean(runtimeAppUrl && useRealDb),
      accountLinking: {
        enabled: true,
        disableImplicitLinking: true, // Paksa verifikasi email sebelum linking
        trustedProviders: ["google"],
      },
    },
    socialProviders: {
      ...(googleOAuthConfigured
        ? {
            google: {
              clientId: process.env.GOOGLE_CLIENT_ID.trim(),
              clientSecret: process.env.GOOGLE_CLIENT_SECRET.trim(),
            },
          }
        : {}),
    },
    rateLimit: {
      enabled: process.env.NODE_ENV === "production",
      window: 60,
      max: 100,
    },
    trustedOrigins: (request) => {
      const origins = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "https://*.run.app",
        "https://*.aistudio.google.com",
      ];
      if (runtimeAppUrl) origins.push(runtimeAppUrl);
      if (configuredBaseURL) origins.push(configuredBaseURL);
      if (!isPlaceholderEnv(process.env.BETTER_AUTH_URL)) {
        origins.push(process.env.BETTER_AUTH_URL.trim());
      }
      if (!isPlaceholderEnv(process.env.NEXT_PUBLIC_APP_URL)) {
        origins.push(process.env.NEXT_PUBLIC_APP_URL.trim());
      }
      if (process.env.VERCEL_URL) {
        origins.push(`https://${process.env.VERCEL_URL}`);
      }

      const reqOrigin = request?.headers?.get?.("origin");
      const reqHost =
        request?.headers?.get?.("x-forwarded-host") ||
        request?.headers?.get?.("host");
      if (reqOrigin && reqHost) {
        try {
          const parsedOrigin = new URL(reqOrigin);
          if (parsedOrigin.host === reqHost.split(",")[0].trim()) {
            origins.push(reqOrigin);
          }
        } catch {
          // Ignore malformed Origin header
        }
      }
      return Array.from(new Set(origins));
    },
  });
}

function getAuthConfigSignature() {
  const dbSig = getDbConfigSignature();
  const secretSig = crypto
    .createHash("sha256")
    .update(getResolvedAuthSecret())
    .digest("hex");
  const baseURL = getResolvedBaseURL() || "";
  return `${dbSig}|${secretSig}|${baseURL}`;
}

export function getAuth() {
  const sig = getAuthConfigSignature();
  if (!globalThis.__betterAuthInstance || globalThis.__betterAuthConfigSig !== sig) {
    globalThis.__betterAuthInstance = createAuthInstance();
    globalThis.__betterAuthConfigSig = sig;
  }
  return globalThis.__betterAuthInstance;
}

export function reloadAuth() {
  globalThis.__betterAuthInstance = null;
  globalThis.__betterAuthConfigSig = null;
  return getAuth();
}

export const auth = new Proxy(
  {},
  {
    get(_target, prop) {
      if (prop === "handler") {
        return (request) => getAuth().handler(request);
      }
      const instance = getAuth();
      const value = instance[prop];
      return typeof value === "function" ? value.bind(instance) : value;
    },
    has(_target, prop) {
      return prop in getAuth();
    },
  }
);
