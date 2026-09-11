import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { RombelService } from './rombel.service';
import { CreateRombelDto } from './dto/create-rombel.dto';
import { QueryRombelDto, QueryRombelSiswaDto } from './dto/query-rombel.dto';
import { UpdateRombelDto } from './dto/update-rombel.dto';
import { NaikKelasDto } from './dto/naik-kelas.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser, type JwtPayload } from '../common/decorators/current-user.decorator';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('rombel')
export class RombelController {
  constructor(private readonly rombel: RombelService) {}

  @Get()
  list(@Query() q: QueryRombelDto) {
    return this.rombel.list(q);
  }

  @Get(':id/siswa')
  siswa(@Param('id') id: string, @Query() q: QueryRombelSiswaDto) {
    return this.rombel.siswa(id, q);
  }

  @Roles('SUPER_ADMIN')
  @Post()
  create(@Body() dto: CreateRombelDto) {
    return this.rombel.create(dto);
  }

  @Roles('SUPER_ADMIN')
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateRombelDto) {
    return this.rombel.update(id, dto);
  }

  @Roles('SUPER_ADMIN')
  @Post(':id/arsip')
  archive(@Param('id') id: string) {
    return this.rombel.archive(id);
  }

  /** Kenaikan kelas massal: ?preview=true dulu, lalu eksekusi. */
  @Roles('SUPER_ADMIN')
  @Post('naik-kelas')
  naikKelas(
    @CurrentUser() user: JwtPayload,
    @Body() dto: NaikKelasDto,
    @Query('preview') preview?: string,
  ) {
    return this.rombel.naikKelas(user, dto, preview === 'true');
  }
}
