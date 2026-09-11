import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { NotifikasiService } from './notifikasi.service';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SUPER_ADMIN')
@Controller('notifikasi')
export class NotifikasiController {
  constructor(private readonly notif: NotifikasiService) {}

  @Get()
  list(@Query() q: PaginationQueryDto) {
    return this.notif.list(q);
  }
}
