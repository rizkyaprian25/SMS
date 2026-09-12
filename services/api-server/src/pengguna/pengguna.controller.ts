import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { PenggunaService } from './pengguna.service';
import {
  CreatePenggunaDto,
  QueryPenggunaDto,
  ResetPasswordDto,
  UpdatePenggunaDto,
} from './dto/pengguna.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser, type JwtPayload } from '../common/decorators/current-user.decorator';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SUPER_ADMIN')
@Controller('pengguna')
export class PenggunaController {
  constructor(private readonly service: PenggunaService) {}

  @Get()
  list(@Query() query: QueryPenggunaDto) {
    return this.service.list(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post()
  create(@Body() dto: CreatePenggunaDto, @CurrentUser() user: JwtPayload) {
    return this.service.create(dto, user);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdatePenggunaDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.update(id, dto, user);
  }

  @Post(':id/reset-password')
  resetPassword(
    @Param('id') id: string,
    @Body() dto: ResetPasswordDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.resetPassword(id, dto, user);
  }

  @Delete(':id')
  delete(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.service.delete(id, user);
  }
}
