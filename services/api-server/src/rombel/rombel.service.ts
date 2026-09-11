import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { pageMeta, pageParams } from '../common/pagination';
import type { JwtPayload } from '../common/decorators/current-user.decorator';
import { CreateRombelDto } from './dto/create-rombel.dto';
import { QueryRombelDto, QueryRombelSiswaDto } from './dto/query-rombel.dto';
import { UpdateRombelDto } from './dto/update-rombel.dto';
import { NaikKelasDto } from './dto/naik-kelas.dto';

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

  /** Daftar siswa 1 rombel + (opsional) status absensi hari itu — dipakai layar absensi mobile. */
  async siswa(id: string, q: QueryRombelSiswaDto) {
    const rombel = await this.prisma.rombel.findUnique({ where: { id } });
    if (!rombel || rombel.deletedAt) throw new NotFoundException('Rombel tidak ditemukan');
    const daftar = await this.prisma.siswa.findMany({
      where: { rombelId: id, deletedAt: null },
      orderBy: { nama: 'asc' },
      select: { id: true, nama: true, fotoUrl: true },
    });
    const absensi: Record<string, string> = {};
    if (q.tanggal) {
      const rows = await this.prisma.absensi.findMany({
        where: {
          siswaId: { in: daftar.map((s) => s.id) },
          tanggal: new Date(`${q.tanggal}T00:00:00.000Z`),
        },
        select: { siswaId: true, status: true },
      });
      for (const r of rows) absensi[r.siswaId] = r.status;
    }
    return { data: { rombel: { id: rombel.id, nama: rombel.nama }, siswa: daftar, absensi } };
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

  /**
   * Kenaikan kelas massal (docs/02 + docs/11): preview dulu (?preview=true),
   * eksekusi dalam 1 transaction + riwayat_kelas per siswa + 1 audit.
   * Histori nilai/absensi tahun lama tidak disentuh.
   */
  async naikKelas(user: JwtPayload, dto: NaikKelasDto, preview: boolean) {
    if (!user.guruId) throw new ForbiddenException('Akun belum terhubung ke data guru');
    const keTahun = await this.prisma.tahunAjaran.findUnique({ where: { id: dto.keTahunId } });
    if (!keTahun) throw new NotFoundException('Tahun ajaran tujuan tidak ditemukan');

    const rombelBaruIds = [...new Set(dto.mapping.map((m) => m.rombelBaruId))];
    const rombels = await this.prisma.rombel.findMany({
      where: { id: { in: rombelBaruIds } },
      select: { id: true, nama: true, tahunAjaranId: true, deletedAt: true },
    });
    const peta = new Map(rombels.map((r) => [r.id, r]));
    for (const id of rombelBaruIds) {
      const r = peta.get(id);
      if (!r || r.deletedAt) throw new NotFoundException(`Rombel tujuan ${id} tidak ditemukan`);
      if (r.tahunAjaranId !== dto.keTahunId) {
        throw new BadRequestException(`Rombel ${r.nama} bukan milik tahun ajaran tujuan`);
      }
    }

    const siswaIds = [...new Set(dto.mapping.map((m) => m.siswaId))];
    const siswas = await this.prisma.siswa.findMany({
      where: { id: { in: siswaIds } },
      select: { id: true, nama: true, rombelId: true },
    });
    if (siswas.length !== siswaIds.length) {
      throw new BadRequestException('Ada siswa_id yang tidak dikenal');
    }
    const lamaMap = new Map(siswas.map((s) => [s.id, s.rombelId]));

    if (preview) {
      const perRombel = new Map<string, { nama: string; jumlah: number }>();
      for (const m of dto.mapping) {
        const r = peta.get(m.rombelBaruId);
        if (!r) continue;
        const e = perRombel.get(r.id) ?? { nama: r.nama, jumlah: 0 };
        e.jumlah += 1;
        perRombel.set(r.id, e);
      }
      return {
        data: {
          total: dto.mapping.length,
          perRombel: [...perRombel.entries()].map(([id, e]) => ({ rombelId: id, ...e })),
        },
      };
    }

    await this.prisma.$transaction(async (tx) => {
      for (const m of dto.mapping) {
        await tx.siswa.update({ where: { id: m.siswaId }, data: { rombelId: m.rombelBaruId } });
        await tx.riwayatKelas.create({
          data: {
            siswaId: m.siswaId,
            rombelLamaId: lamaMap.get(m.siswaId) ?? undefined,
            rombelBaruId: m.rombelBaruId,
            tahunAjaranId: dto.keTahunId,
            diprosesOleh: user.guruId as string,
          },
        });
      }
      await tx.auditLog.create({
        data: {
          aksi: 'KENAIKAN_KELAS',
          entitas: 'tahun_ajaran',
          entitasId: dto.keTahunId,
          sebelum: { dariTahunId: dto.dariTahunId },
          sesudah: { total: dto.mapping.length },
          dilakukanOleh: user.guruId as string,
        },
      });
    });
    return { data: { dipindahkan: dto.mapping.length } };
  }
}
