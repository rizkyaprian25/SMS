import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { createHash } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { DeviceTokenDto } from './dto/device-token.dto';

const AKSES_TTL = '15m';
const REFRESH_HARI = 7;

/**
 * Access pendek (15 mnt) + refresh 7 hari dengan ROTASI:
 * tiap /refresh menukar refresh lama dengan yang baru (anti replay).
 * Satu user bisa banyak device — tiap device 1 baris sesi, logout 1
 * device tidak mengeluarkan yang lain. Ganti password/nonaktif user
 * -> cabut semua sesi -> semua device logout.
 */
@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  private aksesSecret(): string {
    return process.env.JWT_ACCESS_SECRET ?? 'dev-access-secret-min-32-karakter-xxxx';
  }

  private refreshSecret(): string {
    return process.env.JWT_REFRESH_SECRET ?? 'dev-refresh-secret-min-32-karakter-xxx';
  }

  private hash(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private async tokenPasangan(user: { id: string; role: string; guruId: string | null }) {
    const payload = { sub: user.id, role: user.role, guruId: user.guruId ?? undefined };
    const accessToken = await this.jwt.signAsync(payload, {
      secret: this.aksesSecret(),
      expiresIn: AKSES_TTL,
    });
    const refreshToken = await this.jwt.signAsync(payload, {
      secret: this.refreshSecret(),
      expiresIn: `${REFRESH_HARI}d`,
    });
    await this.prisma.sesi.create({
      data: {
        penggunaId: user.id,
        refreshHash: this.hash(refreshToken),
        expiresAt: new Date(Date.now() + REFRESH_HARI * 86400000),
      },
    });
    return { accessToken, refreshToken };
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.pengguna.findUnique({
      where: { email: dto.email },
      include: { guru: true },
    });
    if (!user) throw new UnauthorizedException('Email / password salah');
    const ok = await bcrypt.compare(dto.password, user.passwordHash);
    if (!ok) throw new UnauthorizedException('Email / password salah');
    const { accessToken, refreshToken } = await this.tokenPasangan(user);
    return {
      data: {
        accessToken,
        user: { id: user.id, email: user.email, role: user.role, guru: user.guru },
      },
      refreshToken,
    };
  }

  async refresh(refreshToken: string | undefined) {
    if (!refreshToken) throw new UnauthorizedException('Sesi berakhir, login ulang');
    let payload: { sub: string };
    try {
      payload = await this.jwt.verifyAsync(refreshToken, { secret: this.refreshSecret() });
    } catch {
      throw new UnauthorizedException('Sesi berakhir, login ulang');
    }
    const sesi = await this.prisma.sesi.findUnique({
      where: { refreshHash: this.hash(refreshToken) },
    });
    if (!sesi || sesi.dicabut || sesi.expiresAt.getTime() < Date.now() || sesi.penggunaId !== payload.sub) {
      throw new UnauthorizedException('Sesi berakhir, login ulang');
    }
    const user = await this.prisma.pengguna.findUnique({
      where: { id: sesi.penggunaId },
      include: { guru: true },
    });
    if (!user) throw new UnauthorizedException('Sesi berakhir, login ulang');
    // Rotasi: hanguskan yang lama, terbitkan pasangan baru.
    await this.prisma.sesi.update({ where: { id: sesi.id }, data: { dicabut: true } });
    const { accessToken, refreshToken: baru } = await this.tokenPasangan(user);
    return {
      data: {
        accessToken,
        user: { id: user.id, email: user.email, role: user.role, guru: user.guru },
      },
      refreshToken: baru,
    };
  }

  /** Logout 1 device (default) atau semua device (?semua=true). */
  async logout(refreshToken: string | undefined, semua = false, penggunaId?: string) {
    if (semua && penggunaId) {
      await this.prisma.sesi.updateMany({ where: { penggunaId, dicabut: false }, data: { dicabut: true } });
      return { data: { ok: true } };
    }
    if (refreshToken) {
      await this.prisma.sesi.updateMany({
        where: { refreshHash: this.hash(refreshToken), dicabut: false },
        data: { dicabut: true },
      });
    }
    return { data: { ok: true } };
  }

  /** Cabut semua sesi user — dipakai saat ganti password / nonaktifkan akun. */
  async cabutSemua(penggunaId: string) {
    await this.prisma.sesi.updateMany({ where: { penggunaId, dicabut: false }, data: { dicabut: true } });
    return { data: { ok: true } };
  }

  /** Daftar/update FCM token per device — dipanggil tiap login + app start. */
  async daftarPerangkat(penggunaId: string, dto: DeviceTokenDto) {
    const row = await this.prisma.perangkat.upsert({
      where: { penggunaId_fcmToken: { penggunaId, fcmToken: dto.fcmToken } },
      update: { platform: dto.platform, lastLogin: new Date() },
      create: { penggunaId, fcmToken: dto.fcmToken, platform: dto.platform },
    });
    return { data: row };
  }

  async me(userId: string) {
    const user = await this.prisma.pengguna.findUnique({
      where: { id: userId },
      include: {
        guru: {
          omit: { faceEmbeddingEnc: true },
          include: { mapelDiampu: { include: { mapel: true } } },
        },
      },
    });
    if (!user) throw new UnauthorizedException('User tidak ditemukan');
    return { data: user };
  }
}
