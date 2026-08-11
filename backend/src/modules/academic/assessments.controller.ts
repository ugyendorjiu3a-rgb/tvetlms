import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { ROLE } from '../../common/constants/roles';
import { AssessmentsService } from './assessments.service';
import { CreateAssessmentDto, CreateAssignmentDto } from './dto/assessment.dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller()
export class AssessmentsController {
  constructor(private readonly assessments: AssessmentsService) {}

  @Get('assessments')
  findAll(@Query('moduleId') moduleId?: string) {
    return this.assessments.findAll(moduleId);
  }

  @Get('assessments/:id')
  findOne(@Param('id') id: string) {
    return this.assessments.findOne(id);
  }

  // Trainer proposes an assessment; it stays invisible to trainees until an Exam Controller approves it.
  @Post('assessments')
  @Roles(ROLE.TRAINER)
  create(@Body() dto: CreateAssessmentDto, @CurrentUser() user: AuthenticatedUser) {
    return this.assessments.create(dto, user);
  }

  @Patch('assessments/:id/approve')
  @Roles(ROLE.EXAM_CONTROLLER)
  approve(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.assessments.approve(id, user);
  }

  @Get('assignments/:id')
  findAssignment(@Param('id') id: string) {
    return this.assessments.findAssignment(id);
  }

  @Post('assignments')
  @Roles(ROLE.TRAINER)
  createAssignment(@Body() dto: CreateAssignmentDto, @CurrentUser() user: AuthenticatedUser) {
    return this.assessments.createAssignment(dto, user);
  }
}
