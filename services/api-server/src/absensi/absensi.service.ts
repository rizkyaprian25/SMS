import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { pageMeta, pageParams } from '../common/pagination';
import { awalHariUTC, hariIniUTC } from '../common/dates';
import { HARI_DARI_JS } from '../common/hari';
import { assertDapatInputMapel } from '../common/access';
import type { JwtPayload } from '../common/decorators/current-user.decorator';
import { AbsensiBulkDto } from './dto/absensi-bulk.dto';
import { QueryAbsensiDto, RekapAbsensiDto } from './dto/query-absensi.dto';
import { UpdateAbsensiDto } from './dto/update-absensi.dto';

/**
 * Alur inti MVP (docs/05): 1 request bulk untuk 1 kelas 1 mapel.
 * Upsert per (siswa, tanggal, mapel, jam_ke) agar retry offline aman (idempoten).
 */
@Injectable()
export class AbsensiService {
  constructor(private readonly prisma: PrismaService) {}

  async createBulk(user: JwtPayload, dto: AbsensiBulkDto) {
    await assertDapatInputMapel(this.prisma, {
      role: user.role,
      guruId: user.guruId,
      mapelId: dto.mapelId,
    });
    if (!user.guruId) throw new ForbiddenException('Akun belum terhubung ke data guru');
    const guruId = user.guruId;
    const tanggal = awalHariUTC(dto.tanggal);

    // Guru hanya input sesuai jadwalnya; di luar jadwal wajib alasan_override
    // (jam pengganti) yang tercatat di audit — docs/03.
    if (user.role !== 'SUPER_ADMIN' && !dto.alasanOverride) {
      const hari = HARI_DARI_JS[tanggal.getUTCDay()];
      const cocok = hari
        ? await this.prisma.jadwal.count({
            where: { guruId, mapelId: dto.mapelId, rombelId: dto.rombelId, hari },
          })
        : 0;
      if (!cocok) {
        throw new ForbiddenException(
          'Di luar jadwal mengajar Anda — isi alasan_override bila jam pengganti',
        );
      }
    }

    const ids = dto.items.map((i) => i.siswaId);
    const terdaftar = await this.prisma.siswa.count({ where: { id: { in: ids } } });
    if (terdaftar !== ids.length) {
      throw new BadRequestException('Ada siswa_id yang tidak dikenal');
    }

    let tersimpan = 0;
    await this.prisma.$transaction(async (tx) => {
      for (const item of dto.items) {
        const unik = {
          siswaId: item.siswaId,
          tanggal,
          mapelId: dto.mapelId,
          jamKe: dto.jamKe,
        };
        const lama = await tx.absensi.findUnique({
          where: { siswaId_tanggal_mapelId_jamKe: unik },
        });
        const isi = {
          siswaId: item.siswaId,
          tanggal,
          mapelId: dto.mapelId,
          jamKe: dto.jamKe,
          status: item.status,
          keterangan: item.keterangan,
          dicatatOleh: guruId,
          sumber: 'MOBILE' as const,
          alasanOverride: dto.alasanOverride,
        };
        if (lama) {
          const baru = await tx.absensi.update({ where: { id: lama.id }, data: isi });
          await tx.auditLog.create({
            data: {
              aksi: 'ABSENSI_UBAH',
              entitas: 'absensi',
              entitasId: lama.id,
              sebelum: { status: lama.status },
              sesudah: { status: baru.status },
              dilakukanOleh: guruId,
            },
          });
        } else {
          await tx.absensi.create({ data: isi });
        }
        tersimpan += 1;
      }
    });
    // TODO: enqueue notifikasi untuk IZIN/SAKIT/ALPA (docs/10).
    return { data: { tersimpan, tanggal: dto.tanggal } };
  }

  async list(query: QueryAbsensiDto) {
    const { page, limit, skip } = pageParams({
      page: String(query.page ?? 1),
      limit: String(query.limit ?? 50),
    });
    const where = {
      ...(query.tanggal ? { tanggal: awalHariUTC(query.tanggal) } : {}),
      ...(query.mapelId ? { mapelId: query.mapelId } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.rombelId ? { siswa: { rombelId: query.rombelId } } : {}),
    };
    const [rows, total] = await Promise.all([
      this.prisma.absensi.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ tanggal: 'desc' }, { jamKe: 'asc' }],
        include: {
          siswa: { select: { id: true, nama: true } },
          mapel: { select: { id: true, nama: true } },
        },
      }),
      this.prisma.absensi.count({ where }),
    ]);
    return { data: rows, meta: pageMeta(total, page, limit) };
  }

  /** Agregasi di server — client dilarang hitung 1000 baris di browser/HP. */
  async rekap(q: RekapAbsensiDto) {
    const where = {
      ...(q.rombelId ? { siswa: { rombelId: q.rombelId } } : {}),
      ...(q.mapelId ? { mapelId: q.mapelId } : {}),
      ...(q.dari || q.sampai
        ? {
            tanggal: {
              ...(q.dari ? { gte: awalHariUTC(q.dari) } : {}),
              ...(q.sampai ? { lte: awalHariUTC(q.sampai) } : {}),
            },
          }
        : {}),
    };
    const grup = await this.prisma.absensi.groupBy({
      by: ['status'],
      where,
      _count: { status: true },
    });
    return { data: grup.map((g) => ({ status: g.status, jumlah: g._count.status })) };
  }

  /** Edit hari-H oleh pencatatnya sendiri; lewat hari itu hanya SUPER_ADMIN. Selalu audit. */
  async update(id: string, user: JwtPayload, dto: UpdateAbsensiDto) {
    const lama = await this.prisma.absensi.findUnique({ where: { id } });
    if (!lama) throw new NotFoundException('Absensi tidak ditemukan');
    if (lama.tanggal.getTime() !== hariIniUTC().getTime() && user.role !== 'SUPER_ADMIN') {
      throw new ForbiddenException('Hanya bisa diubah di hari yang sama');
    }
    if (!user.guruId) throw new ForbiddenException('Akun belum terhubung ke data guru');
    if (user.role !== 'SUPER_ADMIN' && lama.dicatatOleh !== user.guruId) {
      throw new ForbiddenException('Hanya pencatatnya yang boleh mengubah');
    }
    const baru = await this.prisma.absensi.update({ where: { id }, data: dto });
    await this.prisma.auditLog.create({
      data: {
        aksi: 'ABSENSI_UBAH',
        entitas: 'absensi',
        entitasId: id,
        sebelum: { status: lama.status },
        sesudah: { status: baru.status },
        dilakukanOleh: user.guruId,
      },
    });
    return { data: baru };
  }
}
