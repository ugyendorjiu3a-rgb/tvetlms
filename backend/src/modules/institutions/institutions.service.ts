import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { CreateInstitutionDto } from './dto/create-institution.dto';

// Institutions map 1:1 to an Institution Edge Node deployment (architecture.md §1) — this table
// is the Central Cloud's registry of which campuses exist, not a per-request concern.
@Injectable()
export class InstitutionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  findAll() {
    return this.prisma.institution.findMany({ where: { isActive: true }, orderBy: { name: 'asc' } });
  }

  findOne(id: string) {
    return this.prisma.institution.findUniqueOrThrow({ where: { id } });
  }

  async create(dto: CreateInstitutionDto, actor: AuthenticatedUser) {
    const institution = await this.prisma.institution.create({
      data: { ...dto, createdBy: actor.userId, updatedBy: actor.userId },
    });
    await this.audit.log({
      actorId: actor.userId,
      action: 'institution.create',
      entityType: 'institution',
      entityId: institution.id,
      afterValue: institution,
    });
    return institution;
  }
}
