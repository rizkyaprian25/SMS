import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { JwtPayload } from '../common/decorators/current-user.decorator';
import { BuatPercakapanDto } from './dto/buat-percakapan.dto';
import { KirimPesanDto } from './dto/kirim-pesan.dto';

@Injectable()
export class PercakapanService {
  constructor(private readonly prisma: PrismaService) {}

  async buat(user: JwtPayload, dto: BuatPercakapanDto) {
    const siswa = await this.prisma.siswa.findUnique({
      where: { id: dto.siswaId },
      include: { rombel: true },
    });
    if (!siswa) throw new NotFoundException('Siswa tidak ditemukan');
    if (!siswa.rombel || !siswa.rombel.waliKelasId) {
      throw new BadRequestException('Rombel siswa belum memiliki wali kelas');
    }

    const waliId = siswa.rombel.waliKelasId;
    let ortuId: string;

    if (user.role === 'ORANG_TUA') {
      const rel = await this.prisma.ortuSiswa.findUnique({
        where: { ortuId_siswaId: { ortuId: user.sub, siswaId: dto.siswaId } },
      });
      if (!rel) throw new ForbiddenException('Anda bukan orang tua resmi dari siswa ini');
      ortuId = user.sub;
    } else if (user.role === 'WALI_KELAS') {
      if (user.guruId !== waliId) {
        throw new ForbiddenException('Anda bukan wali kelas dari siswa ini');
      }
      const ortuRel = await this.prisma.ortuSiswa.findFirst({
        where: { siswaId: dto.siswaId },
      });
      if (!ortuRel) throw new BadRequestException('Siswa belum memiliki akun orang tua terdaftar');
      ortuId = ortuRel.ortuId;
    } else if (user.role === 'SUPER_ADMIN') {
      const ortuRel = await this.prisma.ortuSiswa.findFirst({
        where: { siswaId: dto.siswaId },
      });
      if (!ortuRel) throw new BadRequestException('Siswa belum memiliki akun orang tua terdaftar');
      ortuId = ortuRel.ortuId;
    } else {
      throw new ForbiddenException('Role tidak diizinkan membuka percakapan');
    }

    const percakapan = await this.prisma.percakapan.upsert({
      where: { waliId_ortuId_siswaId: { waliId, ortuId, siswaId: dto.siswaId } },
      create: {
        waliId,
        ortuId,
        siswaId: dto.siswaId,
      },
      update: {},
      include: {
        wali: { select: { id: true, nama: true } },
        ortu: { select: { id: true, email: true } },
        siswa: { select: { id: true, nama: true, nisn: true } },
      },
    });

    return { data: percakapan };
  }

  async list(user: JwtPayload) {
    const where: Prisma.PercakapanWhereInput = {};
    if (user.role === 'ORANG_TUA') {
      where.ortuId = user.sub;
    } else if (user.role === 'WALI_KELAS') {
      where.waliId = user.guruId;
    } else if (user.role !== 'SUPER_ADMIN') {
      throw new ForbiddenException('Akses percakapan tidak diizinkan untuk role ini');
    }

    const data = await this.prisma.percakapan.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      include: {
        wali: { select: { id: true, nama: true } },
        ortu: { select: { id: true, email: true } },
        siswa: { select: { id: true, nama: true, nisn: true } },
        pesan: {
          take: 1,
          orderBy: { createdAt: 'desc' },
          select: { id: true, isi: true, createdAt: true, isDibaca: true },
        },
      },
    });

    return { data };
  }

  async listPesan(user: JwtPayload, percakapanId: string) {
    const percakapan = await this.prisma.percakapan.findUnique({ where: { id: percakapanId } });
    if (!percakapan) throw new NotFoundException('Percakapan tidak ditemukan');

    const isPeserta =
      user.role === 'SUPER_ADMIN' ||
      (user.role === 'ORANG_TUA' && percakapan.ortuId === user.sub) ||
      (user.role === 'WALI_KELAS' && percakapan.waliId === user.guruId);

    if (!isPeserta) throw new ForbiddenException('Anda bukan peserta percakapan ini');

    const pesan = await this.prisma.pesan.findMany({
      where: { percakapanId },
      orderBy: { createdAt: 'asc' },
      include: {
        pengirim: { select: { id: true, email: true, role: true } },
      },
    });

    return { data: pesan };
  }

  async kirimPesan(user: JwtPayload, percakapanId: string, dto: KirimPesanDto) {
    const percakapan = await this.prisma.percakapan.findUnique({ where: { id: percakapanId } });
    if (!percakapan) throw new NotFoundException('Percakapan tidak ditemukan');

    const isPeserta =
      user.role === 'SUPER_ADMIN' ||
      (user.role === 'ORANG_TUA' && percakapan.ortuId === user.sub) ||
      (user.role === 'WALI_KELAS' && percakapan.waliId === user.guruId);

    if (!isPeserta) throw new ForbiddenException('Anda bukan peserta percakapan ini');

    const [pesan] = await this.prisma.$transaction([
      this.prisma.pesan.create({
        data: {
          percakapanId,
          pengirimId: user.sub,
          isi: dto.isi,
        },
        include: {
          pengirim: { select: { id: true, email: true, role: true } },
        },
      }),
      this.prisma.percakapan.update({
        where: { id: percakapanId },
        data: { updatedAt: new Date() },
      }),
    ]);

    return { data: pesan };
  }
}
