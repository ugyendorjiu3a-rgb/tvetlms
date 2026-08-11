import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { RegisterDeviceDto, ResolveConflictDto } from './dto/sync.dto';

// Scope note: the dedicated feature endpoints (submissions.submit, grading.manualGrade, etc.) ARE
// the sync ingestion points — they already accept a client-generated id, originDeviceId, and (for
// grades) an expectedVersion for optimistic-concurrency conflict detection, per architecture.md §7
// and database-design.md §8. This module intentionally does NOT duplicate that with a second,
// generic "queue and replay" endpoint — that would just be two code paths applying the same
// mutations. What lives here instead: device registration, and resolving the conflicts those
// endpoints raise (currently: grade conflicts, the one high-stakes case implemented so far).
@Injectable()
export class SyncService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async registerDevice(dto: RegisterDeviceDto, actor: AuthenticatedUser) {
    return this.prisma.device.upsert({
      where: { installId: dto.installId },
      create: { userId: actor.userId, deviceType: dto.deviceType, installId: dto.installId },
      update: { lastSyncedAt: new Date() },
    });
  }

  listOpenConflicts() {
    return this.prisma.syncConflict.findMany({
      where: { status: 'open' },
      orderBy: { createdAt: 'asc' },
    });
  }

  async resolveConflict(conflictId: string, dto: ResolveConflictDto, actor: AuthenticatedUser) {
    const conflict = await this.prisma.syncConflict.findUnique({ where: { id: conflictId } });
    if (!conflict) throw new NotFoundException('Conflict not found');
    if (conflict.status !== 'open') throw new BadRequestException('Conflict already resolved');

    if (conflict.entityType !== 'grade') {
      throw new BadRequestException(
        `Resolving conflicts for entity type '${conflict.entityType}' is not yet implemented`,
      );
    }

    const snapshot =
      dto.resolution === 'keep_server'
        ? (conflict.serverVersionSnapshot as { score: string | number })
        : (conflict.clientVersionSnapshot as { score: string | number });

    const grade = await this.prisma.grade.update({
      where: { id: conflict.entityId },
      data: {
        score: Number(snapshot.score),
        gradingStatus: 'reviewed',
        syncStatus: 'synced',
        syncedAt: new Date(),
        version: { increment: 1 },
      },
    });

    const resolved = await this.prisma.syncConflict.update({
      where: { id: conflictId },
      data: { status: 'resolved', resolvedBy: actor.userId, resolvedAt: new Date(), resolutionNotes: dto.notes },
    });

    await this.prisma.syncQueueItem.update({
      where: { id: conflict.syncQueueId },
      data: { status: 'synced', syncedAt: new Date() },
    });

    await this.audit.log({
      actorId: actor.userId,
      action: 'sync_conflict.resolve',
      entityType: 'grade',
      entityId: grade.id,
      beforeValue: conflict,
      afterValue: { grade, resolution: dto.resolution },
    });

    return resolved;
  }

  async getStatus(userId: string) {
    const devices = await this.prisma.device.findMany({ where: { userId } });
    const openConflicts = await this.prisma.syncConflict.count({ where: { status: 'open' } });
    return { devices, openConflicts };
  }
}
