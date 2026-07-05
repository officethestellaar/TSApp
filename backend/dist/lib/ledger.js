"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteLedgerTransaction = exports.updateLedgerTransaction = exports.getLedgerTransactions = exports.commitToLedger = void 0;
const ledger_client_1 = require("../generated/ledger-client");
const ledgerPrisma = new ledger_client_1.PrismaClient();
/**
 * Commits a transaction to the specialized secondary ledger database.
 */
const commitToLedger = async (params) => {
    try {
        await ledgerPrisma.transaction.create({
            data: {
                staffId: params.staffId,
                staffName: params.staffName,
                memberName: params.memberName,
                memberId: params.memberId || 'N/A',
                amount: params.amount,
                type: params.type,
                description: params.description,
            },
        });
        console.log(`[Ledger] Transaction node committed to secondary database.`);
    }
    catch (error) {
        console.error('[Ledger] Failed to commit to secondary database:', error.message);
    }
};
exports.commitToLedger = commitToLedger;
/**
 * Retrieves all transactions from the secondary ledger.
 */
const getLedgerTransactions = async () => {
    return await ledgerPrisma.transaction.findMany({
        orderBy: { timestamp: 'desc' },
    });
};
exports.getLedgerTransactions = getLedgerTransactions;
/**
 * Updates a transaction in the secondary ledger.
 */
const updateLedgerTransaction = async (id, data) => {
    return await ledgerPrisma.transaction.update({
        where: { id },
        data,
    });
};
exports.updateLedgerTransaction = updateLedgerTransaction;
/**
 * Deletes a transaction from the secondary ledger.
 */
const deleteLedgerTransaction = async (id) => {
    return await ledgerPrisma.transaction.delete({
        where: { id },
    });
};
exports.deleteLedgerTransaction = deleteLedgerTransaction;
