import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { MapelService } from './mapel.service';
import { CreateMapelDto, UpdateMapelDto } from './dto/mapel.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('mapel')
export class MapelController {
  constructor(private readonly mapel: MapelService) {}

  @Get()
  list() {
    return this.mapel.list();
  }

  @Roles('SUPER_ADMIN')
  @Post()
  create(@Body() dto: CreateMapelDto) {
    return this.mapel.create(dto);
  }

  @Roles('SUPER_ADMIN')
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateMapelDto) {
    return this.mapel.update(id, dto);
  }

  @Roles('SUPER_ADMIN')
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.mapel.remove(id);
  }
}
