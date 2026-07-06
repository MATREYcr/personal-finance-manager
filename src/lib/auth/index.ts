import { betterAuth } from 'better-auth'
import { prismaAdapter } from 'better-auth/adapters/prisma'
import { db } from '@/lib/db'
import { seedDefaultCategories } from '@/features/categories/seed'

export const auth = betterAuth({
  database: prismaAdapter(db, {
    provider: 'postgresql',
  }),
  emailAndPassword: {
    enabled: true,
  },
  user: {
    additionalFields: {
      baseCurrency: {
        type: 'string',
        required: true,
        defaultValue: 'USD',
        input: false,
      },
    },
  },
  databaseHooks: {
    user: {
      create: {
        after: async (user) => {
          await seedDefaultCategories(db, user.id)
        },
      },
    },
  },
})
