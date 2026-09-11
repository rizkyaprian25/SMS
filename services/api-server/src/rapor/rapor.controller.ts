import { Controller, Get, Param, Query, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { RaporService } from './rapor.service';
import { QueryRaporDto } from './dto/query-rapor.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SUPER_ADMIN', 'KEPALA_SEKOLAH', 'WALI_KELAS')
@Controller('rapor')
export class RaporController {
  constructor(private readonly rapor: RaporService) {}

  @Get(':siswaId')
  rekap(@Param('siswaId') siswaId: string, @Query() q: QueryRaporDto) {
    return this.rapor.rekap(siswaId, q);
  }

  @Get(':siswaId.pdf')
  async unduh(@Param('siswaId') siswaId: string, @Query() q: QueryRaporDto, @Res() res: Response) {
    const { namaFile, buffer } = await this.rapor.pdf(siswaId, q);
    res.set({ 'Content-Type': 'application/pdf', 'Content-Disposition': `attachment; filename="${namaFile}"` });
    res.send(buffer);
  }
}
