import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { RombelService } from './rombel.service';

function mockPrisma(overrides: Record<string, unknown> = {}) {
  return {
    rombel: {
      findMany: jest.fn().mockResolvedValue([]),
      count: jest.fn().mockResolvedValue(0),
      findUnique: jest.fn().mockResolvedValue(null),
      create: jest.fn(),
      update: jest.fn(),
      ...overrides,
    },
    siswa: { findMany: jest.fn().mockResolvedValue([]) },
    absensi: { findMany: jest.fn().mockResolvedValue([]) },
  };
}

describe('RombelService', () => {
  it('list mengembalikan { data, meta } paginated', async () => {
    const prisma = mockPrisma({
      findMany: jest.fn().mockResolvedValue([{ id: '1', nama: '7A' }]),
      count: jest.fn().mockResolvedValue(1),
    });
    const svc = new RombelService(prisma as never);
    const res = await svc.list({});
    expect(res.data).toHaveLength(1);
    expect(res.meta).toMatchObject({ total: 1, page: 1, limit: 30 });
  });

  it('create menolak nama duplikat di tahun ajaran yang sama (409)', async () => {
    const prisma = mockPrisma({
      findUnique: jest.fn().mockResolvedValue({ id: 'x', nama: '7A' }),
    });
    const svc = new RombelService(prisma as never);
    await expect(
      svc.create({ tingkatId: 't', tahunAjaranId: 'ta', nama: '7A' }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('archive menolak id yang tidak ada (404)', async () => {
    const prisma = mockPrisma();
    const svc = new RombelService(prisma as never);
    await expect(svc.archive('tidak-ada')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('siswa mengembalikan daftar + status hari itu', async () => {
    const prisma = mockPrisma({
      findUnique: jest.fn().mockResolvedValue({ id: 'r1', nama: '7A', deletedAt: null }),
    });
    prisma.siswa.findMany = jest
      .fn()
      .mockResolvedValue([{ id: 's1', nama: 'Budi', fotoUrl: null }]);
    prisma.absensi.findMany = jest
      .fn()
      .mockResolvedValue([{ siswaId: 's1', status: 'HADIR' }]);
    const svc = new RombelService(prisma as never);
    const res = await svc.siswa('r1', { tanggal: '2026-09-10' });
    expect(res.data.siswa).toHaveLength(1);
    expect(res.data.absensi).toEqual({ s1: 'HADIR' });
  });

  it('siswa menolak rombel tidak ada (404)', async () => {
    const prisma = mockPrisma();
    const svc = new RombelService(prisma as never);
    await expect(svc.siswa('x', {})).rejects.toBeInstanceOf(NotFoundException);
  });

  it('naik-kelas preview menghitung per rombel tanpa menulis', async () => {
    const prisma = {
      ...mockPrisma(),
      tahunAjaran: { findUnique: jest.fn().mockResolvedValue({ id: 'ta2' }) },
      rombel: {
        ...mockPrisma().rombel,
        findMany: jest
          .fn()
          .mockResolvedValue([{ id: 'r8a', nama: '8A', tahunAjaranId: 'ta2', deletedAt: null }]),
      },
      siswa: {
        findMany: jest.fn().mockResolvedValue([{ id: 's1', nama: 'Budi', rombelId: 'r7a' }]),
      },
    };
    const svc = new RombelService(prisma as never);
    const res = await svc.naikKelas(
      { sub: 'u1', role: 'SUPER_ADMIN', guruId: 'g1' },
      { dariTahunId: 'ta1', keTahunId: 'ta2', mapping: [{ siswaId: 's1', rombelBaruId: 'r8a' }] },
      true,
    );
    expect(res.data).toMatchObject({ total: 1 });
    expect(res.data.perRombel).toEqual([{ rombelId: 'r8a', nama: '8A', jumlah: 1 }]);
  });

  it('naik-kelas menolak rombel tujuan beda tahun (400)', async () => {
    const prisma = {
      ...mockPrisma(),
      tahunAjaran: { findUnique: jest.fn().mockResolvedValue({ id: 'ta2' }) },
      rombel: {
        ...mockPrisma().rombel,
        findMany: jest
          .fn()
          .mockResolvedValue([{ id: 'r7a', nama: '7A', tahunAjaranId: 'ta1', deletedAt: null }]),
      },
      siswa: { findMany: jest.fn() },
    };
    const svc = new RombelService(prisma as never);
    await expect(
      svc.naikKelas(
        { sub: 'u1', role: 'SUPER_ADMIN', guruId: 'g1' },
        { dariTahunId: 'ta1', keTahunId: 'ta2', mapping: [{ siswaId: 's1', rombelBaruId: 'r7a' }] },
        true,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('naik-kelas eksekusi menulis riwayat per siswa dalam transaksi', async () => {
    const tx = {
      siswa: { update: jest.fn().mockResolvedValue({}) },
      riwayatKelas: { create: jest.fn().mockResolvedValue({}) },
      auditLog: { create: jest.fn().mockResolvedValue({}) },
    };
    const prisma = {
      ...mockPrisma(),
      tahunAjaran: { findUnique: jest.fn().mockResolvedValue({ id: 'ta2' }) },
      rombel: {
        ...mockPrisma().rombel,
        findMany: jest
          .fn()
          .mockResolvedValue([{ id: 'r8a', nama: '8A', tahunAjaranId: 'ta2', deletedAt: null }]),
      },
      siswa: {
        findMany: jest.fn().mockResolvedValue([{ id: 's1', nama: 'Budi', rombelId: 'r7a' }]),
      },
      $transaction: jest.fn().mockImplementation((fn: (t: unknown) => unknown) => fn(tx)),
    };
    const svc = new RombelService(prisma as never);
    const res = await svc.naikKelas(
      { sub: 'u1', role: 'SUPER_ADMIN', guruId: 'g1' },
      { dariTahunId: 'ta1', keTahunId: 'ta2', mapping: [{ siswaId: 's1', rombelBaruId: 'r8a' }] },
      false,
    );
    expect(res.data).toMatchObject({ dipindahkan: 1 });
    expect(tx.riwayatKelas.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ siswaId: 's1', rombelLamaId: 'r7a', rombelBaruId: 'r8a' }),
      }),
    );
    expect(tx.auditLog.create).toHaveBeenCalled();
  });
});
