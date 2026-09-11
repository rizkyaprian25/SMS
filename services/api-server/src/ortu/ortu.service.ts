import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { JwtPayload } from '../common/decorators/current-user.decorator';
import { HubungkanAnakDto } from './dto/hubungkan-anak.dto';

@Injectable()
export class OrtuService {
  constructor(private readonly prisma: PrismaService) {}

  async listAnak(user: JwtPayload) {
    const list = await this.prisma.ortuSiswa.findMany({
      where: { ortuId: user.sub },
      include: {
        siswa: {
          select: {
            id: true,
            nama: true,
            nisn: true,
            jenisKelamin: true,
            rombelId: true,
            rombel: { select: { id: true, nama: true } },
          },
        },
      },
    });

    return {
      data: list.map((item) => ({
        id: item.id,
        ortu_id: item.ortuId,
        siswa_id: item.siswaId,
        hubungan: item.hubungan,
        siswa: {
          id: item.siswa.id,
          nama: item.siswa.nama,
          nisn: item.siswa.nisn,
          rombel_id: item.siswa.rombelId,
          rombel: item.siswa.rombel,
        },
      })),
    };
  }

  async hubungkanAnak(dto: HubungkanAnakDto) {
    const [ortu, siswa] = await Promise.all([
      this.prisma.pengguna.findUnique({ where: { id: dto.ortuId } }),
      this.prisma.siswa.findUnique({ where: { id: dto.siswaId } }),
    ]);

    if (!ortu) throw new NotFoundException('Akun orang tua tidak ditemukan');
    if (ortu.role !== 'ORANG_TUA') throw new BadRequestException('Pengguna bukan role ORANG_TUA');
    if (!siswa) throw new NotFoundException('Data siswa tidak ditemukan');

    const rel = await this.prisma.ortuSiswa.upsert({
      where: { ortuId_siswaId: { ortuId: dto.ortuId, siswaId: dto.siswaId } },
      create: {
        ortuId: dto.ortuId,
        siswaId: dto.siswaId,
        hubungan: dto.hubungan,
      },
      update: {
        hubungan: dto.hubungan,
      },
    });

    return { data: rel };
  }
}
