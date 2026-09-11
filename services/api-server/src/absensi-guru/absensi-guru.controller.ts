import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { AbsensiGuruService } from './absensi-guru.service';
import { PresensiFallbackDto, PresensiMasukDto } from './dto/presensi.dto';
import { QueryRekapGuruDto, VerifikasiFallbackDto } from './dto/query-rekap.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser, type JwtPayload } from '../common/decorators/current-user.decorator';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('absensi-guru')
export class AbsensiGuruController {
  constructor(private readonly presensi: AbsensiGuruService) {}

  @Post('masuk')
  masuk(@CurrentUser() user: JwtPayload, @Body() dto: PresensiMasukDto) {
    return this.presensi.masuk(user, dto);
  }

  @Post('pulang')
  pulang(@CurrentUser() user: JwtPayload) {
    return this.presensi.pulang(user);
  }

  @Post('fallback')
  fallback(@CurrentUser() user: JwtPayload, @Body() dto: PresensiFallbackDto) {
    return this.presensi.fallback(user, dto);
  }

  @Roles('SUPER_ADMIN')
  @Post(':id/verifikasi')
  verifikasi(@Param('id') id: string, @Body() dto: VerifikasiFallbackDto) {
    return this.presensi.verifikasi(id, dto);
  }

  @Roles('SUPER_ADMIN', 'KEPALA_SEKOLAH')
  @Get('rekap')
  rekap(@Query() q: QueryRekapGuruDto) {
    return this.presensi.rekap(q);
  }
}
