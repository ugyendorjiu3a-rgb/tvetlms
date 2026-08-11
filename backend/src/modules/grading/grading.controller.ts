import { Body, Controller, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { ROLE } from '../../common/constants/roles';
import { GradingService } from './grading.service';
import { AutoGradeDto, ManualGradeDto, ReviewGradeDto } from './dto/grade.dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('submissions/:submissionId/grade')
export class GradingController {
  constructor(private readonly grading: GradingService) {}

  @Post('auto')
  @Roles(ROLE.TRAINER)
  autoGrade(
    @Param('submissionId') submissionId: string,
    @Body() dto: AutoGradeDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.grading.autoGrade(submissionId, dto, user);
  }

  @Patch('manual')
  @Roles(ROLE.TRAINER)
  manualGrade(
    @Param('submissionId') submissionId: string,
    @Body() dto: ManualGradeDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.grading.manualGrade(submissionId, dto, user);
  }

  @Patch('review')
  @Roles(ROLE.EXAM_CONTROLLER)
  review(
    @Param('submissionId') submissionId: string,
    @Body() dto: ReviewGradeDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.grading.review(submissionId, dto, user);
  }
}
