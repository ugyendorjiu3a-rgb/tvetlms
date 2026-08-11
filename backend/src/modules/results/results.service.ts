import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { NotificationsService } from '../notifications/notifications.service';
import { AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { applyCertificationScale } from './certification-scale';

const GRADED_STATUSES = ['auto_graded', 'manually_graded', 'reviewed'];

// Implements the Certification step of the upload→certification data flow (architecture.md) and
// the Exam Controller Result Management Journey (ui-ux-flow.md §5.3).
@Injectable()
export class ResultsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly notifications: NotificationsService,
  ) {}

  // Computes (or recomputes) a trainee's result for a module from all currently graded
  // assessments. Left as an explicit action (not a DB trigger) so a Trainer/Admin controls
  // exactly when a result is (re)calculated, e.g. after the last outstanding grade lands.
  //
  // Weighting assumption (flagged for Ministry confirmation, same as PRD's other open questions):
  // each assessment's earned percentage is the sum of its assignments' grades over
  // assessment.maxScore; the module total is the weighted average of assessment percentages using
  // assessment.weightPercent, falling back to equal weighting if weights aren't set.
  async computeForTrainee(traineeId: string, moduleId: string, actor: AuthenticatedUser) {
    const assessments = await this.prisma.assessment.findMany({
      where: { moduleId, status: 'approved' },
      include: { assignments: { include: { submissions: { where: { traineeId }, include: { grade: true } } } } },
    });

    if (assessments.length === 0) {
      throw new BadRequestException('No approved assessments exist for this module yet');
    }

    let weightedSum = 0;
    let weightTotal = 0;
    const equalWeight = 100 / assessments.length;

    for (const assessment of assessments) {
      let earned = 0;
      let hasGrade = false;
      for (const assignment of assessment.assignments) {
        const submission = assignment.submissions[0];
        if (!submission?.grade || !GRADED_STATUSES.includes(submission.grade.gradingStatus)) {
          throw new BadRequestException(
            `Not all assignments in module have been graded yet (pending: '${assignment.title}')`,
          );
        }
        // Local SQLite dev mode stores these as Float, so they're already plain JS numbers here
        // (see schema.prisma header note — Postgres mode uses Prisma.Decimal and needs .toNumber()).
        earned += submission.grade.score;
        hasGrade = true;
      }
      if (!hasGrade) continue;

      const percentage = (earned / assessment.maxScore) * 100;
      const weight = assessment.weightPercent ? assessment.weightPercent : equalWeight;
      weightedSum += percentage * weight;
      weightTotal += weight;
    }

    const totalScore = weightTotal > 0 ? Math.round((weightedSum / weightTotal) * 100) / 100 : 0;
    const band = applyCertificationScale(totalScore);

    const result = await this.prisma.result.upsert({
      where: { traineeId_moduleId: { traineeId, moduleId } },
      create: {
        traineeId,
        moduleId,
        totalScore,
        mark: band.mark,
        gpa: band.gpa,
        performanceDescription: band.performanceDescription,
        outcome: band.outcome,
        status: 'pending_approval',
      },
      update: {
        totalScore,
        mark: band.mark,
        gpa: band.gpa,
        performanceDescription: band.performanceDescription,
        outcome: band.outcome,
        status: 'pending_approval', // recomputing always resets to pending — a changed score must be re-approved
        version: { increment: 1 },
      },
    });

    await this.audit.log({
      actorId: actor.userId,
      action: 'result.compute',
      entityType: 'result',
      entityId: result.id,
      afterValue: result,
    });

    return result;
  }

  // NOTE: `modules` has no direct institutionId (a module is defined at trade level, not
  // per-institution, in the current schema) — filtering this queue by institution would require
  // joining through class_enrollments/module_trainees. Left global for now; revisit if the
  // Ministry confirms modules should be institution-scoped.
  findPendingApproval() {
    return this.prisma.result.findMany({
      where: { status: 'pending_approval' },
      include: { trainee: true, module: true },
      orderBy: { computedAt: 'asc' },
    });
  }

  findForTrainee(traineeId: string) {
    return this.prisma.result.findMany({
      where: { traineeId },
      include: { module: true, certificate: true },
      orderBy: { computedAt: 'desc' },
    });
  }

  // Exam Controller approval — blocked if any underlying grade has an unresolved sync conflict
  // (ui-ux-flow.md §3.7: "Resolve the grading conflict on this submission before approving
  // certification"), and never auto-finalized offline (architecture.md §7).
  async approve(resultId: string, actor: AuthenticatedUser) {
    const result = await this.prisma.result.findUniqueOrThrow({
      where: { id: resultId },
      include: { module: { include: { assessments: { include: { assignments: true } } } } },
    });

    const assignmentIds = result.module.assessments
      .flatMap((a) => a.assignments)
      .map((assignment) => assignment.id);

    const gradesForModule = await this.prisma.grade.findMany({
      where: { submission: { assignmentId: { in: assignmentIds }, traineeId: result.traineeId } },
    });

    const openConflict = await this.prisma.syncConflict.findFirst({
      where: { entityType: 'grade', entityId: { in: gradesForModule.map((g) => g.id) }, status: 'open' },
    });
    if (openConflict) {
      throw new ConflictException(
        'This result has an unresolved grading conflict — resolve it in the Sync Conflict Queue before approving.',
      );
    }

    const updated = await this.prisma.result.update({
      where: { id: resultId },
      data: { status: 'approved', approvedBy: actor.userId, approvedAt: new Date(), version: { increment: 1 } },
    });

    if (updated.outcome === 'certified') {
      await this.issueCertificate(updated.id, actor);
    }

    await this.audit.log({
      actorId: actor.userId,
      action: 'result.approve',
      entityType: 'result',
      entityId: resultId,
      beforeValue: result,
      afterValue: updated,
    });

    await this.notifications.create({
      type: 'result_declaration',
      title: `Result declared for ${result.module.nameEn}`,
      body: `Mark: ${updated.mark} (${updated.performanceDescription})`,
      relatedEntityType: 'result',
      relatedEntityId: resultId,
      recipientUserIds: [result.traineeId],
      createdBy: actor.userId,
    });

    return updated;
  }

  async dispute(resultId: string, reason: string, actor: AuthenticatedUser) {
    const result = await this.prisma.result.findUniqueOrThrow({ where: { id: resultId } });
    const updated = await this.prisma.result.update({
      where: { id: resultId },
      data: { status: 'disputed', version: { increment: 1 } },
    });
    await this.audit.log({
      actorId: actor.userId,
      action: 'result.dispute',
      entityType: 'result',
      entityId: resultId,
      beforeValue: result,
      afterValue: { ...updated, reason },
    });
    return updated;
  }

  private async issueCertificate(resultId: string, actor: AuthenticatedUser) {
    const certificateNumber = `TVET-${new Date().getFullYear()}-${resultId.slice(0, 8).toUpperCase()}`;
    return this.prisma.certificate.upsert({
      where: { resultId },
      create: { resultId, certificateNumber, status: 'approved', issuedBy: actor.userId, issuedAt: new Date() },
      update: { status: 'approved', issuedBy: actor.userId, issuedAt: new Date(), version: { increment: 1 } },
    });
  }
}
