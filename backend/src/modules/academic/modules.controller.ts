import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { ROLE } from '../../common/constants/roles';
import { ModulesService } from './modules.service';
import { AssignTrainerDto, CreateModuleDto, EnrollTraineeDto } from './dto/module.dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('modules')
export class ModulesController {
  constructor(private readonly modules: ModulesService) {}

  @Get()
  findAll(@Query('tradeId') tradeId?: string) {
    return this.modules.findAll(tradeId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.modules.findOne(id);
  }

  @Post()
  @Roles(ROLE.ADMIN)
  create(@Body() dto: CreateModuleDto, @CurrentUser() user: AuthenticatedUser) {
    return this.modules.create(dto, user);
  }

  @Post(':id/trainees')
  @Roles(ROLE.ADMIN)
  enrollTrainee(@Param('id') id: string, @Body() dto: EnrollTraineeDto, @CurrentUser() user: AuthenticatedUser) {
    return this.modules.enrollTrainee(id, dto, user);
  }

  @Post(':id/trainers')
  @Roles(ROLE.ADMIN)
  assignTrainer(@Param('id') id: string, @Body() dto: AssignTrainerDto, @CurrentUser() user: AuthenticatedUser) {
    return this.modules.assignTrainer(id, dto, user);
  }
}
