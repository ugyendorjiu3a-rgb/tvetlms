import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { Assignment } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { NotificationsService } from '../notifications/notifications.service';
import { AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { decodeStringArray, encodeStringArray } from '../../common/utils/json-array.util';
import { ModulesService } from './modules.service';
import { CreateAssessmentDto, CreateAssignmentDto } from './dto/assessment.dto';

// allowedFileTypes is stored as a JSON string in local SQLite dev mode (see schema.prisma header
// note) — this maps it back to a plain string[] so the HTTP API shape never leaks that detail.
function toApiAssignment<T extends Assignment>(assignment: T) {
  return { ...assignment, allowedFileTypes: decodeStringArray(assignment.allowedFileTypes) };
}

// Implements the Trainer-proposes / Exam-Controller-approves assessment schedule flow from
// architecture.md §1 and ui-ux-flow.md §3.4 ("Assessment Schedule Review").
@Injectable()
export class AssessmentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly notifications: NotificationsService,
    private readonly modules: ModulesService,
  ) {}

  findAll(moduleId?: string) {
    return this.prisma.assessment.findMany({
      where: moduleId ? { moduleId } : undefined,
      include: { module: true },
      orderBy: { scheduledDate: 'asc' },
    });
  }

  async findOne(id: string) {
    const assessment = await this.prisma.assessment.findUniqueOrThrow({
      where: { id },
      include: { assignments: true },
    });
    return { ...assessment, assignments: assessment.assignments.map(toApiAssignment) };
  }

  async create(dto: CreateAssessmentDto, actor: AuthenticatedUser) {
    if (actor.trainerId && !(await this.modules.isTrainerOnModule(dto.moduleId, actor.trainerId))) {
      throw new ForbiddenException('You are not assigned to this module');
    }

    const assessment = await this.prisma.assessment.create({
      data: {
        moduleId: dto.moduleId,
        tier: dto.tier,
        subtype: dto.subtype,
        title: dto.title,
        maxScore: dto.maxScore,
        weightPercent: dto.weightPercent,
        scheduledDate: dto.scheduledDate ? new Date(dto.scheduledDate) : undefined,
        status: 'scheduled', // awaiting Exam Controller approval
        createdBy: actor.userId,
      },
    });

    await this.audit.log({
      actorId: actor.userId,
      action: 'assessment.create',
      entityType: 'assessment',
      entityId: assessment.id,
      afterValue: assessment,
    });

    return assessment;
  }

  // Exam Controller approves/rejects before the assessment goes live to trainees
  // (ui-ux-flow.md §3.4, architecture.md certification-approval principle).
  async approve(assessmentId: string, actor: AuthenticatedUser) {
    const assessment = await this.prisma.assessment.findUniqueOrThrow({ where: { id: assessmentId } });
    if (assessment.status === 'approved') {
      throw new BadRequestException('Already approved');
    }

    const updated = await this.prisma.assessment.update({
      where: { id: assessmentId },
      data: { status: 'approved', approvedBy: actor.userId, approvedAt: new Date(), version: { increment: 1 } },
    });

    await this.audit.log({
      actorId: actor.userId,
      action: 'assessment.approve',
      entityType: 'assessment',
      entityId: assessmentId,
      beforeValue: assessment,
      afterValue: updated,
    });

    await this.notifications.create({
      type: 'assessment_schedule',
      title: `Assessment approved: ${updated.title}`,
      body: 'Your proposed assessment has been approved and is now visible to trainees.',
      relatedEntityType: 'assessment',
      relatedEntityId: assessmentId,
      recipientUserIds: [assessment.createdBy],
      createdBy: actor.userId,
    });

    return updated;
  }

  async createAssignment(dto: CreateAssignmentDto, actor: AuthenticatedUser) {
    const assessment = await this.prisma.assessment.findUniqueOrThrow({ where: { id: dto.assessmentId } });

    if (assessment.status !== 'approved') {
      throw new BadRequestException(
        'This assessment has not been approved by the Exam Controller yet — assignments cannot be created under it.',
      );
    }

    const assignment = await this.prisma.assignment.create({
      data: {
        assessmentId: dto.assessmentId,
        title: dto.title,
        description: dto.description,
        allowedFileTypes: encodeStringArray(dto.allowedFileTypes),
        dueDate: new Date(dto.dueDate),
        createdBy: actor.userId,
      },
    });

    await this.audit.log({
      actorId: actor.userId,
      action: 'assignment.create',
      entityType: 'assignment',
      entityId: assignment.id,
      afterValue: assignment,
    });

    // Notify enrolled trainees a new assignment is available (PRD §15).
    const trainees = await this.prisma.moduleTrainee.findMany({
      where: { moduleId: assessment.moduleId, status: 'active' },
      select: { traineeId: true },
    });
    if (trainees.length > 0) {
      await this.notifications.create({
        type: 'assessment_schedule',
        title: `New assignment: ${assignment.title}`,
        body: `Due ${assignment.dueDate.toISOString().slice(0, 10)}`,
        relatedEntityType: 'assignment',
        relatedEntityId: assignment.id,
        recipientUserIds: trainees.map((t) => t.traineeId),
        createdBy: actor.userId,
      });
    }

    return toApiAssignment(assignment);
  }

  async findAssignment(id: string) {
    const assignment = await this.prisma.assignment.findUniqueOrThrow({ where: { id }, include: { assessment: true } });
    return toApiAssignment(assignment);
  }
}
