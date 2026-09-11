import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { pageMeta, pageParams } from '../common/pagination';
import { CreateJadwalDto } from './dto/create-jadwal.dto';
import { QueryJadwalDto } from './dto/query-jadwal.dto';

/**
 * Deteksi bentrok di SERVICE (bukan cuma constraint DB):
 * guru tidak boleh 2 rombel overlap; rombel tidak boleh 2 mapel overlap.
 * Kembalikan detail bentrok agar UI bisa tawarkan slot lain (docs/04).
 */
@Injectable()
export class JadwalService {
  constructor(private readonly prisma: PrismaService) {}

  /** "07:30" -> Date dengan porsi jam untuk kolom @db.Time. */
  toTime(hhmm: string): Date {
    return new Date(`1970-01-01T${hhmm}:00.000Z`);
  }

  private overlap(a1: Date, a2: Date, b1: Date, b2: Date): boolean {
    return a1 < b2 && b1 < a2;
  }

  private async pastikanTidakBentrok(dto: CreateJadwalDto, kecualiId?: string) {
    const mulai = this.toTime(dto.jamMulai);
    const selesai = this.toTime(dto.jamSelesai);
    if (mulai >= selesai) throw new BadRequestException('jam_selesai harus setelah jam_mulai');
    const kandidat = await this.prisma.jadwal.findMany({
      where: {
        hari: dto.hari,
        OR: [{ guruId: dto.guruId }, { rombelId: dto.rombelId }],
      },
      include: {
        rombel: { select: { nama: true } },
        mapel: { select: { nama: true } },
        guru: { select: { nama: true } },
      },
    });
    for (const j of kandidat) {
      if (kecualiId && j.id === kecualiId) continue;
      if (!this.overlap(mulai, selesai, j.jamMulai, j.jamSelesai)) continue;
      if (j.guruId === dto.guruId) {
        throw new ConflictException(
          `Bentrok: ${j.guru.nama} sudah mengajar ${j.mapel.nama} di ${j.rombel.nama} jam yang sama`,
        );
      }
      throw new ConflictException(
        `Bentrok: ${j.rombel.nama} sudah ada ${j.mapel.nama} jam yang sama`,
      );
    }
    return { mulai, selesai };
  }

  async list(query: QueryJadwalDto) {
    const { page, limit, skip } = pageParams({
      page: String(query.page ?? 1),
      limit: String(query.limit ?? 50),
    });
    const where = {
      ...(query.rombelId ? { rombelId: query.rombelId } : {}),
      ...(query.guruId ? { guruId: query.guruId } : {}),
      ...(query.hari ? { hari: query.hari } : {}),
    };
    const [rows, total] = await Promise.all([
      this.prisma.jadwal.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ hari: 'asc' }, { jamMulai: 'asc' }],
        include: {
          rombel: { select: { id: true, nama: true } },
          mapel: { select: { id: true, nama: true } },
          guru: { select: { id: true, nama: true } },
        },
      }),
      this.prisma.jadwal.count({ where }),
    ]);
    return { data: rows, meta: pageMeta(total, page, limit) };
  }

  /** Jadwal guru login — dipakai mobile (GET /jadwal-saya?hari=). */
  jadwalSaya(guruId: string, hari?: QueryJadwalDto['hari']) {
    return this.prisma.jadwal.findMany({
      where: { guruId, ...(hari ? { hari } : {}) },
      orderBy: [{ hari: 'asc' }, { jamMulai: 'asc' }],
      include: {
        rombel: { select: { id: true, nama: true } },
        mapel: { select: { id: true, nama: true } },
      },
    }).then((rows) => ({ data: rows }));
  }

  async create(dto: CreateJadwalDto) {
    const { mulai, selesai } = await this.pastikanTidakBentrok(dto);
    const row = await this.prisma.jadwal.create({
      data: {
        rombelId: dto.rombelId,
        mapelId: dto.mapelId,
        guruId: dto.guruId,
        hari: dto.hari,
        jamMulai: mulai,
        jamSelesai: selesai,
        jamKe: dto.jamKe ?? 1,
      },
    });
    return { data: row };
  }

  async remove(id: string) {
    const lama = await this.prisma.jadwal.findUnique({ where: { id } });
    if (!lama) throw new NotFoundException('Jadwal tidak ditemukan');
    await this.prisma.jadwal.delete({ where: { id } });
    return { data: { id } };
  }
}
