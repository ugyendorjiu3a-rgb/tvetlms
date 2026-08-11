import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { ROLE } from '../../common/constants/roles';
import { SubmissionsService } from './submissions.service';
import { CreateCommentDto, CreateSubmissionDto } from './dto/submission.dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('submissions')
export class SubmissionsController {
  constructor(private readonly submissions: SubmissionsService) {}

  // Idempotent by design (upsert on assignmentId+traineeId with a client-generatable id) so an
  // offline client can safely retry this call after a dropped connection without double-submitting.
  @Post()
  @Roles(ROLE.TRAINEE)
  submit(@Body() dto: CreateSubmissionDto, @CurrentUser() user: AuthenticatedUser) {
    return this.submissions.submit(dto, user);
  }

  @Get('mine')
  @Roles(ROLE.TRAINEE)
  mine(@CurrentUser() user: AuthenticatedUser) {
    return this.submissions.findForTrainee(user.traineeId!);
  }

  @Get('queue')
  @Roles(ROLE.TRAINER)
  queue(@CurrentUser() user: AuthenticatedUser, @Query('status') status?: string) {
    return this.submissions.findQueueForTrainer(user.trainerId!, status);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.submissions.findOne(id, user);
  }

  @Post(':id/comments')
  addComment(@Param('id') id: string, @Body() dto: CreateCommentDto, @CurrentUser() user: AuthenticatedUser) {
    return this.submissions.addComment(id, dto, user);
  }
}
