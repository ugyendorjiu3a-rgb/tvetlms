import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { CreateTradeDto } from './dto/create-trade.dto';

// Trades are bilingual by design (name_en/name_dz — database-design.md "Design conventions"),
// used across trainee_profiles, modules, and classes.
@Injectable()
export class TradesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  findAll() {
    return this.prisma.trade.findMany({ where: { isActive: true }, orderBy: { nameEn: 'asc' } });
  }

  findOne(id: string) {
    return this.prisma.trade.findUniqueOrThrow({ where: { id } });
  }

  async create(dto: CreateTradeDto, actor: AuthenticatedUser) {
    const trade = await this.prisma.trade.create({
      data: { ...dto, createdBy: actor.userId, updatedBy: actor.userId },
    });
    await this.audit.log({
      actorId: actor.userId,
      action: 'trade.create',
      entityType: 'trade',
      entityId: trade.id,
      afterValue: trade,
    });
    return trade;
  }
}
