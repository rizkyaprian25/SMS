import { Body, Controller, Delete, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { JadwalService } from './jadwal.service';
import { CreateJadwalDto } from './dto/create-jadwal.dto';
import { QueryJadwalDto } from './dto/query-jadwal.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser, type JwtPayload } from '../common/decorators/current-user.decorator';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller()
export class JadwalController {
  constructor(private readonly jadwal: JadwalService) {}

  @Get('jadwal')
  list(@Query() q: QueryJadwalDto) {
    return this.jadwal.list(q);
  }

  @Get('jadwal-saya')
  saya(@CurrentUser() user: JwtPayload, @Query('hari') hari?: QueryJadwalDto['hari']) {
    if (!user.guruId) return { data: [] };
    return this.jadwal.jadwalSaya(user.guruId, hari);
  }

  @Roles('SUPER_ADMIN')
  @Post('jadwal')
  create(@Body() dto: CreateJadwalDto) {
    return this.jadwal.create(dto);
  }

  @Roles('SUPER_ADMIN')
  @Delete('jadwal/:id')
  remove(@Param('id') id: string) {
    return this.jadwal.remove(id);
  }
}
