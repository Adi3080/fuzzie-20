// Mock database module for development
// Replace with your actual database implementation (Prisma, MongoDB, etc.)

type User = {
  id: string
  clerkId: string
  name: string
  email: string
  profileImage?: string
}

const demoUser: User = {
  id: 'user_123',
  clerkId: 'demo_user_123',
  name: 'Demo User',
  email: 'demo@example.com',
  profileImage: '',
}

// In-memory storage for development
const users: Map<string, User> = new Map([[demoUser.clerkId, demoUser]])

export const db = {
  user: {
    findUnique: async ({ where }: { where: { clerkId: string } }) => {
      return users.get(where.clerkId) || null
    },
    update: async ({
      where,
      data,
    }: {
      where: { clerkId: string }
      data: Partial<User>
    }) => {
      const user = users.get(where.clerkId)
      if (!user) {
        throw new Error('User not found')
      }
      const updated = { ...user, ...data }
      users.set(where.clerkId, updated)
      return updated
    },
    create: async ({ data }: { data: User }) => {
      users.set(data.clerkId, data)
      return data
    },
    upsert: async ({
      where,
      update,
      create,
    }: {
      where: { clerkId: string }
      update: Partial<User>
      create: Omit<User, 'id'> & Partial<Pick<User, 'id'>>
    }) => {
      const existing = users.get(where.clerkId)
      if (existing) {
        const updated = { ...existing, ...update }
        users.set(where.clerkId, updated)
        return updated
      }

      const created = { id: create.id ?? create.clerkId, ...create }
      users.set(created.clerkId, created)
      return created
    },
  },
}


// import 'dotenv/config';
// import postgres from '@prisma/orm-postgres/runtime';
// import type { Contract } from './contract.d';
// import contractJson from './contract.json' with { type: 'json' };

// export const db = postgres<Contract>({
//   contractJson,
//   url: process.env['DATABASE_URL']!,
// });
