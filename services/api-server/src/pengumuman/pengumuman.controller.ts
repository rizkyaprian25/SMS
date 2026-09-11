import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { PengumumanService } from './pengumuman.service';
import { CreatePengumumanDto, QueryPengumumanDto } from './dto/pengumuman.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('pengumuman')
export class PengumumanController {
  constructor(private readonly info: PengumumanService) {}

  @Get()
  list(@Query() q: QueryPengumumanDto) {
    return this.info.list(q);
  }

  @Roles('SUPER_ADMIN')
  @Post()
  create(@Body() dto: CreatePengumumanDto) {
    return this.info.create(dto);
  }

  @Roles('SUPER_ADMIN')
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: Partial<CreatePengumumanDto>) {
    return this.info.update(id, dto);
  }

  @Roles('SUPER_ADMIN')
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.info.remove(id);
  }
}
