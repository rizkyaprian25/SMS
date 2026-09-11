import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTahunAjaranDto } from './dto/tahun-ajaran.dto';

/** Kecil: list untuk dropdown, create, aktifkan (hanya 1 aktif). */
@Injectable()
export class TahunAjaranService {
  constructor(private readonly prisma: PrismaService) {}

  async list() {
    const rows = await this.prisma.tahunAjaran.findMany({ orderBy: { tglMulai: 'desc' } });
    return { data: rows };
  }

  async aktif() {
    const row = await this.prisma.tahunAjaran.findFirst({ where: { isAktif: true } });
    return { data: row };
  }

  async create(dto: CreateTahunAjaranDto) {
    const ada = await this.prisma.tahunAjaran.findFirst({ where: { nama: dto.nama } });
    if (ada) throw new ConflictException('Tahun ajaran sudah ada');
    const row = await this.prisma.tahunAjaran.create({
      data: {
        nama: dto.nama,
        semesterAktif: dto.semesterAktif,
        tglMulai: new Date(dto.tglMulai),
        tglSelesai: new Date(dto.tglSelesai),
      },
    });
    return { data: row };
  }

  async aktifkan(id: string) {
    const ada = await this.prisma.tahunAjaran.findUnique({ where: { id } });
    if (!ada) throw new NotFoundException('Tahun ajaran tidak ditemukan');
    await this.prisma.$transaction(async (tx) => {
      await tx.tahunAjaran.updateMany({ where: { isAktif: true }, data: { isAktif: false } });
      await tx.tahunAjaran.update({ where: { id }, data: { isAktif: true } });
    });
    return { data: { id } };
  }
}
