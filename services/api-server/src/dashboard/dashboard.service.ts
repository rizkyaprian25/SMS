import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { hariIniUTC } from '../common/dates';

/** Kartu ringkasan kepsek/admin — 1 request, agregasi count paralel di server. */
@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async ringkasan() {
    const hariIni = hariIniUTC();
    const [totalSiswa, totalGuru, totalRombel, hadirHariIni, tidakHadirHariIni, alpaHariIni] =
      await Promise.all([
        this.prisma.siswa.count({ where: { isAktif: true, deletedAt: null } }),
        this.prisma.guru.count({ where: { isAktif: true, deletedAt: null } }),
        this.prisma.rombel.count({ where: { deletedAt: null } }),
        this.prisma.absensi.count({ where: { tanggal: hariIni, status: 'HADIR' } }),
        this.prisma.absensi.count({
          where: { tanggal: hariIni, status: { in: ['IZIN', 'SAKIT', 'ALPA'] } },
        }),
        this.prisma.absensi.count({ where: { tanggal: hariIni, status: 'ALPA' } }),
      ]);
    return {
      data: {
        totalSiswa,
        totalGuru,
        totalRombel,
        hadirHariIni,
        tidakHadirHariIni,
        alpaHariIni,
        tanggal: hariIni,
      },
    };
  }
}
