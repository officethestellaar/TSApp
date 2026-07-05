import { PrismaClient as LedgerClient } from '../generated/ledger-client';

const ledgerPrisma = new LedgerClient();

interface LedgerParams {
  staffId: number;
  staffName: string;
  memberName: string;
  memberId?: string;
  amount: number;
  type: string;
  description: string;
}

/**
 * Commits a transaction to the specialized secondary ledger database.
 */
export const commitToLedger = async (params: LedgerParams) => {
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
  } catch (error: any) {
    console.error('[Ledger] Failed to commit to secondary database:', error.message);
  }
};

/**
 * Retrieves all transactions from the secondary ledger.
 */
export const getLedgerTransactions = async () => {
  return await ledgerPrisma.transaction.findMany({
    orderBy: { timestamp: 'desc' },
  });
};

/**
 * Updates a transaction in the secondary ledger.
 */
export const updateLedgerTransaction = async (id: number, data: any) => {
  return await ledgerPrisma.transaction.update({
    where: { id },
    data,
  });
};

/**
 * Deletes a transaction from the secondary ledger.
 */
export const deleteLedgerTransaction = async (id: number) => {
  return await ledgerPrisma.transaction.delete({
    where: { id },
  });
};
