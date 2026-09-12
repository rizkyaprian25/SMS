import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { pageMeta, pageParams } from '../common/pagination';import type { JwtPayload } from '../common/decorators/current-user.decorator';
import { CreateSiswaDto } from './dto/create-siswa.dto';
import { QuerySiswaDto } from './dto/query-siswa.dto';
import { UpdateSiswaDto } from './dto/update-siswa.dto';

/**
 * Scope baca mengikuti docs/08: ADMIN/KEPSEK semua, WALI kelas binaan,
 * GURU_MAPEL hanya rombel yang diajar. Penolakan di sini, bukan di UI.
 */
@Injectable()
export class SiswaService {
  constructor(private readonly prisma: PrismaService) {}

  private async rombelDiizinkan(user: JwtPayload): Promise<string[] | null> {
    if (user.role === 'SUPER_ADMIN' || user.role === 'KEPALA_SEKOLAH') return null;
    if (!user.guruId) throw new ForbiddenException('Akun belum terhubung ke data guru');
    if (user.role === 'WALI_KELAS') {
      const binaan = await this.prisma.rombel.findMany({
        where: { waliKelasId: user.guruId, deletedAt: null },
        select: { id: true },
      });
      return binaan.map((b) => b.id);
    }
    const jd = await this.prisma.jadwal.findMany({
      where: { guruId: user.guruId },
      select: { rombelId: true },
      distinct: ['rombelId'],
    });
    return jd.map((j) => j.rombelId);
  }

  async list(query: QuerySiswaDto, user: JwtPayload) {
    const allowed = await this.rombelDiizinkan(user);
    if (allowed && query.rombelId && !allowed.includes(query.rombelId)) {
      throw new ForbiddenException('Di luar kelas yang Anda ampu');
    }
    const { page, limit, skip } = pageParams({
      page: String(query.page ?? 1),
      limit: String(query.limit ?? 30),
    });
    const where = {
      deletedAt: null,
      ...(query.rombelId
        ? { rombelId: query.rombelId }
        : allowed
          ? { rombelId: { in: allowed } }
          : {}),
      ...(query.q
        ? { OR: [{ nama: { contains: query.q, mode: 'insensitive' as const } }, { nisn: { contains: query.q } }] }
        : {}),
    };
    const [rows, total] = await Promise.all([
      this.prisma.siswa.findMany({
        where,
        skip,
        take: limit,
        orderBy: { nama: 'asc' },
        // NISN dimask di list (lihat docs/02): kembalikan 4 digit terakhir saja.
        select: {
          id: true,
          nisn: true,
          nama: true,
          rombelId: true,
          jenisKelamin: true,
          fotoUrl: true,
          isAktif: true,
          rombel: { select: { id: true, nama: true } },
        },
      }),
      this.prisma.siswa.count({ where }),
    ]);
    return { data: rows, meta: pageMeta(total, page, limit) };
  }

  async detail(id: string, user: JwtPayload) {
    const row = await this.prisma.siswa.findUnique({
      where: { id },
      include: {
        rombel: {
          select: {
            id: true,
            nama: true,
            kapasitas: true,
            waliKelas: { select: { id: true, nama: true, nip: true, fotoUrl: true } },
            jadwal: {
              select: {
                mapel: { select: { id: true, kode: true, nama: true, kelompok: true } },
                guru: { select: { id: true, nama: true, nip: true, fotoUrl: true } },
              },
              orderBy: { mapel: { nama: 'asc' } },
            },
          },
        },
      },
    });
    if (!row || row.deletedAt) throw new NotFoundException('Siswa tidak ditemukan');
    const allowed = await this.rombelDiizinkan(user);
    if (allowed && (!row.rombelId || !allowed.includes(row.rombelId))) {
      throw new ForbiddenException('Di luar kelas yang Anda ampu');
    }

    let guruPengajar: Array<{ mapel: any; guru: any; slotCount: number }> = [];
    if (row.rombel?.jadwal) {
      const map = new Map<string, { mapel: any; guru: any; slotCount: number }>();
      for (const j of row.rombel.jadwal) {
        const key = `${j.mapel.id}-${j.guru.id}`;
        if (!map.has(key)) {
          map.set(key, { mapel: j.mapel, guru: j.guru, slotCount: 1 });
        } else {
          map.get(key)!.slotCount++;
        }
      }
      guruPengajar = Array.from(map.values());
    }

    return {
      data: {
        ...row,
        rombel: row.rombel
          ? {
              id: row.rombel.id,
              nama: row.rombel.nama,
              kapasitas: (row.rombel as any).kapasitas,
              waliKelas: row.rombel.waliKelas,
              guruPengajar,
            }
          : null,
      },
    };
  }

  async create(dto: CreateSiswaDto) {
    const ada = await this.prisma.siswa.findUnique({ where: { nisn: dto.nisn } });
    if (ada) throw new ConflictException('NISN sudah terdaftar');
    const row = await this.prisma.siswa.create({
      data: {
        nisn: dto.nisn,
        nama: dto.nama,
        rombelId: dto.rombelId,
        jenisKelamin: dto.jenisKelamin,
        tglLahir: dto.tglLahir ? new Date(dto.tglLahir) : undefined,
        fotoUrl: dto.fotoUrl,
        dataOrtu: (dto.dataOrtu ?? undefined) as Prisma.InputJsonValue | undefined,
      },
    });
    return { data: row };
  }

  async update(id: string, dto: UpdateSiswaDto) {
    const lama = await this.prisma.siswa.findUnique({ where: { id } });
    if (!lama || lama.deletedAt) throw new NotFoundException('Siswa tidak ditemukan');
    const row = await this.prisma.siswa.update({
      where: { id },
      data: {
        ...dto,
        rombelId: dto.rombelId ?? undefined,
        tglLahir: dto.tglLahir ? new Date(dto.tglLahir) : undefined,
        dataOrtu: (dto.dataOrtu ?? undefined) as Prisma.InputJsonValue | undefined,
      },
    });
    // Pindah rombel wajib catat riwayat — dilakukan modul kenaikan-kelas / endpoint khusus (TODO).
    return { data: row };
  }

  /** Arsip = soft-delete. Nilai & absensi historis tetap utuh. */
  async archive(id: string) {
    const lama = await this.prisma.siswa.findUnique({ where: { id } });
    if (!lama || lama.deletedAt) throw new NotFoundException('Siswa tidak ditemukan');
    const row = await this.prisma.siswa.update({
      where: { id },
      data: { deletedAt: new Date(), isAktif: false },
    });
    return { data: row };
  }
}
