import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { RombelService } from './rombel.service';
import { CreateRombelDto } from './dto/create-rombel.dto';
import { QueryRombelDto } from './dto/query-rombel.dto';
import { UpdateRombelDto } from './dto/update-rombel.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('rombel')
export class RombelController {
  constructor(private readonly rombel: RombelService) {}

  @Get()
  list(@Query() q: QueryRombelDto) {
    return this.rombel.list(q);
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
}
