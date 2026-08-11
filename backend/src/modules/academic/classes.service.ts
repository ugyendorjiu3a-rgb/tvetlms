import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { CreateClassDto, EnrollClassDto } from './dto/class.dto';

@Injectable()
export class ClassesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  findAll(institutionId?: string) {
    return this.prisma.class.findMany({
      where: institutionId ? { institutionId } : undefined,
      include: { trade: true },
      orderBy: { startDate: 'desc' },
    });
  }

  findOne(id: string) {
    return this.prisma.class.findUniqueOrThrow({
      where: { id },
      include: { trade: true, enrollments: { include: { trainee: true } } },
    });
  }

  async create(dto: CreateClassDto, actor: AuthenticatedUser) {
    const klass = await this.prisma.class.create({
      data: {
        institutionId: dto.institutionId,
        tradeId: dto.tradeId,
        name: dto.name,
        intakeYear: dto.intakeYear,
        startDate: new Date(dto.startDate),
        endDate: dto.endDate ? new Date(dto.endDate) : undefined,
        createdBy: actor.userId,
        updatedBy: actor.userId,
      },
    });
    await this.audit.log({
      actorId: actor.userId,
      action: 'class.create',
      entityType: 'class',
      entityId: klass.id,
      afterValue: klass,
    });
    return klass;
  }

  async enroll(classId: string, dto: EnrollClassDto, actor: AuthenticatedUser) {
    const enrollment = await this.prisma.classEnrollment.create({
      data: { classId, traineeId: dto.traineeId },
    });
    await this.audit.log({
      actorId: actor.userId,
      action: 'class_enrollment.create',
      entityType: 'class',
      entityId: classId,
      afterValue: enrollment,
    });
    return enrollment;
  }
}
