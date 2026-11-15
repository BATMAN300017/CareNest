import { prisma } from "../../core/database/prisma";

export interface LogAuditOptions {
  patientId: string;
  actorUserId?: string | null;
  action: string;
  resourceType: string;
  resourceId?: string | null;
  previousState?: any;
  newState?: any;
  ipAddress?: string | null;
  userAgent?: string | null;
}

export class AuditService {
  /**
   * Writes an immutable audit log record.
   * Fails gracefully without throwing to prevent secondary logging errors from breaking primary operations.
   */
  static async log(options: LogAuditOptions): Promise<void> {
    try {
      await prisma.auditLog.create({
        data: {
          patientId: options.patientId,
          actorUserId: options.actorUserId || null,
          action: options.action,
          resourceType: options.resourceType,
          resourceId: options.resourceId || null,
          previousState: options.previousState ? JSON.parse(JSON.stringify(options.previousState)) : null,
          newState: options.newState ? JSON.parse(JSON.stringify(options.newState)) : null,
          ipAddress: options.ipAddress || null,
          userAgent: options.userAgent || null,
        },
      });
    } catch (err) {
      console.error("[AuditService] Failed to record audit log:", err);
    }
  }

  /**
   * Retrieves audit history for a patient with pagination.
   */
  static async getPatientAuditLogs(patientId: string, limit: number = 50, offset: number = 0) {
    return prisma.auditLog.findMany({
      where: { patientId },
      orderBy: { timestamp: "desc" },
      take: limit,
      skip: offset,
      include: {
        actorUser: {
          select: {
            id: true,
            fullName: true,
            email: true,
            systemRole: true,
          },
        },
      },
    });
  }
}
