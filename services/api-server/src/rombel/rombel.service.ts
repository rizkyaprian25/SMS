import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { pageMeta, pageParams } from '../common/pagination';
import { CreateRombelDto } from './dto/create-rombel.dto';
import { QueryRombelDto } from './dto/query-rombel.dto';
import { UpdateRombelDto } from './dto/update-rombel.dto';

/**
 * Modul CONTOH pola scalable: controller tipis, semua aturan di sini.
 * Tiru untuk domain lain (siswa, jadwal, absensi, ...).
 */
@Injectable()
export class RombelService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: QueryRombelDto) {
    const { page, limit, skip } = pageParams({
      page: String(query.page ?? 1),
      limit: String(query.limit ?? 30),
    });
    const where = {
      deletedAt: null,
      ...(query.tahunAjaranId ? { tahunAjaranId: query.tahunAjaranId } : {}),
      ...(query.tingkatId ? { tingkatId: query.tingkatId } : {}),
      ...(query.q ? { nama: { contains: query.q, mode: 'insensitive' as const } } : {}),
    };
    const [rows, total] = await Promise.all([
      this.prisma.rombel.findMany({
        where,
        skip,
        take: limit,
        orderBy: { nama: 'asc' },
        include: { tingkat: true, waliKelas: { select: { id: true, nama: true } } },
      }),
      this.prisma.rombel.count({ where }),
    ]);
    return { data: rows, meta: pageMeta(total, page, limit) };
  }

  async create(dto: CreateRombelDto) {
    const ada = await this.prisma.rombel.findUnique({
      where: { tahunAjaranId_nama: { tahunAjaranId: dto.tahunAjaranId, nama: dto.nama } },
    });
    if (ada) throw new ConflictException(`Rombel ${dto.nama} sudah ada di tahun ajaran ini`);
    const row = await this.prisma.rombel.create({
      data: {
        tingkatId: dto.tingkatId,
        tahunAjaranId: dto.tahunAjaranId,
        nama: dto.nama,
        waliKelasId: dto.waliKelasId,
        kapasitas: dto.kapasitas ?? 32,
      },
    });
    return { data: row };
  }

  async update(id: string, dto: UpdateRombelDto) {
    const lama = await this.prisma.rombel.findUnique({ where: { id } });
    if (!lama || lama.deletedAt) throw new NotFoundException('Rombel tidak ditemukan');
    if (dto.nama && dto.nama !== lama.nama) {
      const bentrok = await this.prisma.rombel.findUnique({
        where: { tahunAjaranId_nama: { tahunAjaranId: lama.tahunAjaranId, nama: dto.nama } },
      });
      if (bentrok) throw new ConflictException(`Rombel ${dto.nama} sudah ada di tahun ajaran ini`);
    }
    const row = await this.prisma.rombel.update({ where: { id }, data: dto });
    // TODO: tulis audit_log (sebelum/sesudah) — lihat docs/02.
    return { data: row };
  }

  /** Arsip = soft-delete. Histori siswa di rombel ini tetap utuh. */
  async archive(id: string) {
    const lama = await this.prisma.rombel.findUnique({ where: { id } });
    if (!lama || lama.deletedAt) throw new NotFoundException('Rombel tidak ditemukan');
    const row = await this.prisma.rombel.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
    return { data: row };
  }
}
