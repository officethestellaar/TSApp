import prisma from './prisma';
import { synchronizeLocalRegistry } from '../services/sync';

interface AuditLogParams {
  action: string;
  entityType: string;
  entityId?: string;
  description: string;
  oldData?: any;
  newData?: any;
  user: {
    userId: number;
    name: string;
    role: string;
  };
}

export const createAuditLog = async (params: AuditLogParams) => {
  try {
    await prisma.auditLog.create({
      data: {
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId,
        description: params.description,
        oldData: params.oldData ? JSON.stringify(params.oldData) : null,
        newData: params.newData ? JSON.stringify(params.newData) : null,
        userId: params.user.userId,
        userName: params.user.name,
        userRole: params.user.role,
      },
    });

    // Trigger autonomous local sync in the background
    synchronizeLocalRegistry().catch(err => {
      console.error('[Sync] Background synchronization failed:', err);
    });
  } catch (error) {
    console.error('Failed to create audit log:', error);
  }
};
