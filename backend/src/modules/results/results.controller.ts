import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { ROLE } from '../../common/constants/roles';
import { ResultsService } from './results.service';
import { ComputeResultDto, DisputeResultDto } from './dto/result.dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('results')
export class ResultsController {
  constructor(private readonly results: ResultsService) {}

  @Post('compute')
  @Roles(ROLE.TRAINER, ROLE.EXAM_CONTROLLER, ROLE.ADMIN)
  compute(@Body() dto: ComputeResultDto, @CurrentUser() user: AuthenticatedUser) {
    return this.results.computeForTrainee(dto.traineeId, dto.moduleId, user);
  }

  @Get('pending-approval')
  @Roles(ROLE.EXAM_CONTROLLER)
  pendingApproval() {
    return this.results.findPendingApproval();
  }

  @Get('mine')
  @Roles(ROLE.TRAINEE)
  mine(@CurrentUser() user: AuthenticatedUser) {
    return this.results.findForTrainee(user.traineeId!);
  }

  @Post(':id/approve')
  @Roles(ROLE.EXAM_CONTROLLER)
  approve(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.results.approve(id, user);
  }

  @Post(':id/dispute')
  @Roles(ROLE.EXAM_CONTROLLER)
  dispute(@Param('id') id: string, @Body() dto: DisputeResultDto, @CurrentUser() user: AuthenticatedUser) {
    return this.results.dispute(id, dto.reason, user);
  }
}
