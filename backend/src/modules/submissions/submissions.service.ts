import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { NotificationsService } from '../notifications/notifications.service';
import { AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { decodeStringArray } from '../../common/utils/json-array.util';
import { CreateCommentDto, CreateSubmissionDto } from './dto/submission.dto';

// Implements the Trainee Submission Journey (ui-ux-flow.md §5.1) and the Upload step of the
// upload→certification data flow in architecture.md. This is the module most exercised by the
// offline-first design: everything here must accept a client-generated id and sync-status fields
// gracefully, because the request may arrive hours after the trainee actually tapped "submit".
@Injectable()
export class SubmissionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly notifications: NotificationsService,
  ) {}

  async submit(dto: CreateSubmissionDto, actor: AuthenticatedUser) {
    if (!actor.traineeId) {
      throw new ForbiddenException('Only trainees can submit assignments');
    }

    const assignment = await this.prisma.assignment.findUnique({
      where: { id: dto.assignmentId },
      include: { assessment: { include: { module: true } } },
    });
    if (!assignment) {
      throw new NotFoundException('Assignment not found');
    }

    const allowedFileTypes = decodeStringArray(assignment.allowedFileTypes);
    for (const file of dto.files) {
      const ext = file.filename.split('.').pop()?.toLowerCase();
      if (allowedFileTypes.length > 0 && (!ext || !allowedFileTypes.includes(ext))) {
        throw new BadRequestException(
          `File type '.${ext ?? ''}' is not allowed for this assignment. Allowed types: ${allowedFileTypes.join(', ')}`,
        );
      }
    }

    const submittedAt = dto.submittedAtClient ? new Date(dto.submittedAtClient) : new Date();
    const isLate = submittedAt > assignment.dueDate;

    // Upsert on (assignmentId, traineeId): a resubmission updates the existing row rather than
    // creating a second one, so grading/audit history stays attached to one identity
    // (database-design.md §6).
    const submission = await this.prisma.submission.upsert({
      where: { assignmentId_traineeId: { assignmentId: dto.assignmentId, traineeId: actor.traineeId } },
      create: {
        id: dto.id,
        assignmentId: dto.assignmentId,
        traineeId: actor.traineeId,
        submittedAt,
        status: isLate ? 'late' : 'submitted',
        originDeviceId: dto.originDeviceId,
        syncStatus: dto.syncStatus ?? 'synced',
        syncedAt: dto.syncStatus === 'synced' || !dto.syncStatus ? new Date() : undefined,
        files: { create: dto.files },
      },
      update: {
        submittedAt,
        status: isLate ? 'late' : 'submitted',
        syncStatus: dto.syncStatus ?? 'synced',
        syncedAt: dto.syncStatus === 'synced' || !dto.syncStatus ? new Date() : undefined,
        updatedBy: actor.userId,
        version: { increment: 1 },
        files: { create: dto.files }, // resubmission adds files; historical files are kept, not deleted
      },
      include: { files: true },
    });

    await this.audit.log({
      actorId: actor.userId,
      action: 'submission.submit',
      entityType: 'submission',
      entityId: submission.id,
      afterValue: submission,
    });

    const trainerIds = await this.moduleTrainerIds(assignment.assessment.moduleId);
    if (trainerIds.length > 0) {
      await this.notifications.create({
        type: 'grading_complete', // reuse channel semantics: this is the "new submission" trainer-facing event
        title: `New submission: ${assignment.title}`,
        body: isLate ? 'Submitted after the deadline (marked late).' : 'Submitted on time.',
        relatedEntityType: 'submission',
        relatedEntityId: submission.id,
        recipientUserIds: trainerIds,
      });
    }

    return submission;
  }

  async findOne(id: string, actor: AuthenticatedUser) {
    const submission = await this.prisma.submission.findUniqueOrThrow({
      where: { id },
      include: { files: true, grade: { include: { autoGradeLog: true } }, comments: true, assignment: true },
    });
    await this.assertCanView(submission, actor);
    return withDecodedAssignment(submission);
  }

  async findForTrainee(traineeId: string) {
    const submissions = await this.prisma.submission.findMany({
      where: { traineeId },
      include: { files: true, grade: true, assignment: true },
      orderBy: { createdAt: 'desc' },
    });
    return submissions.map(withDecodedAssignment);
  }

  // Trainer grading queue (ui-ux-flow.md §2.4) — flat list across all of this trainer's modules.
  async findQueueForTrainer(trainerId: string, status?: string) {
    const submissions = await this.prisma.submission.findMany({
      where: {
        status: status ? status : { in: ['submitted', 'late'] },
        assignment: { assessment: { module: { moduleTrainers: { some: { trainerId } } } } },
      },
      include: { files: true, grade: true, assignment: true, trainee: true },
      orderBy: { submittedAt: 'asc' },
    });
    return submissions.map(withDecodedAssignment);
  }

  async addComment(submissionId: string, dto: CreateCommentDto, actor: AuthenticatedUser) {
    if (!dto.commentText && !dto.voiceNoteUrl) {
      throw new BadRequestException('A comment must include text or a voice note');
    }

    const submission = await this.prisma.submission.findUniqueOrThrow({
      where: { id: submissionId },
      include: { assignment: { include: { assessment: true } } },
    });
    await this.assertCanView(submission, actor);

    const comment = await this.prisma.feedbackComment.create({
      data: {
        submissionId,
        parentCommentId: dto.parentCommentId,
        authorId: actor.userId,
        commentText: dto.commentText,
        voiceNoteUrl: dto.voiceNoteUrl,
        originDeviceId: dto.originDeviceId,
        syncStatus: dto.originDeviceId ? 'pending_sync' : 'synced',
      },
    });

    // Notify the "other side" of the conversation — trainee <-> trainer.
    const isAuthorTrainee = actor.traineeId === submission.traineeId;
    const recipientIds = isAuthorTrainee
      ? await this.moduleTrainerIds(submission.assignment.assessment.moduleId)
      : [submission.traineeId];

    if (recipientIds.length > 0) {
      await this.notifications.create({
        type: 'grading_complete',
        title: 'New feedback on a submission',
        relatedEntityType: 'submission',
        relatedEntityId: submissionId,
        recipientUserIds: recipientIds,
        createdBy: actor.userId,
      });
    }

    return comment;
  }

  private async assertCanView(
    submission: { traineeId: string; assignmentId: string },
    actor: AuthenticatedUser,
  ): Promise<void> {
    if (actor.traineeId === submission.traineeId) return;
    if (actor.roles.includes('admin') || actor.roles.includes('exam_controller')) return;

    if (actor.trainerId) {
      const assignment = await this.prisma.assignment.findUniqueOrThrow({
        where: { id: submission.assignmentId },
        include: { assessment: true },
      });
      const trainerIds = await this.moduleTrainerIds(assignment.assessment.moduleId);
      if (trainerIds.includes(actor.trainerId)) return;
    }

    throw new ForbiddenException('You do not have access to this submission');
  }

  private async moduleTrainerIds(moduleId: string): Promise<string[]> {
    const module = await this.prisma.module.findUnique({
      where: { id: moduleId },
      include: { moduleTrainers: true },
    });
    if (!module) return [];
    const ids = new Set(module.moduleTrainers.map((mt) => mt.trainerId));
    if (module.moduleTutorId) ids.add(module.moduleTutorId);
    return [...ids];
  }
}

// `assignment.allowedFileTypes` is a JSON-encoded string in local SQLite dev mode (see
// schema.prisma header note) — decode it back to a plain string[] wherever a submission's nested
// assignment is returned to the client, so the API shape stays stable regardless of storage
// format. Deliberately loosely typed (`any` in, `any` out): this is a one-field passthrough
// transform applied to several differently-shaped Prisma query results, and the caller-side
// return types (inferred from the async methods above) are what actually matters to consumers.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function withDecodedAssignment(submission: any): any {
  if (!submission?.assignment) return submission;
  return {
    ...submission,
    assignment: { ...submission.assignment, allowedFileTypes: decodeStringArray(submission.assignment.allowedFileTypes) },
  };
}
