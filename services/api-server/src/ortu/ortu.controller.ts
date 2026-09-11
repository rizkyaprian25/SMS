import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { OrtuService } from './ortu.service';
import { HubungkanAnakDto } from './dto/hubungkan-anak.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser, type JwtPayload } from '../common/decorators/current-user.decorator';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('ortu')
export class OrtuController {
  constructor(private readonly ortu: OrtuService) {}

  @Roles('ORANG_TUA')
  @Get('anak-saya')
  listAnak(@CurrentUser() user: JwtPayload) {
    return this.ortu.listAnak(user);
  }

  @Roles('SUPER_ADMIN')
  @Post('hubungkan')
  hubungkanAnak(@Body() dto: HubungkanAnakDto) {
    return this.ortu.hubungkanAnak(dto);
  }
}
