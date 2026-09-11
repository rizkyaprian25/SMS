import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { NilaiService } from './nilai.service';
import { NilaiBulkDto } from './dto/nilai-bulk.dto';
import { UpdateNilaiDto } from './dto/update-nilai.dto';
import { QueryNilaiDto } from './dto/query-nilai.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser, type JwtPayload } from '../common/decorators/current-user.decorator';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('nilai')
export class NilaiController {
  constructor(private readonly nilai: NilaiService) {}

  @Roles('SUPER_ADMIN', 'GURU_MAPEL')
  @Post('bulk')
  bulk(@CurrentUser() user: JwtPayload, @Body() dto: NilaiBulkDto) {
    return this.nilai.createBulk(user, dto);
  }

  @Get()
  list(@Query() q: QueryNilaiDto) {
    return this.nilai.list(q);
  }

  @Roles('SUPER_ADMIN', 'GURU_MAPEL')
  @Patch(':id')
  update(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: UpdateNilaiDto,
  ) {
    return this.nilai.update(id, user, dto);
  }
}
