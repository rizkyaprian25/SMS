import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  async login(dto: LoginDto) {
    const user = await this.prisma.pengguna.findUnique({
      where: { email: dto.email },
      include: { guru: true },
    });
    if (!user) throw new UnauthorizedException('Email / password salah');
    const ok = await bcrypt.compare(dto.password, user.passwordHash);
    if (!ok) throw new UnauthorizedException('Email / password salah');

    const payload = { sub: user.id, role: user.role, guruId: user.guruId ?? undefined };
    const accessToken = await this.jwt.signAsync(payload, {
      secret: process.env.JWT_ACCESS_SECRET ?? 'dev-access-secret-min-32-karakter-xxxx',
      expiresIn: '15m',
    });
    // MVP: refresh opaque sederhana. Rotasi penuh + tabel sesi ditambahkan tahap berikut.
    const refreshToken = await this.jwt.signAsync(payload, {
      secret: process.env.JWT_REFRESH_SECRET ?? 'dev-refresh-secret-min-32-karakter-xxx',
      expiresIn: '7d',
    });
    return {
      data: {
        accessToken,
        user: { id: user.id, email: user.email, role: user.role, guru: user.guru },
      },
      refreshToken,
    };
  }

  async me(userId: string) {
    const user = await this.prisma.pengguna.findUnique({
      where: { id: userId },
      include: { guru: { include: { mapelDiampu: { include: { mapel: true } } } } },
    });
    if (!user) throw new UnauthorizedException('User tidak ditemukan');
    return { data: user };
  }
}
