import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { PelanggaranService } from './pelanggaran.service';
import { CreatePelanggaranDto, QueryPelanggaranDto, UpdatePelanggaranDto } from './dto/pelanggaran.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser, type JwtPayload } from '../common/decorators/current-user.decorator';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SUPER_ADMIN', 'GURU_BK', 'WALI_KELAS')
@Controller('pelanggaran')
export class PelanggaranController {
  constructor(private readonly bk: PelanggaranService) {}

  @Post()
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreatePelanggaranDto) {
    return this.bk.create(user, dto);
  }

  @Get()
  list(@CurrentUser() user: JwtPayload, @Query() q: QueryPelanggaranDto) {
    return this.bk.list(user, q);
  }

  @Get('total')
  total(@CurrentUser() user: JwtPayload, @Query('siswaId') siswaId: string) {
    return this.bk.total(user, siswaId);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: UpdatePelanggaranDto,
  ) {
    return this.bk.update(user, id, dto);
  }

  @Delete(':id')
  remove(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.bk.remove(user, id);
  }
}
