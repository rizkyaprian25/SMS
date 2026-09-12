import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTahunAjaranDto, UpdateTahunAjaranDto } from './dto/tahun-ajaran.dto';
import type { JwtPayload } from '../common/decorators/current-user.decorator';

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

  async update(id: string, dto: UpdateTahunAjaranDto, user?: JwtPayload) {
    const existing = await this.prisma.tahunAjaran.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Tahun ajaran tidak ditemukan');

    const row = await this.prisma.tahunAjaran.update({
      where: { id },
      data: {
        ...(dto.nama ? { nama: dto.nama } : {}),
        ...(dto.semesterAktif ? { semesterAktif: dto.semesterAktif } : {}),
        ...(dto.tglMulai ? { tglMulai: new Date(dto.tglMulai) } : {}),
        ...(dto.tglSelesai ? { tglSelesai: new Date(dto.tglSelesai) } : {}),
      },
    });

    if (user?.sub) {
      await this.prisma.auditLog.create({
        data: {
          aksi: 'UPDATE_TAHUN_AJARAN',
          entitas: 'tahun_ajaran',
          entitasId: id,
          sebelum: { semesterAktif: existing.semesterAktif, nama: existing.nama },
          sesudah: { semesterAktif: row.semesterAktif, nama: row.nama },
          dilakukanOleh: user.sub,
        },
      });
    }

    return { data: row };
  }
}

