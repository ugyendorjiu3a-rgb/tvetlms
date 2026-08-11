import { Injectable } from '@nestjs/common';
import { Resource } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { decodeStringArray, encodeStringArray } from '../../common/utils/json-array.util';
import { CreateResourceDto, ReviewResourceDto } from './dto/resource.dto';

// `tags` is stored as a JSON string in local SQLite dev mode (see schema.prisma header note) —
// this maps it back to a plain string[] so the HTTP API shape never leaks that detail.
function toApiResource<T extends Resource>(resource: T) {
  return { ...resource, tags: decodeStringArray(resource.tags) };
}

// Resource metadata, search, and access logging (PRD §14 / database-design.md §3 resources /
// resource_access_logs). The search path here is what the pilot's core success measure — "time to
// locate a resource drops from days to minutes" — is actually validated against.
@Injectable()
export class ResourcesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async create(dto: CreateResourceDto, actor: AuthenticatedUser) {
    const resource = await this.prisma.resource.create({
      data: {
        titleEn: dto.titleEn,
        titleDz: dto.titleDz,
        moduleId: dto.moduleId,
        ncsCode: dto.ncsCode,
        format: dto.format,
        language: dto.language ?? 'en',
        fileUrl: dto.fileUrl,
        fileHash: dto.fileHash,
        tags: encodeStringArray(dto.tags),
        permissionLevel: dto.permissionLevel ?? 'institution',
        uploadedBy: actor.userId,
        updatedBy: actor.userId,
      },
    });

    await this.audit.log({
      actorId: actor.userId,
      action: 'resource.create',
      entityType: 'resource',
      entityId: resource.id,
      afterValue: resource,
    });

    return toApiResource(resource);
  }

  // Local SQLite dev mode note: `mode: 'insensitive'` and native array filters (`tags: { has }`)
  // are PostgreSQL-only Prisma features (database-design.md §5 documents the GIN indexes this
  // query is designed to hit once deployed to Postgres). Here, tags is a JSON string, so tag
  // matching falls back to a substring `contains` against that string — functional but coarser
  // than the real array-overlap search; fine for local dev, not the production search behavior.
  async search(query: string | undefined, moduleId: string | undefined, actor: AuthenticatedUser) {
    const normalizedQuery = query?.toLowerCase();
    const resources = await this.prisma.resource.findMany({
      where: {
        moduleId: moduleId ?? undefined,
        ...(normalizedQuery
          ? {
              OR: [
                { titleEn: { contains: normalizedQuery } },
                { titleDz: { contains: normalizedQuery } },
                { tags: { contains: normalizedQuery } },
              ],
            }
          : {}),
      },
      orderBy: { dateAdded: 'desc' },
    });

    // resource_access_logs.resource_id is NOT NULL (database-design.md §3), so a search that
    // returns zero results has nothing to attach a search_hit log to. A dedicated "search miss"
    // log (for content-gap analysis, PRD FR10) would need its own nullable-resource table — left
    // as a follow-up rather than bent into this schema.
    if (query && resources[0]) {
      await this.prisma.resourceAccessLog.create({
        data: { resourceId: resources[0].id, userId: actor.userId, action: 'search_hit', searchQuery: query },
      });
    }

    return resources.map(toApiResource);
  }

  async findOne(id: string, actor: AuthenticatedUser) {
    const resource = await this.prisma.resource.findUniqueOrThrow({ where: { id } });
    await this.logAccess(id, actor.userId, 'view');
    return toApiResource(resource);
  }

  async recordDownload(id: string, actor: AuthenticatedUser) {
    const resource = await this.prisma.resource.findUniqueOrThrow({ where: { id } });
    await this.logAccess(id, actor.userId, 'download');
    // Actual file bytes are served from MinIO directly (architecture.md §6); this endpoint's job
    // is the access log + returning the object storage reference, not proxying the file.
    return { fileUrl: resource.fileUrl, fileHash: resource.fileHash };
  }

  async review(id: string, dto: ReviewResourceDto, actor: AuthenticatedUser) {
    const [review] = await this.prisma.$transaction([
      this.prisma.resourceReview.create({ data: { resourceId: id, reviewerId: actor.userId, notes: dto.notes } }),
      this.prisma.resource.update({ where: { id }, data: { lastReviewedDate: new Date() } }),
    ]);
    await this.audit.log({
      actorId: actor.userId,
      action: 'resource.review',
      entityType: 'resource',
      entityId: id,
      afterValue: review,
    });
    return review;
  }

  private async logAccess(resourceId: string, userId: string, action: 'view' | 'download') {
    await this.prisma.resourceAccessLog.create({ data: { resourceId, userId, action } });
  }
}
