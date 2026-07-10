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
          // Swallow: this runs after the user row is committed, so throwing here would 500 an otherwise-successful signup.
          try {
            await seedDefaultCategories(db, user.id)
          } catch (error) {
            console.error(
              `Failed to seed default categories for user ${user.id}:`,
              error,
            )
          }
        },
      },
    },
  },
})
