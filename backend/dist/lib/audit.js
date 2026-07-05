"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createAuditLog = void 0;
const prisma_1 = __importDefault(require("./prisma"));
const sync_1 = require("../services/sync");
const createAuditLog = async (params) => {
    try {
        await prisma_1.default.auditLog.create({
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
        (0, sync_1.synchronizeLocalRegistry)().catch(err => {
            console.error('[Sync] Background synchronization failed:', err);
        });
    }
    catch (error) {
        console.error('Failed to create audit log:', error);
    }
};
exports.createAuditLog = createAuditLog;
