import { prisma } from "../../core/database/prisma";
import { InAppNotificationProvider } from "./providers/in-app.provider";
import { TwilioSmsProvider } from "./providers/twilio-sms.provider";
import { ResendEmailProvider } from "./providers/resend-email.provider";
import { ISmsProvider } from "./interfaces/sms-provider.interface";
import { IEmailProvider } from "./interfaces/email-provider.interface";
import { TelephonyService } from "../telephony/telephony.service";

export class NotificationDispatcherService {
  private static smsProvider: ISmsProvider = new TwilioSmsProvider();
  private static emailProvider: IEmailProvider = new ResendEmailProvider();

  static setSmsProvider(provider: ISmsProvider) {
    this.smsProvider = provider;
  }

  static setEmailProvider(provider: IEmailProvider) {
    this.emailProvider = provider;
  }

  /**
   * Dispatches a queued notification through its designated channel.
   */
  static async dispatch(notificationId: string) {
    const notification = await prisma.notification.findUnique({
      where: { id: notificationId },
      include: {
        recipientUser: true,
        patient: true,
      },
    });

    if (!notification || notification.status === "CANCELLED" || notification.status === "DELIVERED") {
      return { skipped: true };
    }

    let isSuccess = false;
    let providerName = "UNKNOWN";
    let providerMsgId: string | undefined;
    let errorMessage: string | undefined;

    try {
      if (notification.channel === "IN_APP") {
        const res = await InAppNotificationProvider.deliver(notificationId, notification as any);
        isSuccess = res.isSuccessful;
        providerName = res.provider;
        providerMsgId = res.providerMessageId;
        errorMessage = res.errorMessage;
      } else if (notification.channel === "SMS") {
        const phone = notification.recipientUser.phoneNumber || notification.patient.primaryPhone;
        const res = await this.smsProvider.sendSms({
          toPhone: phone,
          body: `${notification.title}\n\n${notification.body}`,
        });
        isSuccess = res.isSuccessful;
        providerName = res.provider;
        providerMsgId = res.messageSid;
        errorMessage = res.errorMessage;
      } else if (notification.channel === "EMAIL") {
        const email = notification.recipientUser.email;
        if (!email) {
          isSuccess = false;
          errorMessage = "Recipient user does not have an email address configured";
        } else {
          const res = await this.emailProvider.sendEmail({
            toEmail: email,
            subject: notification.title,
            htmlBody: `<h2>${notification.title}</h2><p>${notification.body}</p><br/><p>CareNest Elderly Care Platform</p>`,
            textBody: `${notification.title}\n\n${notification.body}`,
          });
          isSuccess = res.isSuccessful;
          providerName = res.provider;
          providerMsgId = res.emailId;
          errorMessage = res.errorMessage;
        }
      } else if (notification.channel === "TELEPHONE_CALL") {
        if (notification.referenceId) {
          const res = await TelephonyService.initiateMedicationReminderCall(
            notification.patientId,
            notification.referenceId
          );
          if ("skipped" in res) {
            isSuccess = false;
            providerName = "TWILIO_VOICE";
            providerMsgId = res.callSid;
            errorMessage = res.reason;
          } else {
            isSuccess = Boolean(res.isSuccessful);
            providerName = "TWILIO_VOICE";
            providerMsgId = res.callSid;
            errorMessage = res.errorMessage;
          }
        }
      }

      // Update notification and create attempt record
      await prisma.notification.update({
        where: { id: notificationId },
        data: {
          status: isSuccess ? "DELIVERED" : "FAILED",
          sentAtUtc: isSuccess ? new Date() : null,
        },
      });

      await prisma.notificationAttempt.create({
        data: {
          notificationId,
          channel: notification.channel,
          provider: providerName,
          providerMessageId: providerMsgId || null,
          attemptNumber: 1,
          isSuccessful: isSuccess,
          errorMessage: errorMessage || null,
        },
      });

      return { isSuccess, providerName, providerMsgId };
    } catch (err: any) {
      await prisma.notification.update({
        where: { id: notificationId },
        data: { status: "FAILED" },
      });

      await prisma.notificationAttempt.create({
        data: {
          notificationId,
          channel: notification.channel,
          provider: providerName,
          attemptNumber: 1,
          isSuccessful: false,
          errorMessage: err.message,
        },
      });

      return { isSuccess: false, errorMessage: err.message };
    }
  }

  /**
   * Cancels and purges any queued reminder notifications for a dose when confirmed or skipped.
   */
  static async cancelPendingNotificationsForDose(doseId: string) {
    return prisma.notification.updateMany({
      where: {
        referenceId: doseId,
        status: "QUEUED",
      },
      data: { status: "CANCELLED" },
    });
  }

  /**
   * Cancels and purges pending appointment reminder notifications when an appointment is cancelled or updated.
   */
  static async cancelPendingNotificationsForAppointment(appointmentId: string) {
    return prisma.notification.updateMany({
      where: {
        referenceId: appointmentId,
        status: "QUEUED",
      },
      data: { status: "CANCELLED" },
    });
  }
}
