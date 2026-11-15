import { db } from '../db/store';
import { AuditLog, Role } from '../types';

export class AuditService {
  static logAction(
    userId: string | null,
    userName: string,
    userRole: Role | undefined,
    action: string,
    entity: string,
    entityId: string,
    details: Record<string, any> | null = null
  ): AuditLog {
    const log: AuditLog = {
      id: `audit-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      userId,
      userName,
      userRole,
      action,
      entity,
      entityId,
      details,
      createdAt: new Date().toISOString(),
    };
    db.auditLogs.unshift(log);
    return log;
  }

  static listAuditLogs(filters?: { action?: string; search?: string; limit?: number }): AuditLog[] {
    let result = [...db.auditLogs];

    if (filters?.action && filters.action !== 'ALL') {
      result = result.filter((l) => l.action === filters.action);
    }

    if (filters?.search) {
      const q = filters.search.toLowerCase();
      result = result.filter(
        (l) =>
          l.entityId.toLowerCase().includes(q) ||
          l.action.toLowerCase().includes(q) ||
          (l.userName && l.userName.toLowerCase().includes(q))
      );
    }

    const limit = filters?.limit || 50;
    return result.slice(0, limit);
  }
}
