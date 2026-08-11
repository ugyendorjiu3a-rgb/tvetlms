import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { toNullableJsonString } from '../../common/utils/json.util';

export interface AuditLogInput {
  actorId?: string | null;
  action: string; // e.g. 'grade.update', 'trainee.eradicate', 'login.success'
  entityType: string;
  entityId?: string | null;
  beforeValue?: unknown;
  afterValue?: unknown;
  ipAddress?: string | null;
  institutionId?: string | null;
}

// Writes to the append-only audit_logs table (database-design.md §7/§9). Called explicitly by
// feature services at the point of a sensitive mutation, rather than inferred generically via an
// interceptor — sensitive actions need real before/after values, which a generic interceptor
// can't reliably capture across every entity shape.
//
// No update()/delete() methods are exposed on purpose: this service is insert-only by design.
@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async log(input: AuditLogInput): Promise<void> {
    await this.prisma.auditLog.create({
      data: {
        actorId: input.actorId ?? null,
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId ?? null,
        beforeValue: toNullableJsonString(input.beforeValue),
        afterValue: toNullableJsonString(input.afterValue),
        ipAddress: input.ipAddress ?? null,
        institutionId: input.institutionId ?? null,
      },
    });
  }
}
