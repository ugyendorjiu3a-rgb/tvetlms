import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { ROLE } from '../../common/constants/roles';
import { TradesService } from './trades.service';
import { CreateTradeDto } from './dto/create-trade.dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('trades')
export class TradesController {
  constructor(private readonly trades: TradesService) {}

  @Get()
  findAll() {
    return this.trades.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.trades.findOne(id);
  }

  @Post()
  @Roles(ROLE.ADMIN)
  create(@Body() dto: CreateTradeDto, @CurrentUser() user: AuthenticatedUser) {
    return this.trades.create(dto, user);
  }
}
