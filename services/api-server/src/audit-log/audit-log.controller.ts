import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AuditLogService } from './audit-log.service';
import { QueryAuditLogDto } from './dto/audit-log.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SUPER_ADMIN', 'KEPALA_SEKOLAH')
@Controller('audit-log')
export class AuditLogController {
  constructor(private readonly service: AuditLogService) {}

  @Get()
  list(@Query() query: QueryAuditLogDto) {
    return this.service.list(query);
  }
}
