import { Body, Controller, Delete, Get, Param, Patch, Post, Put, Query, UseGuards } from '@nestjs/common';
import { GuruService } from './guru.service';
import { CreateGuruDto, SetMapelDto, UpdateGuruDto } from './dto/guru.dto';
import { EnrollWajahDto } from './dto/enroll-wajah.dto';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser, type JwtPayload } from '../common/decorators/current-user.decorator';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('guru')
export class GuruController {
  constructor(private readonly guru: GuruService) {}

  @Roles('SUPER_ADMIN', 'KEPALA_SEKOLAH')
  @Get()
  list(@Query() q: PaginationQueryDto) {
    return this.guru.list(q);
  }

  @Roles('SUPER_ADMIN', 'KEPALA_SEKOLAH')
  @Get(':id')
  detail(@Param('id') id: string) {
    return this.guru.detail(id);
  }

  @Roles('SUPER_ADMIN')
  @Post()
  create(@Body() dto: CreateGuruDto) {
    return this.guru.create(dto);
  }

  @Roles('SUPER_ADMIN')
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateGuruDto) {
    return this.guru.update(id, dto);
  }

  @Roles('SUPER_ADMIN')
  @Put(':id/mapel')
  setMapel(@Param('id') id: string, @Body() dto: SetMapelDto) {
    return this.guru.setMapel(id, dto);
  }

  @Roles('SUPER_ADMIN')
  @Post(':id/arsip')
  archive(@Param('id') id: string) {
    return this.guru.archive(id);
  }

  @Put(':id/face-enroll')
  enroll(@Param('id') id: string, @CurrentUser() user: JwtPayload, @Body() dto: EnrollWajahDto) {
    return this.guru.enrollWajah(id, user, dto);
  }

  @Delete(':id/face')
  hapusWajah(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.guru.hapusWajah(id, user);
  }
}
