import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Enable WAL mode for SQLite to improve performance and concurrency
try {
  prisma.$connect().then(() => {
  // WAL mode is SQLite specific, handled by Postgres natively
  /*
    prisma.$executeRawUnsafe('PRAGMA journal_mode = WAL;').catch(err => {
      console.error('[Database] Failed to enable WAL mode:', err);
    });
  */
  });
} catch (err) {
  console.error('[Database] Connection failed:', err);
}

export default prisma;
