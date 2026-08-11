import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { ROLE } from '../../common/constants/roles';
import { InstitutionsService } from './institutions.service';
import { CreateInstitutionDto } from './dto/create-institution.dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('institutions')
export class InstitutionsController {
  constructor(private readonly institutions: InstitutionsService) {}

  @Get()
  findAll() {
    return this.institutions.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.institutions.findOne(id);
  }

  @Post()
  @Roles(ROLE.ADMIN)
  create(@Body() dto: CreateInstitutionDto, @CurrentUser() user: AuthenticatedUser) {
    return this.institutions.create(dto, user);
  }
}
