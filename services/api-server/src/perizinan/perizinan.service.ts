import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { pageMeta, pageParams } from '../common/pagination';
import { HARI_DARI_JS } from '../common/hari';
import type { JwtPayload } from '../common/decorators/current-user.decorator';
import { CreatePerizinanDto, PutuskanIzinDto } from './dto/perizinan.dto';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';

/**
 * MVP: diajukan guru/wali mewakili (Fase 2: ortu langsung — kolom diajukan_oleh
 * sudah siap). Disetujui -> absensi IZIN/SAKIT otomatis per jadwal rombel.
 */
@Injectable()
export class PerizinanService {
  constructor(private readonly prisma: PrismaService) {}

  async ajukan(dto: CreatePerizinanDto) {
    const mulai = new Date(`${dto.tglMulai}T00:00:00.000Z`);
    const selesai = new Date(`${dto.tglSelesai}T00:00:00.000Z`);
    if (mulai > selesai) throw new BadRequestException('tgl_selesai sebelum tgl_mulai');
    const hari = Math.round((selesai.getTime() - mulai.getTime()) / 86400000) + 1;
    if (hari > 30) throw new BadRequestException('Maksimal 30 hari per pengajuan');
    const siswa = await this.prisma.siswa.findUnique({ where: { id: dto.siswaId } });
    if (!siswa || siswa.deletedAt) throw new NotFoundException('Siswa tidak ditemukan');
    const row = await this.prisma.perizinan.create({
      data: {
        siswaId: dto.siswaId,
        tglMulai: mulai,
        tglSelesai: selesai,
        jenis: dto.jenis,
        alasan: dto.alasan,
        lampiranUrl: dto.lampiranUrl,
      },
    });
    return { data: row };
  }

  async list(query: PaginationQueryDto & { status?: string; siswaId?: string }) {
    const { page, limit, skip } = pageParams({
      page: String(query.page ?? 1),
      limit: String(query.limit ?? 30),
    });
    const where = {
      ...(query.status ? { status: query.status as 'DIAJUKAN' | 'DISETUJUI' | 'DITOLAK' } : {}),
      ...(query.siswaId ? { siswaId: query.siswaId } : {}),
    };
    const [rows, total] = await Promise.all([
      this.prisma.perizinan.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { siswa: { select: { id: true, nama: true } } },
      }),
      this.prisma.perizinan.count({ where }),
    ]);
    return { data: rows, meta: pageMeta(total, page, limit) };
  }

  async putuskan(id: string, user: JwtPayload, dto: PutuskanIzinDto) {
    if (!user.guruId) throw new ForbiddenException('Akun belum terhubung ke data guru');
    const izin = await this.prisma.perizinan.findUnique({
      where: { id },
      include: { siswa: { include: { rombel: true } } },
    });
    if (!izin) throw new NotFoundException('Perizinan tidak ditemukan');
    if (izin.status !== 'DIAJUKAN') throw new ConflictException('Sudah diputuskan sebelumnya');
    // Wali hanya untuk kelas binaannya; admin boleh semua.
    if (user.role !== 'SUPER_ADMIN' && izin.siswa.rombel?.waliKelasId !== user.guruId) {
      throw new ForbiddenException('Hanya wali kelas ybs yang boleh memutuskan');
    }
    const status = dto.putusan === 'SETUJU' ? 'DISETUJUI' : 'DITOLAK';
    const hasil = await this.prisma.$transaction(async (tx) => {
      const baris = await tx.perizinan.update({
        where: { id },
        data: { status, diprosesOleh: user.guruId },
      });
      if (status === 'DISETUJUI' && izin.siswa.rombelId) {
        await this.tandaiAbsensi(tx, izin, user.guruId as string);
      }
      await tx.auditLog.create({
        data: {
          aksi: 'IZIN_DIPUTUSKAN',
          entitas: 'perizinan',
          entitasId: id,
          sebelum: { status: 'DIAJUKAN' },
          sesudah: { status, catatan: dto.catatan },
          dilakukanOleh: user.guruId as string,
        },
      });
      return baris;
    });
    return { data: hasil };
  }

  /** Setujui -> upsert absensi IZIN/SAKIT untuk tiap mapel terjadwal di rentang tanggal. */
  private async tandaiAbsensi(
    tx: Prisma.TransactionClient,
    izin: { siswaId: string; tglMulai: Date; tglSelesai: Date; jenis: 'IZIN' | 'SAKIT'; siswa: { rombelId: string | null } },
    guruId: string,
  ) {
    if (!izin.siswa.rombelId) return;
    for (
      let d = new Date(izin.tglMulai);
      d.getTime() <= izin.tglSelesai.getTime();
      d = new Date(d.getTime() + 86400000)
    ) {
      const hari = HARI_DARI_JS[d.getUTCDay()];
      if (!hari) continue;
      const jadwal = await tx.jadwal.findMany({
        where: { rombelId: izin.siswa.rombelId, hari },
      });
      for (const j of jadwal) {
        const unik = {
          siswaId: izin.siswaId,
          tanggal: new Date(d),
          mapelId: j.mapelId,
          jamKe: j.jamKe,
        };
        const lama = await tx.absensi.findUnique({
          where: { siswaId_tanggal_mapelId_jamKe: unik },
        });
        const isi = {
          ...unik,
          status: izin.jenis,
          keterangan: 'Perizinan disetujui',
          dicatatOleh: guruId,
          sumber: 'WEB' as const,
        };
        if (lama) await tx.absensi.update({ where: { id: lama.id }, data: isi });
        else await tx.absensi.create({ data: isi });
      }
    }
  }
}
