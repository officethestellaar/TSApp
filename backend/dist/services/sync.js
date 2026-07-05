"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.synchronizeLocalRegistry = void 0;
const client_1 = require("@prisma/client");
const local_client_1 = require("../generated/local-client");
const cloudPrisma = new client_1.PrismaClient();
const localPrisma = new local_client_1.PrismaClient();
/**
 * Autonomous Synchronization Service
 * Maps Cloud (Supabase) data to Local (SQLite) registry.
 */
const synchronizeLocalRegistry = async () => {
    console.log('[Sync] Initiating autonomous cloud-to-local synchronization...');
    try {
        // Disable foreign keys for the duration of the sync to avoid constraint violations
        await localPrisma.$executeRawUnsafe('PRAGMA foreign_keys = OFF;');
        const models = [
            'role', 'user', 'member', 'activity', 'reservation', 'familyMember',
            'invoice', 'invoiceItem', 'payment', 'restaurantTable', 'menuItem',
            'inventoryItem', 'inventoryLog', 'recipe', 'order', 'orderItem',
            'accessLog', 'complaint', 'message', 'announcement', 'auditLog',
            'asset', 'maintenanceLog', 'aMCPaymentRequest', 'feedback', 'systemStatus',
            'unenrollmentRequest', 'tableReservation', 'staff',
            'staffAttendance', 'staffSalary'
        ];
        for (const model of models) {
            // @ts-ignore - Dynamic model access
            const cloudData = await cloudPrisma[model].findMany();
            // Clear local table and refill
            // @ts-ignore
            await localPrisma[model].deleteMany();
            if (cloudData.length > 0) {
                // SQLite support for createMany is available in Prisma, but skipDuplicates is not
                // @ts-ignore
                await localPrisma[model].createMany({
                    data: cloudData
                });
            }
            console.log(`[Sync] Cloned ${cloudData.length} records for ${model}`);
        }
        // Re-enable foreign keys
        await localPrisma.$executeRawUnsafe('PRAGMA foreign_keys = ON;');
        console.log('[Sync] Local registry is now bit-perfect with Supabase Cloud.');
        return { success: true };
    }
    catch (error) {
        // Attempt to re-enable foreign keys even on failure
        await localPrisma.$executeRawUnsafe('PRAGMA foreign_keys = ON;').catch(() => { });
        console.error('[Sync] Synchronization failure:', error.message);
        return { success: false, error: error.message };
    }
};
exports.synchronizeLocalRegistry = synchronizeLocalRegistry;
