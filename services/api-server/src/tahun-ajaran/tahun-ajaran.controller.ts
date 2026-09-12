import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { TahunAjaranService } from './tahun-ajaran.service';
import { CreateTahunAjaranDto, UpdateTahunAjaranDto } from './dto/tahun-ajaran.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser, type JwtPayload } from '../common/decorators/current-user.decorator';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('tahun-ajaran')
export class TahunAjaranController {
  constructor(private readonly ta: TahunAjaranService) {}

  @Get()
  list() {
    return this.ta.list();
  }

  @Get('aktif')
  aktif() {
    return this.ta.aktif();
  }

  @Roles('SUPER_ADMIN')
  @Post()
  create(@Body() dto: CreateTahunAjaranDto) {
    return this.ta.create(dto);
  }

  @Roles('SUPER_ADMIN')
  @Post(':id/aktifkan')
  aktifkan(@Param('id') id: string) {
    return this.ta.aktifkan(id);
  }

  @Roles('SUPER_ADMIN')
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateTahunAjaranDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.ta.update(id, dto, user);
  }
}

