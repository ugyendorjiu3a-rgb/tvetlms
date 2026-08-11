import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { ROLE } from '../../common/constants/roles';
import { UsersService } from './users.service';
import { CreateTraineeDto } from './dto/create-trainee.dto';
import { CreateTrainerDto } from './dto/create-trainer.dto';
import { CreateStaffDto } from './dto/create-staff.dto';
import { AdminUpdateTraineeDto, RequestEradicationDto, UpdateOwnProfileDto } from './dto/update-profile.dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get('me')
  me(@CurrentUser() user: AuthenticatedUser) {
    return this.users.me(user.userId);
  }

  @Patch('me')
  updateMe(@CurrentUser() user: AuthenticatedUser, @Body() dto: UpdateOwnProfileDto) {
    return this.users.updateOwnProfile(user, dto);
  }

  @Get()
  @Roles(ROLE.ADMIN)
  list(@Query('institutionId') institutionId?: string) {
    return this.users.listUsers(institutionId);
  }

  @Post('trainees')
  @Roles(ROLE.ADMIN)
  createTrainee(@Body() dto: CreateTraineeDto, @CurrentUser() user: AuthenticatedUser) {
    return this.users.createTrainee(dto, user);
  }

  @Post('trainers')
  @Roles(ROLE.ADMIN)
  createTrainer(@Body() dto: CreateTrainerDto, @CurrentUser() user: AuthenticatedUser) {
    return this.users.createTrainer(dto, user);
  }

  @Post('staff')
  @Roles(ROLE.ADMIN)
  createStaff(@Body() dto: CreateStaffDto, @CurrentUser() user: AuthenticatedUser) {
    return this.users.createStaff(dto, user);
  }

  @Patch('trainees/:traineeId')
  @Roles(ROLE.ADMIN)
  adminUpdateTrainee(
    @Param('traineeId') traineeId: string,
    @Body() dto: AdminUpdateTraineeDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.users.adminUpdateTrainee(traineeId, dto, user);
  }

  // Eradicate Trainee — two-step confirmable workflow (PRD FR6). Deliberately two endpoints,
  // not one, so the UI can render the confirmation modal from ui-ux-flow.md §6 between them.
  @Post('trainees/:traineeId/eradicate/request')
  @Roles(ROLE.ADMIN)
  requestEradication(
    @Param('traineeId') traineeId: string,
    @Body() dto: RequestEradicationDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.users.requestEradication(traineeId, dto.reason, user);
  }

  @Post('trainees/eradicate/:requestId/confirm')
  @Roles(ROLE.ADMIN)
  confirmEradication(@Param('requestId') requestId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.users.confirmEradication(requestId, user);
  }
}
