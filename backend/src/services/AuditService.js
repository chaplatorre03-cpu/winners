const prisma = require('../lib/prisma');

class AuditService {
    static async log(actorType, actorId, action, entity, entityId = null, previousValue = null, newValue = null, metadata = null) {
        try {
            await prisma.auditLog.create({
                data: {
                    actorType,
                    actorId,
                    action,
                    entity,
                    entityId: entityId ? String(entityId) : null,
                    previousValue,
                    newValue,
                    metadata
                }
            });
        } catch (error) {
            console.error('[AuditService] Failed to create audit log:', error);
            // We do not throw the error to avoid breaking the main transaction, unless strictly necessary.
        }
    }
}

module.exports = AuditService;
