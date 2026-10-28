import { betterAuth, APIError } from "better-auth";
import { getDbPool } from "./db.js";
import { sendWelcomeEmail } from "./email.js";
import { evaluasiAturanPassword } from "./utils.js";

export const auth = betterAuth({
  baseURL:
    process.env.BETTER_AUTH_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000"),
  database: getDbPool(),
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
    accountLinking: {
      enabled: true,
      disableImplicitLinking: true, // Paksa verifikasi email sebelum linking
      trustedProviders: ["google"],
    },
  },
  socialProviders: {
    ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
      ? {
          google: {
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
          },
        }
      : {}),
  },
  rateLimit: {
    enabled: process.env.NODE_ENV === "production",
    window: 60,
    max: 100,
  },
  trustedOrigins: [
    process.env.BETTER_AUTH_URL || "http://localhost:3000",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    ...(process.env.VERCEL_URL ? [`https://${process.env.VERCEL_URL}`] : []),
    ...(process.env.NEXT_PUBLIC_APP_URL ? [process.env.NEXT_PUBLIC_APP_URL] : []),
  ],
});
