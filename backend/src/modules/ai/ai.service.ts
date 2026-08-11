import { BadRequestException, Injectable } from '@nestjs/common';
import { AiRecommendationLog } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { fromJsonString, toJsonString, toNullableJsonString } from '../../common/utils/json.util';
import { CreateAiRecommendationDto } from './dto/ai-recommendation.dto';

// suggestion/inputDataRef are JSON-encoded strings in local SQLite dev mode (see schema.prisma
// header note) — decode them back to objects for the API response.
function toApiSuggestion<T extends AiRecommendationLog>(log: T) {
  return { ...log, suggestion: fromJsonString(log.suggestion), inputDataRef: fromJsonString(log.inputDataRef) };
}

// The AI Gateway boundary from architecture.md §9: AI output lands here as a Suggestion, never
// writes directly to grades/certification/policy tables, and requires an explicit human
// accept/reject (PRD §16 — "AI must never remove the human review step"). Applying an accepted
// suggestion's *effect* (e.g. actually creating an intervention task from an at-risk flag) is
// deliberately out of scope here — this module owns the suggestion/decision record, not a
// downstream workflow engine.
@Injectable()
export class AiService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async recordSuggestion(dto: CreateAiRecommendationDto, actor: AuthenticatedUser) {
    const suggestion = await this.prisma.aiRecommendationLog.create({
      data: {
        traineeId: dto.traineeId,
        recommendationType: dto.recommendationType,
        suggestion: toJsonString(dto.suggestion),
        inputDataRef: toNullableJsonString(dto.inputDataRef),
        modelVersion: dto.modelVersion,
        status: 'pending',
      },
    });

    await this.audit.log({
      actorId: actor.userId,
      action: 'ai_recommendation.create',
      entityType: 'ai_recommendation_log',
      entityId: suggestion.id,
      afterValue: suggestion,
    });

    return toApiSuggestion(suggestion);
  }

  async listPending(traineeId?: string) {
    const logs = await this.prisma.aiRecommendationLog.findMany({
      where: { status: 'pending', traineeId },
      orderBy: { generatedAt: 'desc' },
    });
    return logs.map(toApiSuggestion);
  }

  async decide(id: string, decision: 'accepted' | 'rejected', actor: AuthenticatedUser) {
    const existing = await this.prisma.aiRecommendationLog.findUniqueOrThrow({ where: { id } });
    if (existing.status !== 'pending') {
      throw new BadRequestException(`This suggestion was already '${existing.status}'`);
    }

    const updated = await this.prisma.aiRecommendationLog.update({
      where: { id },
      data: { status: decision, reviewedBy: actor.userId, reviewedAt: new Date() },
    });

    await this.audit.log({
      actorId: actor.userId,
      action: `ai_recommendation.${decision}`,
      entityType: 'ai_recommendation_log',
      entityId: id,
      beforeValue: existing,
      afterValue: updated,
    });

    return toApiSuggestion(updated);
  }
}
