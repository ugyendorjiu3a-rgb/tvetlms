import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { ROLE } from '../../common/constants/roles';
import { ClassesService } from './classes.service';
import { CreateClassDto, EnrollClassDto } from './dto/class.dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('classes')
export class ClassesController {
  constructor(private readonly classes: ClassesService) {}

  @Get()
  findAll(@Query('institutionId') institutionId?: string) {
    return this.classes.findAll(institutionId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.classes.findOne(id);
  }

  @Post()
  @Roles(ROLE.ADMIN)
  create(@Body() dto: CreateClassDto, @CurrentUser() user: AuthenticatedUser) {
    return this.classes.create(dto, user);
  }

  @Post(':id/enrollments')
  @Roles(ROLE.ADMIN)
  enroll(@Param('id') id: string, @Body() dto: EnrollClassDto, @CurrentUser() user: AuthenticatedUser) {
    return this.classes.enroll(id, dto, user);
  }
}
