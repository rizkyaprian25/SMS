import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { assertDapatInputMapel } from '../common/access';
import { pageMeta, pageParams } from '../common/pagination';
import type { JwtPayload } from '../common/decorators/current-user.decorator';
import { CreateTugasDto } from './dto/create-tugas.dto';
import { QueryTugasDto } from './dto/query-tugas.dto';
import { KumpulTugasDto } from './dto/kumpul-tugas.dto';
import { NilaiTugasDto } from './dto/nilai-tugas.dto';

@Injectable()
export class TugasService {
  constructor(private readonly prisma: PrismaService) {}

  async create(user: JwtPayload, dto: CreateTugasDto) {
    await assertDapatInputMapel(this.prisma, {
      role: user.role,
      guruId: user.guruId,
      mapelId: dto.mapelId,
    });
    if (!user.guruId) throw new ForbiddenException('Akun belum terhubung ke data guru');

    const rombel = await this.prisma.rombel.findUnique({ where: { id: dto.rombelId } });
    if (!rombel) throw new NotFoundException('Rombel tidak ditemukan');

    const created = await this.prisma.tugas.create({
      data: {
        rombelId: dto.rombelId,
        mapelId: dto.mapelId,
        guruId: user.guruId,
        judul: dto.judul,
        deskripsi: dto.deskripsi,
        tenggatWaktu: new Date(dto.tenggatWaktu),
        fileUrl: dto.fileUrl,
      },
      include: {
        rombel: { select: { id: true, nama: true } },
        mapel: { select: { id: true, nama: true, kode: true } },
        guru: { select: { id: true, nama: true } },
      },
    });

    return { data: created };
  }

  async list(user: JwtPayload, q: QueryTugasDto) {
    const { page, limit, skip } = pageParams({
      page: String(q.page ?? 1),
      limit: String(q.limit ?? 30),
    });
    const where: Prisma.TugasWhereInput = {};
    if (q.rombelId) where.rombelId = q.rombelId;
    if (q.mapelId) where.mapelId = q.mapelId;
    if (q.q) {
      where.OR = [
        { judul: { contains: q.q, mode: 'insensitive' } },
        { deskripsi: { contains: q.q, mode: 'insensitive' } },
      ];
    }

    if (user.role === 'SISWA') {
      if (!user.siswaId) throw new ForbiddenException('Akun belum terhubung ke data siswa');
      const siswa = await this.prisma.siswa.findUnique({ where: { id: user.siswaId } });
      if (siswa?.rombelId) {
        where.rombelId = siswa.rombelId;
      }
    }

    const [total, data] = await Promise.all([
      this.prisma.tugas.count({ where }),
      this.prisma.tugas.findMany({
        where,
        skip,
        take: limit,
        orderBy: { tenggatWaktu: 'asc' },
        include: {
          rombel: { select: { id: true, nama: true } },
          mapel: { select: { id: true, nama: true, kode: true } },
          guru: { select: { id: true, nama: true } },
          _count: { select: { pengumpulan: true } },
        },
      }),
    ]);

    return { data, meta: pageMeta(total, page, limit) };
  }

  async detail(id: string) {
    const tugas = await this.prisma.tugas.findUnique({
      where: { id },
      include: {
        rombel: { select: { id: true, nama: true } },
        mapel: { select: { id: true, nama: true, kode: true } },
        guru: { select: { id: true, nama: true } },
      },
    });
    if (!tugas) throw new NotFoundException('Tugas tidak ditemukan');
    return { data: tugas };
  }

  async kumpul(user: JwtPayload, tugasId: string, dto: KumpulTugasDto) {
    if (!user.siswaId) throw new ForbiddenException('Hanya akun siswa yang dapat mengumpulkan tugas');
    const tugas = await this.prisma.tugas.findUnique({ where: { id: tugasId } });
    if (!tugas) throw new NotFoundException('Tugas tidak ditemukan');

    const siswa = await this.prisma.siswa.findUnique({ where: { id: user.siswaId } });
    if (!siswa || siswa.rombelId !== tugas.rombelId) {
      throw new ForbiddenException('Anda bukan siswa di kelas penugasan ini');
    }

    const pengumpulan = await this.prisma.pengumpulanTugas.upsert({
      where: { tugasId_siswaId: { tugasId, siswaId: user.siswaId } },
      create: {
        tugasId,
        siswaId: user.siswaId,
        fileUrl: dto.fileUrl,
        catatan: dto.catatan,
      },
      update: {
        fileUrl: dto.fileUrl,
        catatan: dto.catatan,
        dikumpulkanPada: new Date(),
      },
      include: {
        siswa: { select: { id: true, nama: true, nisn: true } },
      },
    });

    return { data: pengumpulan };
  }

  async listPengumpulan(user: JwtPayload, tugasId: string) {
    const tugas = await this.prisma.tugas.findUnique({ where: { id: tugasId } });
    if (!tugas) throw new NotFoundException('Tugas tidak ditemukan');

    if (user.role !== 'SUPER_ADMIN' && user.guruId !== tugas.guruId) {
      throw new ForbiddenException('Hanya guru pembuat tugas yang dapat melihat daftar pengumpulan');
    }

    const data = await this.prisma.pengumpulanTugas.findMany({
      where: { tugasId },
      orderBy: { dikumpulkanPada: 'asc' },
      include: {
        siswa: { select: { id: true, nama: true, nisn: true } },
      },
    });

    return { data };
  }

  async beriNilai(user: JwtPayload, pengumpulanId: string, dto: NilaiTugasDto) {
    const pengumpulan = await this.prisma.pengumpulanTugas.findUnique({
      where: { id: pengumpulanId },
      include: { tugas: true },
    });
    if (!pengumpulan) throw new NotFoundException('Data pengumpulan tidak ditemukan');

    if (user.role !== 'SUPER_ADMIN' && user.guruId !== pengumpulan.tugas.guruId) {
      throw new ForbiddenException('Hanya guru pengampu tugas ini yang dapat memberi nilai');
    }

    const updated = await this.prisma.pengumpulanTugas.update({
      where: { id: pengumpulanId },
      data: {
        nilai: dto.nilai,
        catatanGuru: dto.catatanGuru,
        dinilaiPada: new Date(),
      },
      include: {
        siswa: { select: { id: true, nama: true, nisn: true } },
      },
    });

    return { data: updated };
  }
}
