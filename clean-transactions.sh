#!/bin/bash
# Clears: Logs, Invoices, Payments, Inventory, Assets
# Keeps: Users, Roles, Members, Staff, and all other data

cd "$(dirname "$0")/backend"

export NODE_ENV=production

npx tsx -e "
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function clean() {
  // Disable FK checks
  await prisma.\$executeRawUnsafe(\"SET session_replication_role = 'replica';\");

  // Order: children before parents
  const tables = [
    'auditLog',           // All logs
    'maintenanceLog',     // Depends on asset
    'inventoryLog',       // Depends on inventoryItem
    'invoiceItem',        // Depends on invoice
    'payment',            // Depends on invoice
    'invoice',            // Invoices
    'inventoryItem',      // Inventory
    'asset',              // Assets
  ];

  for (const t of tables) {
    try {
      const count = await (prisma as any)[t].deleteMany();
      console.log(\"  Deleted \" + count.count + \" from \" + t);
    } catch (e: any) {
      console.log(\"  Skipped \" + t + \": \" + e.message?.slice(0, 80));
    }
  }

  // Re-enable FK checks
  await prisma.\$executeRawUnsafe(\"SET session_replication_role = 'origin';\");
  console.log('\nDone. Logs, invoices, payments, inventory, and assets cleared.');
}
clean().catch(console.error).finally(() => prisma.\$disconnect());
"
