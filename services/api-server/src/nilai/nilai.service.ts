import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { pageMeta, pageParams } from '../common/pagination';
import { assertDapatInputMapel } from '../common/access';
import type { JwtPayload } from '../common/decorators/current-user.decorator';
import { NilaiBulkDto } from './dto/nilai-bulk.dto';
import { UpdateNilaiDto } from './dto/update-nilai.dto';
import { QueryNilaiDto } from './dto/query-nilai.dto';

/** Input nilai cepat per kelas+mapel (mobile) — 1 request bulk, retry aman. */
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
        const lama = await tx.nilai.findFirst({
          where: {
            siswaId: item.siswaId,
            mapelId: dto.mapelId,
            tahunAjaranId: dto.tahunAjaranId,
            semester: dto.semester,
            jenis: dto.jenis,
          },
        });
        if (lama) {
          await tx.nilai.update({ where: { id: lama.id }, data: { nilai: item.nilai } });
        } else {
          await tx.nilai.create({
            data: {
              siswaId: item.siswaId,
              mapelId: dto.mapelId,
              tahunAjaranId: dto.tahunAjaranId,
              semester: dto.semester,
              jenis: dto.jenis,
              nilai: item.nilai,
            },
          });
        }
        tersimpan += 1;
      }
    });
    return { data: { tersimpan } };
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
