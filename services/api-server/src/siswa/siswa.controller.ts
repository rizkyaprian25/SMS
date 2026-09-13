import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { SiswaService } from './siswa.service';
import { ImportService } from './import.service';
import { CreateSiswaDto } from './dto/create-siswa.dto';
import { QuerySiswaDto } from './dto/query-siswa.dto';
import { UpdateSiswaDto } from './dto/update-siswa.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser, type JwtPayload } from '../common/decorators/current-user.decorator';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('siswa')
export class SiswaController {
  constructor(
    private readonly siswa: SiswaService,
    private readonly impor: ImportService,
  ) {}

  @Get()
  list(@Query() q: QuerySiswaDto, @CurrentUser() user: JwtPayload) {
    return this.siswa.list(q, user);
  }

  @Get(':id')
  detail(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.siswa.detail(id, user);
  }

  @Roles('SUPER_ADMIN')
  @Post('import')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 5 * 1024 * 1024 } }))
  imporMassal(@UploadedFile() file: { buffer: Buffer } | undefined, @Query('tahunAjaranId') ta?: string) {
    return this.impor.importSiswa(file, ta);
  }

  @Roles('SUPER_ADMIN')
  @Post()
  create(@Body() dto: CreateSiswaDto) {
    return this.siswa.create(dto);
  }

  @Roles('SUPER_ADMIN')
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateSiswaDto) {
    return this.siswa.update(id, dto);
  }

  @Roles('SUPER_ADMIN')
  @Post(':id/arsip')
  archive(@Param('id') id: string) {
    return this.siswa.archive(id);
  }

  @Roles('SUPER_ADMIN')
  @Delete(':id')
  delete(@Param('id') id: string) {
    return this.siswa.archive(id);
  }
}
