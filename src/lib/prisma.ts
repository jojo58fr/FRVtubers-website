import 'server-only'

import { PrismaClient } from '@prisma/client'
import { securityLog } from '@/lib/security-log'

const createPrismaClient = () => {
  const client = new PrismaClient({
    log: [{ emit: 'event', level: 'error' }, { emit: 'event', level: 'warn' }],
  })
  // Prisma's raw error messages can include queries and supplied field values.
  client.$on('error', () => securityLog('error', 'database.error'))
  client.$on('warn', () => securityLog('warn', 'database.warning'))
  return client
}

const globalForPrisma = globalThis as unknown as {
  prisma?: ReturnType<typeof createPrismaClient>
}

export const prisma =
  globalForPrisma.prisma ??
  createPrismaClient()

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}

export default prisma
