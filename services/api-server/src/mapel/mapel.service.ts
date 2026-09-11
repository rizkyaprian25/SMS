import { ConflictException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateMapelDto } from './dto/mapel.dto';

/** Kecil dan stabil — list boleh dibaca semua role login (untuk dropdown). */
@Injectable()
export class MapelService {
  constructor(private readonly prisma: PrismaService) {}

  async list() {
    const rows = await this.prisma.mapel.findMany({ orderBy: { nama: 'asc' } });
    return { data: rows };
  }

  async create(dto: CreateMapelDto) {
    const ada = await this.prisma.mapel.findUnique({ where: { kode: dto.kode } });
    if (ada) throw new ConflictException('Kode mapel sudah ada');
    const row = await this.prisma.mapel.create({ data: dto });
    return { data: row };
  }
}
