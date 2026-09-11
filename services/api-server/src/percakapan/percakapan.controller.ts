import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { PercakapanService } from './percakapan.service';
import { BuatPercakapanDto } from './dto/buat-percakapan.dto';
import { KirimPesanDto } from './dto/kirim-pesan.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser, type JwtPayload } from '../common/decorators/current-user.decorator';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('percakapan')
export class PercakapanController {
  constructor(private readonly percakapan: PercakapanService) {}

  @Roles('SUPER_ADMIN', 'WALI_KELAS', 'ORANG_TUA')
  @Post()
  buat(@CurrentUser() user: JwtPayload, @Body() dto: BuatPercakapanDto) {
    return this.percakapan.buat(user, dto);
  }

  @Roles('SUPER_ADMIN', 'WALI_KELAS', 'ORANG_TUA')
  @Get()
  list(@CurrentUser() user: JwtPayload) {
    return this.percakapan.list(user);
  }

  @Roles('SUPER_ADMIN', 'WALI_KELAS', 'ORANG_TUA')
  @Get(':id/pesan')
  listPesan(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.percakapan.listPesan(user, id);
  }

  @Roles('SUPER_ADMIN', 'WALI_KELAS', 'ORANG_TUA')
  @Post(':id/pesan')
  kirimPesan(@CurrentUser() user: JwtPayload, @Param('id') id: string, @Body() dto: KirimPesanDto) {
    return this.percakapan.kirimPesan(user, id, dto);
  }
}
