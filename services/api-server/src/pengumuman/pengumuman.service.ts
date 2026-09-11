import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { pageMeta, pageParams } from '../common/pagination';
import { NotifikasiService } from '../notifikasi/notifikasi.service';
import { CreatePengumumanDto, QueryPengumumanDto } from './dto/pengumuman.dto';

/** Broadcast sekolah. Tulis ADMIN, baca semua sesuai target. Push FCM menyusul (docs/10). */
@Injectable()
export class PengumumanService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notif: NotifikasiService,
  ) {}

  async list(query: QueryPengumumanDto) {
    const { page, limit, skip } = pageParams({
      page: String(query.page ?? 1),
      limit: String(query.limit ?? 20),
    });
    const and: Prisma.PengumumanWhereInput[] = [];
    if (query.role) and.push({ targetRole: { has: query.role } });
    if (query.rombelId) {
      and.push({ OR: [{ targetRombelId: null }, { targetRombelId: query.rombelId }] });
    }
    if (query.q) and.push({ judul: { contains: query.q, mode: 'insensitive' as const } });
    const where = and.length ? { AND: and } : {};
    const [rows, total] = await Promise.all([
      this.prisma.pengumuman.findMany({
        where,
        skip,
        take: limit,
        orderBy: { diterbitkanPada: 'desc' },
      }),
      this.prisma.pengumuman.count({ where }),
    ]);
    return { data: rows, meta: pageMeta(total, page, limit) };
  }

  async create(dto: CreatePengumumanDto) {
    const row = await this.prisma.pengumuman.create({ data: dto });
    // Push best-effort: pengumuman tetap tersimpan walau FCM gagal.
    try {
      await this.notif.broadcastPengumuman({
        judul: dto.judul,
        isi: dto.isi,
        targetRole: dto.targetRole,
      });
    } catch {
      // dicatat di log server oleh global filter bila perlu
    }
    return { data: row };
  }

  async update(id: string, dto: Partial<CreatePengumumanDto>) {
    const lama = await this.prisma.pengumuman.findUnique({ where: { id } });
    if (!lama) throw new NotFoundException('Pengumuman tidak ditemukan');
    const row = await this.prisma.pengumuman.update({
      where: { id },
      data: dto,
    });
    return { data: row };
  }

  async remove(id: string) {
    const lama = await this.prisma.pengumuman.findUnique({ where: { id } });
    if (!lama) throw new NotFoundException('Pengumuman tidak ditemukan');
    await this.prisma.pengumuman.delete({ where: { id } });
    return { data: { id } };
  }
}
