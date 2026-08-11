import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { ROLE } from '../../common/constants/roles';
import { AiService } from './ai.service';
import { CreateAiRecommendationDto, DecideAiRecommendationDto } from './dto/ai-recommendation.dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('ai/suggestions')
export class AiController {
  constructor(private readonly ai: AiService) {}

  // Seeding/testing only until a real AI pipeline exists — see dto comment.
  @Post()
  @Roles(ROLE.ADMIN)
  create(@Body() dto: CreateAiRecommendationDto, @CurrentUser() user: AuthenticatedUser) {
    return this.ai.recordSuggestion(dto, user);
  }

  @Get()
  @Roles(ROLE.TRAINER, ROLE.EXAM_CONTROLLER, ROLE.ADMIN)
  listPending(@Query('traineeId') traineeId?: string) {
    return this.ai.listPending(traineeId);
  }

  @Patch(':id/decide')
  @Roles(ROLE.TRAINER, ROLE.EXAM_CONTROLLER, ROLE.ADMIN)
  decide(@Param('id') id: string, @Body() dto: DecideAiRecommendationDto, @CurrentUser() user: AuthenticatedUser) {
    return this.ai.decide(id, dto.decision, user);
  }
}
