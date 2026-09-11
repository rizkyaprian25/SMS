import { ConflictException } from '@nestjs/common';
import { TahunAjaranService } from './tahun-ajaran.service';

describe('TahunAjaranService', () => {
  it('create menolak nama duplikat (409)', async () => {
    const prisma = {
      tahunAjaran: {
        findMany: jest.fn(),
        findFirst: jest.fn().mockResolvedValue({ id: 't1' }),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
      },
    };
    const svc = new TahunAjaranService(prisma as never);
    await expect(
      svc.create({ nama: '2026/2027', semesterAktif: 'GANJIL', tglMulai: '2026-07-01', tglSelesai: '2027-06-30' } as never),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('aktifkan menonaktifkan yang lama dalam 1 transaksi', async () => {
    const tx = { tahunAjaran: { updateMany: jest.fn(), update: jest.fn() } };
    const prisma = {
      tahunAjaran: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        findUnique: jest.fn().mockResolvedValue({ id: 't2' }),
        create: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
      },
      $transaction: jest.fn().mockImplementation((fn: (t: unknown) => unknown) => fn(tx)),
    };
    const svc = new TahunAjaranService(prisma as never);
    await svc.aktifkan('t2');
    expect(tx.tahunAjaran.updateMany).toHaveBeenCalledWith({
      where: { isAktif: true },
      data: { isAktif: false },
    });
    expect(tx.tahunAjaran.update).toHaveBeenCalledWith({
      where: { id: 't2' },
      data: { isAktif: true },
    });
  });
});
