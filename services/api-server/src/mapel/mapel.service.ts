import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateMapelDto, UpdateMapelDto } from './dto/mapel.dto';

/** Kecil dan stabil — list boleh dibaca semua role login (untuk dropdown). */
@Injectable()
export class MapelService {
  constructor(private readonly prisma: PrismaService) {}

  async list() {
    const rows = await this.prisma.mapel.findMany({
      orderBy: { nama: 'asc' },
      include: {
        _count: {
          select: { diampu: true, jadwal: true },
        },
      },
    });
    return { data: rows };
  }

  async create(dto: CreateMapelDto) {
    const ada = await this.prisma.mapel.findUnique({ where: { kode: dto.kode } });
    if (ada) throw new ConflictException('Kode mapel sudah ada');
    const row = await this.prisma.mapel.create({ data: dto });
    return { data: row };
  }

  async update(id: string, dto: UpdateMapelDto) {
    const ada = await this.prisma.mapel.findUnique({ where: { id } });
    if (!ada) throw new NotFoundException('Mata pelajaran tidak ditemukan');

    if (dto.kode && dto.kode !== ada.kode) {
      const kodeDuplikat = await this.prisma.mapel.findUnique({ where: { kode: dto.kode } });
      if (kodeDuplikat) throw new ConflictException('Kode mapel sudah digunakan');
    }

    const row = await this.prisma.mapel.update({
      where: { id },
      data: dto,
    });
    return { data: row };
  }

  async remove(id: string) {
    const ada = await this.prisma.mapel.findUnique({
      where: { id },
      include: {
        _count: {
          select: { jadwal: true, absensi: true, nilai: true },
        },
      },
    });
    if (!ada) throw new NotFoundException('Mata pelajaran tidak ditemukan');

    const totalTerkait = ada._count.jadwal + ada._count.absensi + ada._count.nilai;
    if (totalTerkait > 0) {
      throw new ConflictException(
        `Mapel ${ada.nama} tidak dapat dihapus karena memiliki ${totalTerkait} data terkait (jadwal/absensi/nilai).`,
      );
    }

    await this.prisma.mapel.delete({ where: { id } });
    return { data: { id, deleted: true } };
  }
}
