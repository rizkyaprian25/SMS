import { NotFoundException } from '@nestjs/common';
import { RaporService } from './rapor.service';

function mockPrisma(nilai: unknown[] = []) {
  return {
    siswa: {
      findUnique: jest.fn().mockResolvedValue({
        id: 's1',
        nama: 'Budi',
        nisn: '1234567890',
        deletedAt: null,
        rombel: { nama: '7A' },
      }),
    },
    tahunAjaran: { findFirst: jest.fn().mockResolvedValue({ id: 'ta1' }) },
    nilai: { findMany: jest.fn().mockResolvedValue(nilai) },
  };
}

const N = (mapelId: string, nama: string, nilai: number) => ({
  mapelId,
  nilai,
  mapel: { id: mapelId, nama },
});

describe('RaporService', () => {
  it('rekap menghitung rata-rata per mapel + keseluruhan', async () => {
    const svc = new RaporService(
      mockPrisma([N('m1', 'MTK', 80), N('m1', 'MTK', 90), N('m2', 'IPA', 70)]) as never,
    );
    const res = await svc.rekap('s1', {});
    expect(res.data.mapel).toHaveLength(2);
    expect(res.data.mapel.find((m) => m.mapelNama === 'MTK')).toMatchObject({
      rataRata: 85,
      capaian: 'Baik',
    });
    expect(res.data.rataKeseluruhan).toBe(77.5);
  });

  it('siswa tidak ada -> 404', async () => {
    const prisma = mockPrisma();
    prisma.siswa.findUnique = jest.fn().mockResolvedValue(null);
    const svc = new RaporService(prisma as never);
    await expect(svc.rekap('x', {})).rejects.toBeInstanceOf(NotFoundException);
  });

  it('pdf menghasilkan file %PDF bernama nisn+semester', async () => {
    const svc = new RaporService(mockPrisma([N('m1', 'MTK', 80)]) as never);
    const { namaFile, buffer } = await svc.pdf('s1', {});
    expect(namaFile).toBe('rapor-1234567890-GANJIL.pdf');
    expect(buffer.subarray(0, 4).toString()).toBe('%PDF');
  });
});
