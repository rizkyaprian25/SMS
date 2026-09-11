import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { pageMeta, pageParams } from '../common/pagination';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import type { JwtPayload } from '../common/decorators/current-user.decorator';
import { enkripsiTeks } from '../common/crypto';
import { CreateGuruDto, SetMapelDto, UpdateGuruDto } from './dto/guru.dto';
import { EnrollWajahDto } from './dto/enroll-wajah.dto';

/**
 * Data guru + akun login dibuat BERSAMAAN (transaction) agar tidak ada
 * guru tanpa akun / akun tanpa guru. Enrollment wajah terpisah (docs/09).
 */
@Injectable()
export class GuruService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: PaginationQueryDto) {
    const { page, limit, skip } = pageParams({
      page: String(query.page ?? 1),
      limit: String(query.limit ?? 30),
    });
    const where = {
      deletedAt: null,
      ...(query.q
        ? { OR: [{ nama: { contains: query.q, mode: 'insensitive' as const } }, { nip: { contains: query.q } }] }
        : {}),
    };
    const [rows, total] = await Promise.all([
      this.prisma.guru.findMany({
        where,
        skip,
        take: limit,
        orderBy: { nama: 'asc' },
        select: {
          id: true,
          nip: true,
          nama: true,
          fotoUrl: true,
          isAktif: true,
          pengguna: { select: { email: true, role: true } },
          mapelDiampu: { include: { mapel: { select: { id: true, nama: true } } } },
        },
      }),
      this.prisma.guru.count({ where }),
    ]);
    return { data: rows, meta: pageMeta(total, page, limit) };
  }

  async detail(id: string) {
    const row = await this.prisma.guru.findUnique({
      where: { id },
      // Template wajah TIDAK PERNAH keluar lewat API (docs/09).
      omit: { faceEmbeddingEnc: true },
      include: {
        pengguna: { select: { email: true, role: true } },
        mapelDiampu: { include: { mapel: true } },
        waliUntuk: { select: { id: true, nama: true } },
      },
    });
    if (!row || row.deletedAt) throw new NotFoundException('Guru tidak ditemukan');
    return { data: row };
  }

  async create(dto: CreateGuruDto) {
    const [nipAda, emailAda] = await Promise.all([
      this.prisma.guru.findUnique({ where: { nip: dto.nip } }),
      this.prisma.pengguna.findUnique({ where: { email: dto.email } }),
    ]);
    if (nipAda) throw new ConflictException('NIP sudah terdaftar');
    if (emailAda) throw new ConflictException('Email sudah dipakai');
    if (dto.mapelIds?.length) {
      const mapel = await this.prisma.mapel.count({ where: { id: { in: dto.mapelIds } } });
      if (mapel !== dto.mapelIds.length) throw new NotFoundException('Ada mapel_id tidak dikenal');
    }
    const passwordHash = await bcrypt.hash(dto.password, 12);
    const row = await this.prisma.$transaction(async (tx) => {
      const guru = await tx.guru.create({ data: { nip: dto.nip, nama: dto.nama } });
      await tx.pengguna.create({
        data: { email: dto.email, passwordHash, role: dto.role ?? 'GURU_MAPEL', guruId: guru.id },
      });
      if (dto.mapelIds?.length) {
        await tx.guruMapel.createMany({
          data: dto.mapelIds.map((mapelId) => ({ guruId: guru.id, mapelId })),
        });
      }
      return guru;
    });
    return { data: row };
  }

  async update(id: string, dto: UpdateGuruDto) {
    const lama = await this.prisma.guru.findUnique({ where: { id } });
    if (!lama || lama.deletedAt) throw new NotFoundException('Guru tidak ditemukan');
    if (dto.nip && dto.nip !== lama.nip) {
      const ada = await this.prisma.guru.findUnique({ where: { nip: dto.nip } });
      if (ada) throw new ConflictException('NIP sudah terdaftar');
    }
    const row = await this.prisma.guru.update({ where: { id }, data: dto });
    return { data: row };
  }

  /** Ganti total mapel yang diampu (dipakai halaman guru web). */
  async setMapel(id: string, dto: SetMapelDto) {
    const lama = await this.prisma.guru.findUnique({ where: { id } });
    if (!lama || lama.deletedAt) throw new NotFoundException('Guru tidak ditemukan');
    const mapel = await this.prisma.mapel.count({ where: { id: { in: dto.mapelIds } } });
    if (mapel !== dto.mapelIds.length) throw new NotFoundException('Ada mapel_id tidak dikenal');
    await this.prisma.$transaction(async (tx) => {
      await tx.guruMapel.deleteMany({ where: { guruId: id } });
      if (dto.mapelIds.length) {
        await tx.guruMapel.createMany({
          data: dto.mapelIds.map((mapelId) => ({ guruId: id, mapelId })),
        });
      }
    });
    return this.detail(id);
  }

  /** Daftarkan template wajah (sekali, didampingi TU). Self atau admin. */
  async enrollWajah(id: string, user: JwtPayload, dto: EnrollWajahDto) {
    if (user.role !== 'SUPER_ADMIN' && user.guruId !== id) {
      throw new ForbiddenException('Hanya guru ybs atau admin');
    }
    const lama = await this.prisma.guru.findUnique({ where: { id } });
    if (!lama || lama.deletedAt) throw new NotFoundException('Guru tidak ditemukan');
    // Template terenkripsi at-rest; tidak pernah dibaca kembali server
    // (pencocokan di HP, kirim skor saja — docs/09).
    await this.prisma.guru.update({
      where: { id },
      data: { faceEmbeddingEnc: enkripsiTeks(dto.embedding), faceConsent: true, faceConsentAt: new Date() },
    });
    return { data: { id, faceConsent: true } };
  }

  /** Hapus template wajah (hak hapus UU PDP) — presensi jadi fallback manual. */
  async hapusWajah(id: string, user: JwtPayload) {
    if (user.role !== 'SUPER_ADMIN' && user.guruId !== id) {
      throw new ForbiddenException('Hanya guru ybs atau admin');
    }
    const lama = await this.prisma.guru.findUnique({ where: { id } });
    if (!lama || lama.deletedAt) throw new NotFoundException('Guru tidak ditemukan');
    await this.prisma.guru.update({
      where: { id },
      data: { faceEmbeddingEnc: null, faceConsent: false },
    });
    return { data: { id, faceConsent: false } };
  }

  /** Arsip guru + hapus akun loginnya (data kepegawaian & histori tetap). */
  async archive(id: string) {
    const lama = await this.prisma.guru.findUnique({ where: { id } });
    if (!lama || lama.deletedAt) throw new NotFoundException('Guru tidak ditemukan');
    await this.prisma.$transaction(async (tx) => {
      await tx.pengguna.deleteMany({ where: { guruId: id } });
      await tx.guru.update({ where: { id }, data: { deletedAt: new Date(), isAktif: false } });
    });
    return { data: { id } };
  }
}
