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
          // This hook runs after the user (and account) rows are already
          // committed — an uncaught throw here would surface as a 500 on
          // signup even though the account now exists, leaving the client
          // with no way to retry (a repeat signup would just hit "email
          // already in use"). Log and swallow instead: a user with zero
          // seeded categories is recoverable (they can add their own), a
          // signup that silently succeeded but reported failure is not.
          try {
            await seedDefaultCategories(db, user.id)
          } catch (error) {
            console.error(`Failed to seed default categories for user ${user.id}:`, error)
          }
        },
      },
    },
  },
})
