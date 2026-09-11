import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { PerizinanService } from './perizinan.service';
import { CreatePerizinanDto, PutuskanIzinDto } from './dto/perizinan.dto';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser, type JwtPayload } from '../common/decorators/current-user.decorator';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('perizinan')
export class PerizinanController {
  constructor(private readonly izin: PerizinanService) {}

  @Roles('SUPER_ADMIN', 'GURU_MAPEL', 'WALI_KELAS')
  @Post()
  ajukan(@Body() dto: CreatePerizinanDto) {
    return this.izin.ajukan(dto);
  }

  @Get()
  list(@Query() q: PaginationQueryDto & { status?: string; siswaId?: string }) {
    return this.izin.list(q);
  }

  @Roles('SUPER_ADMIN', 'WALI_KELAS')
  @Post(':id/putuskan')
  putuskan(@Param('id') id: string, @CurrentUser() user: JwtPayload, @Body() dto: PutuskanIzinDto) {
    return this.izin.putuskan(id, user, dto);
  }
}
