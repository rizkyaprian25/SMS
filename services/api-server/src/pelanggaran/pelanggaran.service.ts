import { ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { pageMeta, pageParams } from '../common/pagination';
import type { JwtPayload } from '../common/decorators/current-user.decorator';
import { CreatePelanggaranDto, QueryPelanggaranDto } from './dto/pelanggaran.dto';

/**
 * Buku kasus/BK — akses TERBATAS: ADMIN + GURU_BK semua, WALI hanya kelas
 * binaan. Guru mapel biasa tidak boleh baca/tulis (docs/08).
 */
@Injectable()
export class PelanggaranService {
  constructor(private readonly prisma: PrismaService) {}

  private async binaan(user: JwtPayload): Promise<string[] | null> {
    if (user.role === 'SUPER_ADMIN' || user.role === 'GURU_BK') return null;
    if (!user.guruId || user.role !== 'WALI_KELAS') {
      throw new ForbiddenException('Hanya BK / wali kelas / admin');
    }
    const rows = await this.prisma.rombel.findMany({
      where: { waliKelasId: user.guruId, deletedAt: null },
      select: { id: true },
    });
    return rows.map((r) => r.id);
  }

  private async pastikanSiswaDalamScope(siswaId: string, allowed: string[] | null) {
    if (!allowed) return;
    const s = await this.prisma.siswa.findUnique({ where: { id: siswaId } });
    if (!s?.rombelId || !allowed.includes(s.rombelId)) {
      throw new ForbiddenException('Di luar kelas binaan Anda');
    }
  }

  async create(user: JwtPayload, dto: CreatePelanggaranDto) {
    if (!user.guruId) throw new ForbiddenException('Akun belum terhubung ke data guru');
    const allowed = await this.binaan(user);
    await this.pastikanSiswaDalamScope(dto.siswaId, allowed);
    const row = await this.prisma.pelanggaran.create({
      data: {
        siswaId: dto.siswaId,
        tanggal: new Date(`${dto.tanggal}T00:00:00.000Z`),
        kategori: dto.kategori,
        poin: dto.poin,
        keterangan: dto.keterangan,
        dicatatOleh: user.guruId,
      },
    });
    return { data: row };
  }

  async list(user: JwtPayload, query: QueryPelanggaranDto) {
    const allowed = await this.binaan(user);
    if (allowed && query.rombelId && !allowed.includes(query.rombelId)) {
      throw new ForbiddenException('Di luar kelas binaan Anda');
    }
    const { page, limit, skip } = pageParams({
      page: String(query.page ?? 1),
      limit: String(query.limit ?? 30),
    });
    const where = {
      ...(query.siswaId ? { siswaId: query.siswaId } : {}),
      ...(query.rombelId
        ? { siswa: { rombelId: query.rombelId } }
        : allowed
          ? { siswa: { rombelId: { in: allowed } } }
          : {}),
    };
    if (query.siswaId && allowed) {
      await this.pastikanSiswaDalamScope(query.siswaId, allowed);
    }
    const [rows, total] = await Promise.all([
      this.prisma.pelanggaran.findMany({
        where,
        skip,
        take: limit,
        orderBy: { tanggal: 'desc' },
        include: { siswa: { select: { id: true, nama: true } } },
      }),
      this.prisma.pelanggaran.count({ where }),
    ]);
    return { data: rows, meta: pageMeta(total, page, limit) };
  }

  /** Total poin 1 siswa — bahan pembinaan wali/BK. */
  async total(user: JwtPayload, siswaId: string) {
    const allowed = await this.binaan(user);
    await this.pastikanSiswaDalamScope(siswaId, allowed);
    const agg = await this.prisma.pelanggaran.aggregate({
      where: { siswaId },
      _sum: { poin: true },
      _count: { poin: true },
    });
    return { data: { siswaId, totalPoin: agg._sum.poin ?? 0, jumlahKasus: agg._count.poin } };
  }
}
