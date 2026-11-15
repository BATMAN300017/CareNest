import { prisma } from "../../../core/database/prisma";
import { NotificationPayload, NotificationResult } from "../interfaces/notification-provider.interface";

export class InAppNotificationProvider {
  static async deliver(notificationId: string, payload: NotificationPayload): Promise<NotificationResult> {
    try {
      await prisma.notification.update({
        where: { id: notificationId },
        data: {
          status: "DELIVERED",
          sentAtUtc: new Date(),
        },
      });

      await prisma.notificationAttempt.create({
        data: {
          notificationId,
          channel: "IN_APP",
          provider: "CARENEST_IN_APP",
          providerMessageId: `inapp_${notificationId}`,
          attemptNumber: 1,
          isSuccessful: true,
          responsePayload: { deliveredAt: new Date().toISOString() },
        },
      });

      return {
        isSuccessful: true,
        provider: "CARENEST_IN_APP",
        providerMessageId: `inapp_${notificationId}`,
      };
    } catch (err: any) {
      return {
        isSuccessful: false,
        provider: "CARENEST_IN_APP",
        errorMessage: err.message,
      };
    }
  }
}
