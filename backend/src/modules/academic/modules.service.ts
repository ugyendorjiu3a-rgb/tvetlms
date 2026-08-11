import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { CreateModuleDto, EnrollTraineeDto, AssignTrainerDto } from './dto/module.dto';

// "Module details" per PRD §5.2 (FR5) and database-design.md `modules` table.
@Injectable()
export class ModulesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  findAll(tradeId?: string) {
    return this.prisma.module.findMany({
      where: tradeId ? { tradeId } : undefined,
      include: { trade: true, moduleTutor: true },
      orderBy: { startDate: 'desc' },
    });
  }

  findOne(id: string) {
    return this.prisma.module.findUniqueOrThrow({
      where: { id },
      include: { trade: true, moduleTutor: true, moduleTrainees: true, moduleTrainers: true },
    });
  }

  async create(dto: CreateModuleDto, actor: AuthenticatedUser) {
    const module = await this.prisma.module.create({
      data: {
        code: dto.code,
        nameEn: dto.nameEn,
        nameDz: dto.nameDz,
        ncsCode: dto.ncsCode,
        tradeId: dto.tradeId,
        durationWeeks: dto.durationWeeks,
        learningOutcome: dto.learningOutcome,
        startDate: new Date(dto.startDate),
        endDate: new Date(dto.endDate),
        moduleTutorId: dto.moduleTutorId,
        createdBy: actor.userId,
        updatedBy: actor.userId,
      },
    });

    if (dto.moduleTutorId) {
      await this.prisma.moduleTrainer.create({
        data: { moduleId: module.id, trainerId: dto.moduleTutorId, roleLabel: 'tutor' },
      });
    }

    await this.audit.log({
      actorId: actor.userId,
      action: 'module.create',
      entityType: 'module',
      entityId: module.id,
      afterValue: module,
    });

    return module;
  }

  async enrollTrainee(moduleId: string, dto: EnrollTraineeDto, actor: AuthenticatedUser) {
    const enrollment = await this.prisma.moduleTrainee.create({
      data: { moduleId, traineeId: dto.traineeId },
    });
    await this.audit.log({
      actorId: actor.userId,
      action: 'module_trainee.enroll',
      entityType: 'module',
      entityId: moduleId,
      afterValue: enrollment,
    });
    return enrollment;
  }

  async assignTrainer(moduleId: string, dto: AssignTrainerDto, actor: AuthenticatedUser) {
    const assignment = await this.prisma.moduleTrainer.create({
      data: { moduleId, trainerId: dto.trainerId, roleLabel: dto.roleLabel ?? 'assistant' },
    });
    await this.audit.log({
      actorId: actor.userId,
      action: 'module_trainer.assign',
      entityType: 'module',
      entityId: moduleId,
      afterValue: assignment,
    });
    return assignment;
  }

  // Used by Submissions/Grading/Results modules to check "is this trainer actually assigned to
  // this module" before allowing a grade write (edit-accessibility matrix, PRD §5.1).
  async isTrainerOnModule(moduleId: string, trainerId: string): Promise<boolean> {
    const module = await this.prisma.module.findUnique({
      where: { id: moduleId },
      select: { moduleTutorId: true },
    });
    if (module?.moduleTutorId === trainerId) return true;
    const link = await this.prisma.moduleTrainer.findUnique({
      where: { moduleId_trainerId: { moduleId, trainerId } },
    });
    return !!link;
  }
}
