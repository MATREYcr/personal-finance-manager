import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Prisma 7 requires an explicit driver adapter at runtime — the datasource
// block in schema.prisma no longer carries a `url`, so the connection string
// must be provided here (this is separate from prisma.config.ts, which only
// configures the Prisma CLI for migrations/generate).
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL })

export const db = globalForPrisma.prisma ?? new PrismaClient({ adapter })

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = db
}
