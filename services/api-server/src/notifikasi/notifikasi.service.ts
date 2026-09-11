import { Injectable } from '@nestjs/common';
import { Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { pageMeta, pageParams } from '../common/pagination';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { FcmService } from './fcm.service';

/** Orkestrasi notifikasi: cari device penerima -> kirim -> catat log. */
@Injectable()
export class NotifikasiService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly fcm: FcmService,
  ) {}

  /** Broadcast pengumuman ke device milik role target (MVP: guru/admin). */
  async broadcastPengumuman(args: { judul: string; isi: string; targetRole: Role[] }) {
    const owners = await this.prisma.pengguna.findMany({
      where: { role: { in: args.targetRole } },
      select: { id: true },
    });
    const devices = await this.prisma.perangkat.findMany({
      where: { penggunaId: { in: owners.map((o) => o.id) } },
      select: { fcmToken: true },
    });
    const hasil = await this.fcm.kirim(
      devices.map((d) => d.fcmToken),
      args.judul,
      args.isi,
      '/pengumuman',
    );
    const row = await this.prisma.notifikasi.create({
      data: {
        judul: args.judul,
        isi: args.isi,
        route: '/pengumuman',
        target: args.targetRole.join(','),
        terkirim: hasil.sukses,
        gagal: hasil.gagal,
        mode: hasil.mode,
      },
    });
    return { data: row };
  }

  async list(query: PaginationQueryDto) {
    const { page, limit, skip } = pageParams({
      page: String(query.page ?? 1),
      limit: String(query.limit ?? 30),
    });
    const [rows, total] = await Promise.all([
      this.prisma.notifikasi.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.notifikasi.count(),
    ]);
    return { data: rows, meta: pageMeta(total, page, limit) };
  }
}
