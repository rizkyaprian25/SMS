import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { TugasService } from './tugas.service';
import { CreateTugasDto } from './dto/create-tugas.dto';
import { QueryTugasDto } from './dto/query-tugas.dto';
import { KumpulTugasDto } from './dto/kumpul-tugas.dto';
import { NilaiTugasDto } from './dto/nilai-tugas.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser, type JwtPayload } from '../common/decorators/current-user.decorator';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('tugas')
export class TugasController {
  constructor(private readonly tugas: TugasService) {}

  @Roles('SUPER_ADMIN', 'GURU_MAPEL')
  @Post()
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateTugasDto) {
    return this.tugas.create(user, dto);
  }

  @Get()
  list(@CurrentUser() user: JwtPayload, @Query() q: QueryTugasDto) {
    return this.tugas.list(user, q);
  }

  @Get(':id')
  detail(@Param('id') id: string) {
    return this.tugas.detail(id);
  }

  @Roles('SISWA')
  @Post(':id/kumpul')
  kumpul(@CurrentUser() user: JwtPayload, @Param('id') id: string, @Body() dto: KumpulTugasDto) {
    return this.tugas.kumpul(user, id, dto);
  }

  @Roles('SUPER_ADMIN', 'GURU_MAPEL')
  @Get(':id/pengumpulan')
  listPengumpulan(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.tugas.listPengumpulan(user, id);
  }

  @Roles('SUPER_ADMIN', 'GURU_MAPEL')
  @Patch('pengumpulan/:id/nilai')
  beriNilai(@CurrentUser() user: JwtPayload, @Param('id') id: string, @Body() dto: NilaiTugasDto) {
    return this.tugas.beriNilai(user, id, dto);
  }
}
