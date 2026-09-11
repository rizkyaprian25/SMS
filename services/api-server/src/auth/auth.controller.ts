import { Body, Controller, Get, Post, Put, Query, Req, Res, UseGuards } from '@nestjs/common';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { DeviceTokenDto } from './dto/device-token.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

const COOKIE = 'refreshToken';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  private setCookie(res: Response, refreshToken: string) {
    res.cookie(COOKIE, refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 3600 * 1000,
      path: '/api/v1/auth',
    });
  }

  @Post('login')
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
    const { data, refreshToken } = await this.auth.login(dto);
    this.setCookie(res, refreshToken);
    return data;
  }

  @Post('refresh')
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const { data, refreshToken } = await this.auth.refresh(req.cookies?.[COOKIE] as string | undefined);
    this.setCookie(res, refreshToken);
    return data;
  }

  @Post('logout')
  async logout(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
    @Query('semua') semua?: string,
  ) {
    const hasil = await this.auth.logout(
      req.cookies?.[COOKIE] as string | undefined,
      semua === 'true',
      (req as unknown as { user?: { sub: string } }).user?.sub,
    );
    res.clearCookie(COOKIE, { path: '/api/v1/auth' });
    return hasil;
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  me(@CurrentUser() user: { sub: string }) {
    return this.auth.me(user.sub);
  }

  @UseGuards(JwtAuthGuard)
  @Put('devices/token')
  device(@CurrentUser() user: { sub: string }, @Body() dto: DeviceTokenDto) {
    return this.auth.daftarPerangkat(user.sub, dto);
  }
}
