"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
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
}
catch (err) {
    console.error('[Database] Connection failed:', err);
}
exports.default = prisma;
