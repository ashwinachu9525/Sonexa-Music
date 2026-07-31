import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

// Strip query parameters (like ?sslmode=require) from the connection string
// so that they don't override the manual ssl config provided below.
const connectionString = process.env.DATABASE_URL?.split('?')[0];

const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma = globalForPrisma.prisma || (function () {
  const pool = new Pool({ 
    connectionString,
    ssl: {
      rejectUnauthorized: false
    }
  });
  const adapter = new PrismaPg(pool);
  return new PrismaClient({ adapter });
})();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export default prisma;
