import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { RaporService } from './rapor.service';
import type { JwtPayload } from '../common/decorators/current-user.decorator';

const admin: JwtPayload = { sub: 'u9', role: 'SUPER_ADMIN', guruId: 'g9' };
const wali71: JwtPayload = { sub: 'u2', role: 'WALI_KELAS', guruId: 'g1' };

function mockPrisma(nilai: unknown[] = [], waliKelasId: string | null = 'g1', bobot: unknown[] = []) {
  return {
    siswa: {
      findUnique: jest.fn().mockResolvedValue({
        id: 's1',
        nama: 'Budi',
        nisn: '1234567890',
        deletedAt: null,
        rombel: { id: 'r1', nama: '7A', waliKelasId },
      }),
    },
    tahunAjaran: { findFirst: jest.fn().mockResolvedValue({ id: 'ta1' }) },
    nilai: { findMany: jest.fn().mockResolvedValue(nilai) },
    bobotNilai: { findMany: jest.fn().mockResolvedValue(bobot) },
  };
}

const N = (mapelId: string, nama: string, nilai: number, jenis: 'TUGAS' | 'HARIAN' | 'UTS' | 'UAS' = 'HARIAN') => ({
  mapelId,
  nilai,
  jenis,
  mapel: { id: mapelId, nama },
});

describe('RaporService', () => {
  it('rekap menghitung rata-rata per mapel + keseluruhan', async () => {
    const svc = new RaporService(
      mockPrisma([N('m1', 'MTK', 80), N('m1', 'MTK', 90), N('m2', 'IPA', 70)]) as never,
    );
    const res = await svc.rekap('s1', {}, admin);
    expect(res.data.mapel).toHaveLength(2);
    expect(res.data.mapel.find((m) => m.mapelNama === 'MTK')).toMatchObject({
      rataRata: 85,
      capaian: 'Baik',
    });
    expect(res.data.rataKeseluruhan).toBe(77.5);
  });

  it('rekap menghitung rata-rata tertimbang berdasarkan bobotNilai kustom guru', async () => {
    // Tugas: 100 (bobot 20%), UTS: 80 (bobot 80%) -> (100*20 + 80*80) / 100 = 84
    const bobotKustom = [
      {
        mapelId: 'm1',
        tahunAjaranId: 'ta1',
        bobotTugas: 20,
        bobotHarian: 0,
        bobotUts: 80,
        bobotUas: 0,
      },
    ];
    const svc = new RaporService(
      mockPrisma([N('m1', 'MTK', 100, 'TUGAS'), N('m1', 'MTK', 80, 'UTS')], 'g1', bobotKustom) as never,
    );
    const res = await svc.rekap('s1', {}, admin);
    expect(res.data.mapel[0].rataRata).toBe(84);
  });

  it('siswa tidak ada -> 404', async () => {
    const prisma = mockPrisma();
    prisma.siswa.findUnique = jest.fn().mockResolvedValue(null);
    const svc = new RaporService(prisma as never);
    await expect(svc.rekap('x', {}, admin)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('wali luar binaan ditolak (403)', async () => {
    const svc = new RaporService(mockPrisma([], 'guru-lain') as never);
    await expect(svc.rekap('s1', {}, wali71)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('pdf menghasilkan file %PDF bernama nisn+semester', async () => {
    const svc = new RaporService(mockPrisma([N('m1', 'MTK', 80)]) as never);
    const { namaFile, buffer } = await svc.pdf('s1', {}, admin);
    expect(namaFile).toBe('rapor-1234567890-GANJIL.pdf');
    expect(buffer.subarray(0, 4).toString()).toBe('%PDF');
  });
});
