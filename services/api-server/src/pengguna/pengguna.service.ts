import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { pageMeta, pageParams } from '../common/pagination';
import type { JwtPayload } from '../common/decorators/current-user.decorator';
import {
  CreatePenggunaDto,
  QueryPenggunaDto,
  ResetPasswordDto,
  UpdatePenggunaDto,
} from './dto/pengguna.dto';

@Injectable()
export class PenggunaService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: QueryPenggunaDto) {
    const { page, limit, skip } = pageParams({
      page: String(query.page ?? 1),
      limit: String(query.limit ?? 25),
    });

    const where: Record<string, unknown> = {};
    if (query.role) {
      where.role = query.role;
    }
    if (query.q) {
      where.OR = [
        { email: { contains: query.q, mode: 'insensitive' } },
        { guru: { nama: { contains: query.q, mode: 'insensitive' } } },
        { siswa: { nama: { contains: query.q, mode: 'insensitive' } } },
      ];
    }

    const [rows, total] = await Promise.all([
      this.prisma.pengguna.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          email: true,
          role: true,
          guruId: true,
          siswaId: true,
          createdAt: true,
          updatedAt: true,
          guru: { select: { id: true, nama: true, nip: true } },
          siswa: { select: { id: true, nama: true, nisn: true, rombel: { select: { id: true, nama: true } } } },
        },
      }),
      this.prisma.pengguna.count({ where }),
    ]);

    return { data: rows, meta: pageMeta(total, page, limit) };
  }

  async findOne(id: string) {
    const row = await this.prisma.pengguna.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        role: true,
        guruId: true,
        siswaId: true,
        createdAt: true,
        updatedAt: true,
        guru: { select: { id: true, nama: true, nip: true } },
        siswa: { select: { id: true, nama: true, nisn: true, rombel: { select: { id: true, nama: true } } } },
      },
    });
    if (!row) throw new NotFoundException('Pengguna tidak ditemukan');
    return { data: row };
  }

  async create(dto: CreatePenggunaDto, user: JwtPayload) {
    const ada = await this.prisma.pengguna.findUnique({ where: { email: dto.email } });
    if (ada) throw new ConflictException('Email sudah terdaftar');

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const row = await this.prisma.pengguna.create({
      data: {
        email: dto.email.toLowerCase(),
        passwordHash,
        role: dto.role,
        guruId: dto.guruId || null,
        siswaId: dto.siswaId || null,
      },
      select: {
        id: true,
        email: true,
        role: true,
        guruId: true,
        siswaId: true,
        createdAt: true,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        aksi: 'BUAT_PENGGUNA',
        entitas: 'pengguna',
        entitasId: row.id,
        sesudah: { email: row.email, role: row.role },
        dilakukanOleh: user.sub,
      },
    });

    return { data: row };
  }

  async update(id: string, dto: UpdatePenggunaDto, user: JwtPayload) {
    const existing = await this.prisma.pengguna.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Pengguna tidak ditemukan');

    if (dto.email && dto.email !== existing.email) {
      const emailAda = await this.prisma.pengguna.findUnique({ where: { email: dto.email } });
      if (emailAda) throw new ConflictException('Email sudah digunakan oleh akun lain');
    }

    const row = await this.prisma.pengguna.update({
      where: { id },
      data: {
        ...(dto.email ? { email: dto.email.toLowerCase() } : {}),
        ...(dto.role ? { role: dto.role } : {}),
        ...(dto.guruId !== undefined ? { guruId: dto.guruId || null } : {}),
        ...(dto.siswaId !== undefined ? { siswaId: dto.siswaId || null } : {}),
      },
      select: {
        id: true,
        email: true,
        role: true,
        guruId: true,
        siswaId: true,
        updatedAt: true,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        aksi: 'UPDATE_PENGGUNA',
        entitas: 'pengguna',
        entitasId: id,
        sebelum: { email: existing.email, role: existing.role },
        sesudah: { email: row.email, role: row.role },
        dilakukanOleh: user.sub,
      },
    });

    return { data: row };
  }

  async resetPassword(id: string, dto: ResetPasswordDto, user: JwtPayload) {
    const existing = await this.prisma.pengguna.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Pengguna tidak ditemukan');

    const passwordHash = await bcrypt.hash(dto.passwordBaru, 10);
    await this.prisma.$transaction(async (tx) => {
      await tx.pengguna.update({
        where: { id },
        data: { passwordHash },
      });
      // Cabut sesi login yang masih aktif demi keamanan
      await tx.sesi.deleteMany({ where: { penggunaId: id } });
      await tx.auditLog.create({
        data: {
          aksi: 'RESET_PASSWORD',
          entitas: 'pengguna',
          entitasId: id,
          sebelum: { email: existing.email },
          sesudah: { passwordReset: true },
          dilakukanOleh: user.sub,
        },
      });
    });

    return { data: { id, status: 'Password berhasil direset' } };
  }

  async delete(id: string, user: JwtPayload) {
    const existing = await this.prisma.pengguna.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Pengguna tidak ditemukan');
    if (existing.email === 'admin@sekolah.sch.id') {
      throw new BadRequestException('Akun administrator utama tidak dapat dihapus');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.sesi.deleteMany({ where: { penggunaId: id } });
      await tx.pengguna.delete({ where: { id } });
      await tx.auditLog.create({
        data: {
          aksi: 'HAPUS_PENGGUNA',
          entitas: 'pengguna',
          entitasId: id,
          sebelum: { email: existing.email, role: existing.role },
          dilakukanOleh: user.sub,
        },
      });
    });

    return { data: { id, status: 'Akun berhasil dihapus' } };
  }
}
