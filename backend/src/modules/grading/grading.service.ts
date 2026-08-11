import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { NotificationsService } from '../notifications/notifications.service';
import { AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { toJsonSafe } from '../../common/utils/json.util';
import { AutoGradeDto, ManualGradeDto, ReviewGradeDto } from './dto/grade.dto';

// Implements the Grading step of the upload→certification data flow (architecture.md) and the
// Trainer Grading Journey (ui-ux-flow.md §5.2). The conflict-detection logic here is the concrete
// implementation of the "high-stakes data never auto-merges" rule from architecture.md §7 /
// database-design.md §8.
@Injectable()
export class GradingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly notifications: NotificationsService,
  ) {}

  // MCQ auto-grading — deterministic, rule-based scoring against a known answer key, not a
  // generative-AI judgment call, so it's implemented directly here rather than routed through an
  // AI Gateway (architecture.md §9).
  async autoGrade(submissionId: string, dto: AutoGradeDto, actor: AuthenticatedUser) {
    const submission = await this.getSubmissionForGrading(submissionId, actor);

    const autoGradeLog = await this.prisma.autoGradeLog.create({
      data: { submissionId, engineVersion: dto.engineVersion, rawResult: dto.rawResult },
    });

    const grade = await this.prisma.grade.upsert({
      where: { submissionId },
      create: {
        submissionId,
        score: dto.score,
        isAutoGraded: true,
        autoGradeLogId: autoGradeLog.id,
        gradingStatus: 'auto_graded',
        gradedAt: new Date(),
      },
      update: {
        score: dto.score,
        isAutoGraded: true,
        autoGradeLogId: autoGradeLog.id,
        gradingStatus: 'auto_graded',
        gradedAt: new Date(),
        version: { increment: 1 },
      },
    });

    await this.audit.log({
      actorId: actor.userId,
      action: 'grade.auto_grade',
      entityType: 'grade',
      entityId: grade.id,
      afterValue: grade,
    });

    return grade;
  }

  // Manual/override grading by the assigned Trainer. Returns 409 with conflict details (instead
  // of silently overwriting) if `expectedVersion` doesn't match the current record — this is what
  // the ui-ux-flow.md §2.7 "Conflict card" surfaces to the Trainer.
  async manualGrade(submissionId: string, dto: ManualGradeDto, actor: AuthenticatedUser) {
    const submission = await this.getSubmissionForGrading(submissionId, actor);
    const existing = await this.prisma.grade.findUnique({ where: { submissionId } });

    if (existing && dto.expectedVersion !== undefined && existing.version !== dto.expectedVersion) {
      const conflictQueueEntry = await this.prisma.syncQueueItem.create({
        data: {
          deviceId: dto.originDeviceId ?? (await this.fallbackDeviceId(actor.userId)),
          entityType: 'grade',
          entityId: existing.id,
          operation: 'update',
          payload: { score: dto.score, expectedVersion: dto.expectedVersion },
          clientVersion: dto.expectedVersion,
          status: 'conflict',
          createdAtClient: new Date(),
        },
      });
      const conflict = await this.prisma.syncConflict.create({
        data: {
          syncQueueId: conflictQueueEntry.id,
          entityType: 'grade',
          entityId: existing.id,
          serverVersionSnapshot: toJsonSafe(existing),
          clientVersionSnapshot: toJsonSafe({ score: dto.score, version: dto.expectedVersion }),
        },
      });
      throw new ConflictException({
        message: 'This grade was changed elsewhere since you last saw it. Resolve the conflict before proceeding.',
        conflictId: conflict.id,
      });
    }

    const grade = await this.prisma.grade.upsert({
      where: { submissionId },
      create: {
        submissionId,
        graderId: actor.userId,
        score: dto.score,
        isAutoGraded: false,
        gradingStatus: 'manually_graded',
        gradedAt: new Date(),
        originDeviceId: dto.originDeviceId,
        syncStatus: dto.originDeviceId ? 'pending_sync' : 'synced',
        syncedAt: dto.originDeviceId ? undefined : new Date(),
      },
      update: {
        graderId: actor.userId,
        score: dto.score,
        isAutoGraded: false,
        gradingStatus: 'manually_graded',
        gradedAt: new Date(),
        originDeviceId: dto.originDeviceId,
        syncStatus: dto.originDeviceId ? 'pending_sync' : 'synced',
        syncedAt: dto.originDeviceId ? undefined : new Date(),
        version: { increment: 1 },
      },
    });

    await this.prisma.submission.update({ where: { id: submissionId }, data: { status: 'graded' } });

    await this.audit.log({
      actorId: actor.userId,
      action: 'grade.manual_grade',
      entityType: 'grade',
      entityId: grade.id,
      beforeValue: existing,
      afterValue: grade,
    });

    await this.notifications.create({
      type: 'grading_complete',
      title: 'Your submission has been graded',
      relatedEntityType: 'submission',
      relatedEntityId: submissionId,
      recipientUserIds: [submission.traineeId],
      createdBy: actor.userId,
    });

    return grade;
  }

  // Exam Controller marks a grade 'reviewed' (routine oversight) or 'disputed' (kicks it back).
  async review(submissionId: string, dto: ReviewGradeDto, actor: AuthenticatedUser) {
    const grade = await this.prisma.grade.findUniqueOrThrow({ where: { submissionId } });
    const updated = await this.prisma.grade.update({
      where: { submissionId },
      data: { gradingStatus: dto.gradingStatus, version: { increment: 1 } },
    });

    await this.audit.log({
      actorId: actor.userId,
      action: `grade.${dto.gradingStatus}`,
      entityType: 'grade',
      entityId: grade.id,
      beforeValue: grade,
      afterValue: { ...updated, notes: dto.notes },
    });

    return updated;
  }

  private async getSubmissionForGrading(submissionId: string, actor: AuthenticatedUser) {
    const submission = await this.prisma.submission.findUnique({
      where: { id: submissionId },
      include: { assignment: { include: { assessment: true } } },
    });
    if (!submission) throw new NotFoundException('Submission not found');

    if (actor.roles.includes('admin') || actor.roles.includes('exam_controller')) return submission;

    if (!actor.trainerId) {
      throw new ForbiddenException('Only an assigned trainer can grade this submission');
    }
    const module = await this.prisma.module.findUnique({
      where: { id: submission.assignment.assessment.moduleId },
      include: { moduleTrainers: true },
    });
    const isAssigned =
      module?.moduleTutorId === actor.trainerId ||
      module?.moduleTrainers.some((mt) => mt.trainerId === actor.trainerId);
    if (!isAssigned) {
      throw new ForbiddenException('You are not assigned to this submission\'s module');
    }
    return submission;
  }

  private async fallbackDeviceId(userId: string): Promise<string> {
    const device = await this.prisma.device.findFirst({ where: { userId } });
    if (device) return device.id;
    const created = await this.prisma.device.create({
      data: { userId, deviceType: 'web', installId: `implicit-${userId}` },
    });
    return created.id;
  }
}
