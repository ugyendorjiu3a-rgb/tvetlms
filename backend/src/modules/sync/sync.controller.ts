import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { ROLE } from '../../common/constants/roles';
import { SyncService } from './sync.service';
import { RegisterDeviceDto, ResolveConflictDto } from './dto/sync.dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('sync')
export class SyncController {
  constructor(private readonly sync: SyncService) {}

  @Post('devices')
  registerDevice(@Body() dto: RegisterDeviceDto, @CurrentUser() user: AuthenticatedUser) {
    return this.sync.registerDevice(dto, user);
  }

  @Get('status')
  status(@CurrentUser() user: AuthenticatedUser) {
    return this.sync.getStatus(user.userId);
  }

  // Sync Conflict Queue — ui-ux-flow.md §2.7 (Trainer) / §3.4 (Exam Controller).
  @Get('conflicts')
  @Roles(ROLE.TRAINER, ROLE.EXAM_CONTROLLER, ROLE.ADMIN)
  listConflicts() {
    return this.sync.listOpenConflicts();
  }

  @Patch('conflicts/:id/resolve')
  @Roles(ROLE.TRAINER, ROLE.EXAM_CONTROLLER, ROLE.ADMIN)
  resolveConflict(@Param('id') id: string, @Body() dto: ResolveConflictDto, @CurrentUser() user: AuthenticatedUser) {
    return this.sync.resolveConflict(id, dto, user);
  }
}
