import { ForbiddenException } from '@nestjs/common';
import { PelanggaranService } from './pelanggaran.service';
import type { JwtPayload } from '../common/decorators/current-user.decorator';

const wali: JwtPayload = { sub: 'u2', role: 'WALI_KELAS', guruId: 'g1' };
const bk: JwtPayload = { sub: 'u3', role: 'GURU_BK', guruId: 'g2' };
const dto = { siswaId: 's1', tanggal: '2026-09-10', kategori: 'Terlambat', poin: 5 };

function mockPrisma(binaan = ['r1'], rombelSiswa: string | null = 'r1') {
  return {
    rombel: { findMany: jest.fn().mockResolvedValue(binaan.map((id) => ({ id }))) },
    siswa: { findUnique: jest.fn().mockResolvedValue({ id: 's1', rombelId: rombelSiswa }) },
    pelanggaran: {
      create: jest.fn().mockImplementation((a: { data: unknown }) => Promise.resolve(a.data)),
      findMany: jest.fn().mockResolvedValue([]),
      count: jest.fn().mockResolvedValue(0),
      aggregate: jest.fn().mockResolvedValue({ _sum: { poin: 15 }, _count: { poin: 3 } }),
    },
  };
}

describe('PelanggaranService', () => {
  it('wali mencatat untuk kelas binaannya', async () => {
    const prisma = mockPrisma();
    const svc = new PelanggaranService(prisma as never);
    const res = await svc.create(wali, dto);
    expect(res.data).toMatchObject({ poin: 5, dicatatOleh: 'g1' });
  });

  it('wali ditolak untuk siswa luar binaan (403)', async () => {
    const prisma = mockPrisma(['r1'], 'r9');
    const svc = new PelanggaranService(prisma as never);
    await expect(svc.create(wali, dto)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('guru BK boleh semua + total poin dijumlahkan server', async () => {
    const prisma = mockPrisma([], 'r9');
    const svc = new PelanggaranService(prisma as never);
    const res = await svc.create(bk, dto);
    expect(res.data).toMatchObject({ siswaId: 's1' });
    const total = await svc.total(bk, 's1');
    expect(total.data).toMatchObject({ totalPoin: 15, jumlahKasus: 3 });
  });
});
