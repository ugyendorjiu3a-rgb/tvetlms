import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { ROLE } from '../../common/constants/roles';
import { ResourcesService } from './resources.service';
import { CreateResourceDto, ReviewResourceDto } from './dto/resource.dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('resources')
export class ResourcesController {
  constructor(private readonly resources: ResourcesService) {}

  @Get()
  search(
    @Query('q') q: string | undefined,
    @Query('moduleId') moduleId: string | undefined,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.resources.search(q, moduleId, user);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.resources.findOne(id, user);
  }

  @Post(':id/download')
  download(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.resources.recordDownload(id, user);
  }

  @Post()
  @Roles(ROLE.TRAINER, ROLE.ADMIN)
  create(@Body() dto: CreateResourceDto, @CurrentUser() user: AuthenticatedUser) {
    return this.resources.create(dto, user);
  }

  @Post(':id/review')
  @Roles(ROLE.TRAINER, ROLE.ADMIN)
  review(@Param('id') id: string, @Body() dto: ReviewResourceDto, @CurrentUser() user: AuthenticatedUser) {
    return this.resources.review(id, dto, user);
  }
}
