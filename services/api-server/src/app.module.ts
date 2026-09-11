import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { RombelModule } from './rombel/rombel.module';
import { SiswaModule } from './siswa/siswa.module';
import { JadwalModule } from './jadwal/jadwal.module';
import { AbsensiModule } from './absensi/absensi.module';
import { AbsensiGuruModule } from './absensi-guru/absensi-guru.module';
import { NilaiModule } from './nilai/nilai.module';
import { PerizinanModule } from './perizinan/perizinan.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { PengumumanModule } from './pengumuman/pengumuman.module';
import { PelanggaranModule } from './pelanggaran/pelanggaran.module';
import { RaporModule } from './rapor/rapor.module';
import { ReportsModule } from './reports/reports.module';
import { GuruModule } from './guru/guru.module';
import { MapelModule } from './mapel/mapel.module';
import { NotifikasiModule } from './notifikasi/notifikasi.module';
import { HealthController } from './health.controller';

@Module({
  imports: [
    PrismaModule,
    JwtModule.register({
      global: true,
      secret: process.env.JWT_ACCESS_SECRET ?? 'dev-access-secret-min-32-karakter-xxxx',
      signOptions: { expiresIn: '15m' },
    }),
    AuthModule,
    RombelModule,
    SiswaModule,
    JadwalModule,
    AbsensiModule,
    AbsensiGuruModule,
    NilaiModule,
    PerizinanModule,
    DashboardModule,
    PengumumanModule,
    PelanggaranModule,
    RaporModule,
    ReportsModule,
    GuruModule,
    MapelModule,
    NotifikasiModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
