// dotenv/config only loads `.env`; this project keeps secrets in `.env.local`.
import { config } from "dotenv";
import { defineConfig } from "prisma/config";

config({ path: ".env.local" });

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  // CLI ops (migrate, validate, studio) must use DIRECT_URL, a session/direct
  // connection: the transaction-mode pooled DATABASE_URL caused "prepared
  // statement already exists" hangs against Supabase's pooler. DATABASE_URL is
  // used separately by the runtime driver adapter (src/lib/db/index.ts).
  datasource: {
    url: process.env["DIRECT_URL"],
  },
});
