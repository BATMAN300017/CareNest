import { prisma } from "../../core/database/prisma";
import { AppError, ErrorCode } from "../../core/errors/app-error";
import { NotificationFilterInput } from "../../core/validation/notification.schema";
import { NotificationDispatcherService } from "./notification-dispatcher.service";

export class NotificationService {
  /**
   * Retrieves notification history for a patient.
   */
  static async getPatientNotifications(
    patientId: string,
    filter: NotificationFilterInput = { limit: 50 }
  ) {
    const where: any = { patientId };

    if (filter.status) {
      where.status = filter.status;
    }
    if (filter.channel) {
      where.channel = filter.channel;
    }
    if (filter.eventType) {
      where.eventType = filter.eventType;
    }

    return prisma.notification.findMany({
      where,
      include: {
        attempts: {
          orderBy: { attemptedAtUtc: "desc" },
          take: 3,
        },
      },
      orderBy: { createdAt: "desc" },
      take: filter.limit,
    });
  }

  /**
   * Marks an in-app notification as read.
   */
  static async markAsRead(notificationId: string, patientId: string) {
    const notification = await prisma.notification.findUnique({
      where: { id: notificationId },
    });

    if (!notification || notification.patientId !== patientId) {
      throw new AppError("Notification not found.", 404, ErrorCode.NOT_FOUND);
    }

    return prisma.notification.update({
      where: { id: notificationId },
      data: { readAtUtc: new Date() },
    });
  }

  /**
   * Creates a notification record and immediately queues/dispatches it.
   */
  static async createAndDispatch(data: {
    patientId: string;
    recipientUserId: string;
    eventType: string;
    channel: "IN_APP" | "EMAIL" | "SMS" | "TELEPHONE_CALL";
    title: string;
    body: string;
    referenceId?: string;
    scheduledForUtc?: Date;
    metadata?: Record<string, any>;
  }) {
    const notification = await prisma.notification.create({
      data: {
        patientId: data.patientId,
        recipientUserId: data.recipientUserId,
        eventType: data.eventType,
        channel: data.channel,
        title: data.title,
        body: data.body,
        status: "QUEUED",
        referenceId: data.referenceId || null,
        scheduledForUtc: data.scheduledForUtc || null,
        metadata: data.metadata || {},
      },
    });

    // Auto-dispatch in background
    NotificationDispatcherService.dispatch(notification.id).catch(() => {});

    return notification;
  }
}
