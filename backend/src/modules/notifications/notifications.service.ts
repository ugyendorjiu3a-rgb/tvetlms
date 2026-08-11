import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

export type NotificationType =
  | 'submission_deadline'
  | 'grading_complete'
  | 'new_resource'
  | 'result_declaration'
  | 'assessment_schedule'
  | 'general';

export interface CreateNotificationInput {
  type: NotificationType;
  title: string;
  body?: string;
  relatedEntityType?: string;
  relatedEntityId?: string;
  institutionId?: string | null; // null = Ministry-wide broadcast
  priority?: 'normal' | 'high' | 'critical';
  channelHint?: 'in_app' | 'push' | 'sms';
  createdBy?: string;
  recipientUserIds: string[]; // fan-out list — PRD §15 / database-design.md notification_recipients
}

// Implements PRD §15 notification types and the notification_recipients fan-out from
// database-design.md §3. In-app is the primary, offline-durable channel (ui-ux-flow.md §0.2);
// push/SMS dispatch are out of scope for this pass — channelHint is recorded so a delivery worker
// can pick it up later without a schema change.
@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(input: CreateNotificationInput) {
    return this.prisma.notification.create({
      data: {
        type: input.type,
        title: input.title,
        body: input.body,
        relatedEntityType: input.relatedEntityType,
        relatedEntityId: input.relatedEntityId,
        institutionId: input.institutionId ?? null,
        priority: input.priority ?? 'normal',
        channelHint: input.channelHint ?? 'in_app',
        createdBy: input.createdBy,
        recipients: {
          create: input.recipientUserIds.map((userId) => ({ userId })),
        },
      },
      include: { recipients: true },
    });
  }

  async listForUser(userId: string, unreadOnly = false) {
    return this.prisma.notificationRecipient.findMany({
      where: {
        userId,
        ...(unreadOnly ? { readAt: null } : {}),
      },
      include: { notification: true },
      orderBy: { notification: { createdAt: 'desc' } },
    });
  }

  async markRead(userId: string, notificationId: string) {
    return this.prisma.notificationRecipient.update({
      where: { notificationId_userId: { notificationId, userId } },
      data: { readAt: new Date() },
    });
  }
}
