import { IsIn, IsObject, IsOptional, IsString, IsUUID } from 'class-validator';

const RECOMMENDATION_TYPES = [
  'personalization',
  'at_risk_flag',
  'intervention_suggestion',
  'content_adaptation',
] as const;

// In production this is written by the AI Gateway service (architecture.md §9), not submitted
// via a human-facing HTTP call. Exposed here so the suggestion review flow (ui-ux-flow.md §2.9)
// can be built and tested before a real model pipeline exists — restricted to Admin (see controller).
export class CreateAiRecommendationDto {
  @IsOptional()
  @IsUUID()
  traineeId?: string;

  @IsIn(RECOMMENDATION_TYPES)
  recommendationType!: (typeof RECOMMENDATION_TYPES)[number];

  @IsObject()
  suggestion!: Record<string, unknown>;

  @IsOptional()
  @IsObject()
  inputDataRef?: Record<string, unknown>;

  @IsString()
  modelVersion!: string;
}

export class DecideAiRecommendationDto {
  @IsIn(['accepted', 'rejected'])
  decision!: 'accepted' | 'rejected';
}
