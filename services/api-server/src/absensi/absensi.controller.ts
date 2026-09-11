import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { AbsensiService } from './absensi.service';
import { AbsensiBulkDto } from './dto/absensi-bulk.dto';
import { QueryAbsensiDto, RekapAbsensiDto } from './dto/query-absensi.dto';
import { UpdateAbsensiDto } from './dto/update-absensi.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser, type JwtPayload } from '../common/decorators/current-user.decorator';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('absensi')
export class AbsensiController {
  constructor(private readonly absensi: AbsensiService) {}

  @Roles('SUPER_ADMIN', 'GURU_MAPEL', 'WALI_KELAS')
  @Post('bulk')
  bulk(@CurrentUser() user: JwtPayload, @Body() dto: AbsensiBulkDto) {
    return this.absensi.createBulk(user, dto);
  }

  @Get()
  list(@Query() q: QueryAbsensiDto) {
    return this.absensi.list(q);
  }

  @Get('rekap')
  rekap(@Query() q: RekapAbsensiDto) {
    return this.absensi.rekap(q);
  }

  @Roles('SUPER_ADMIN', 'GURU_MAPEL', 'WALI_KELAS')
  @Patch(':id')
  update(@Param('id') id: string, @CurrentUser() user: JwtPayload, @Body() dto: UpdateAbsensiDto) {
    return this.absensi.update(id, user, dto);
  }
}
