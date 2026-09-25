import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { pageMeta, pageParams } from '../common/pagination';
import { assertDapatInputMapel } from '../common/access';
import type { JwtPayload } from '../common/decorators/current-user.decorator';
import { NilaiBulkDto } from './dto/nilai-bulk.dto';
import { UpdateNilaiDto } from './dto/update-nilai.dto';
import { QueryNilaiDto } from './dto/query-nilai.dto';
import { QueryBobotNilaiDto, UpsertBobotNilaiDto } from './dto/bobot-nilai.dto';

/** Input nilai cepat per kelas+mapel (mobile & web) — 1 request bulk, retry aman. */
@Injectable()
export class NilaiService {
  constructor(private readonly prisma: PrismaService) {}

  async createBulk(user: JwtPayload, dto: NilaiBulkDto) {
    await assertDapatInputMapel(this.prisma, {
      role: user.role,
      guruId: user.guruId,
      mapelId: dto.mapelId,
    });
    if (!user.guruId) throw new ForbiddenException('Akun belum terhubung ke data guru');
    const ids = dto.items.map((i) => i.siswaId);
    const terdaftar = await this.prisma.siswa.count({ where: { id: { in: ids } } });
    if (terdaftar !== ids.length) {
      throw new BadRequestException('Ada siswa_id yang tidak dikenal');
    }
    let tersimpan = 0;
    await this.prisma.$transaction(async (tx) => {
      for (const item of dto.items) {
        const whereClause = {
          siswaId: item.siswaId,
          mapelId: dto.mapelId,
          tahunAjaranId: dto.tahunAjaranId,
          semester: dto.semester,
          jenis: dto.jenis,
          ...(dto.judul ? { judul: dto.judul } : {}),
        };
        const lama = await tx.nilai.findFirst({
          where: whereClause,
        });
        if (lama) {
          await tx.nilai.update({
            where: { id: lama.id },
            data: {
              nilai: item.nilai,
              ...(dto.judul ? { judul: dto.judul } : {}),
            },
          });
        } else {
          await tx.nilai.create({
            data: {
              siswaId: item.siswaId,
              mapelId: dto.mapelId,
              tahunAjaranId: dto.tahunAjaranId,
              semester: dto.semester,
              jenis: dto.jenis,
              judul: dto.judul ?? null,
              nilai: item.nilai,
            },
          });
        }
        tersimpan += 1;
      }
    });
    return { data: { tersimpan } };
  }

  async getBobot(query: QueryBobotNilaiDto, user?: JwtPayload) {
    let tahunAjaranId = query.tahunAjaranId;
    if (!tahunAjaranId) {
      const aktif = await this.prisma.tahunAjaran.findFirst({ where: { isAktif: true } });
      tahunAjaranId = aktif?.id;
    }
    if (!tahunAjaranId) {
      return {
        data: {
          mapelId: query.mapelId,
          tahunAjaranId: '',
          bobotTugas: 20,
          bobotHarian: 30,
          bobotUts: 25,
          bobotUas: 25,
        },
      };
    }

    const guruId = query.guruId ?? user?.guruId;
    const found = await this.prisma.bobotNilai.findFirst({
      where: {
        mapelId: query.mapelId,
        tahunAjaranId,
        ...(guruId ? { OR: [{ guruId }, { guruId: null }] } : {}),
      },
      orderBy: { guruId: 'asc' },
    });

    if (found) {
      return { data: found };
    }

    return {
      data: {
        mapelId: query.mapelId,
        tahunAjaranId,
        guruId: guruId ?? null,
        bobotTugas: 20,
        bobotHarian: 30,
        bobotUts: 25,
        bobotUas: 25,
      },
    };
  }

  async upsertBobot(user: JwtPayload, dto: UpsertBobotNilaiDto) {
    const total = dto.bobotTugas + dto.bobotHarian + dto.bobotUts + dto.bobotUas;
    if (total !== 100) {
      throw new BadRequestException(`Total bobot penilaian harus berjumlah 100% (saat ini ${total}%)`);
    }

    await assertDapatInputMapel(this.prisma, {
      role: user.role,
      guruId: user.guruId,
      mapelId: dto.mapelId,
    });

    const targetGuruId = user.role === 'SUPER_ADMIN' ? (dto.guruId ?? user.guruId ?? null) : (user.guruId ?? null);

    const existing = await this.prisma.bobotNilai.findFirst({
      where: {
        mapelId: dto.mapelId,
        tahunAjaranId: dto.tahunAjaranId,
        guruId: targetGuruId,
      },
    });

    if (existing) {
      const updated = await this.prisma.bobotNilai.update({
        where: { id: existing.id },
        data: {
          bobotTugas: dto.bobotTugas,
          bobotHarian: dto.bobotHarian,
          bobotUts: dto.bobotUts,
          bobotUas: dto.bobotUas,
        },
      });
      return { data: updated };
    }

    const created = await this.prisma.bobotNilai.create({
      data: {
        mapelId: dto.mapelId,
        tahunAjaranId: dto.tahunAjaranId,
        guruId: targetGuruId,
        bobotTugas: dto.bobotTugas,
        bobotHarian: dto.bobotHarian,
        bobotUts: dto.bobotUts,
        bobotUas: dto.bobotUas,
      },
    });
    return { data: created };
  }

  async list(query: QueryNilaiDto) {
    const { page, limit, skip } = pageParams({
      page: String(query.page ?? 1),
      limit: String(query.limit ?? 50),
    });
    const where = {
      ...(query.mapelId ? { mapelId: query.mapelId } : {}),
      ...(query.semester ? { semester: query.semester } : {}),
      ...(query.jenis ? { jenis: query.jenis } : {}),
      ...(query.rombelId ? { siswa: { rombelId: query.rombelId } } : {}),
    };
    const [rows, total] = await Promise.all([
      this.prisma.nilai.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          siswa: { select: { id: true, nama: true } },
          mapel: { select: { id: true, nama: true } },
        },
      }),
      this.prisma.nilai.count({ where }),
    ]);
    return { data: rows, meta: pageMeta(total, page, limit) };
  }

  async update(id: string, user: JwtPayload, dto: UpdateNilaiDto) {
    const lama = await this.prisma.nilai.findUnique({ where: { id } });
    if (!lama) throw new NotFoundException('Data nilai tidak ditemukan');

    await assertDapatInputMapel(this.prisma, {
      role: user.role,
      guruId: user.guruId,
      mapelId: lama.mapelId,
    });

    const row = await this.prisma.nilai.update({
      where: { id },
      data: {
        nilai: dto.nilai,
      },
    });
    return { data: row };
  }
}
