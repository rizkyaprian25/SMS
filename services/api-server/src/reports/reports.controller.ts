import { Controller, Get, Query, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { ReportsService } from './reports.service';
import { ExportAbsensiDto, ExportNilaiDto } from './dto/export.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

const XLSX = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SUPER_ADMIN', 'KEPALA_SEKOLAH', 'WALI_KELAS')
@Controller('reports')
export class ReportsController {
  constructor(private readonly reports: ReportsService) {}

  @Get('absensi.xlsx')
  async absensi(@Query() q: ExportAbsensiDto, @Res() res: Response) {
    const { namaFile, buffer } = await this.reports.absensiXlsx(q);
    res.set({ 'Content-Type': XLSX, 'Content-Disposition': `attachment; filename="${namaFile}"` });
    res.send(buffer);
  }

  @Get('nilai.xlsx')
  async nilai(@Query() q: ExportNilaiDto, @Res() res: Response) {
    const { namaFile, buffer } = await this.reports.nilaiXlsx(q);
    res.set({ 'Content-Type': XLSX, 'Content-Disposition': `attachment; filename="${namaFile}"` });
    res.send(buffer);
  }
}
