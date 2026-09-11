import { ConflictException, NotFoundException } from '@nestjs/common';
import { GuruService } from './guru.service';

function txMock() {
  return {
    guru: { create: jest.fn().mockResolvedValue({ id: 'g1' }), update: jest.fn() },
    pengguna: { create: jest.fn().mockResolvedValue({}), deleteMany: jest.fn().mockResolvedValue({}) },
    guruMapel: { createMany: jest.fn().mockResolvedValue({}), deleteMany: jest.fn().mockResolvedValue({}) },
  };
}

function mockPrisma(tx: unknown = txMock()) {
  return {
    guru: {
      findMany: jest.fn().mockResolvedValue([]),
      count: jest.fn().mockResolvedValue(0),
      findUnique: jest.fn().mockResolvedValue(null),
      create: jest.fn(),
      update: jest.fn(),
    },
    pengguna: { findUnique: jest.fn().mockResolvedValue(null) },
    mapel: { count: jest.fn().mockResolvedValue(0) },
    $transaction: jest.fn().mockImplementation((fn: (t: unknown) => unknown) => fn(tx)),
  };
}

const dto = { nip: '1980', nama: 'Sari', email: 'sari@sekolah.sch.id', password: 'secret123' };

describe('GuruService', () => {
  it('create membuat guru + akun dalam 1 transaksi', async () => {
    const tx = txMock();
    const prisma = mockPrisma(tx);
    const svc = new GuruService(prisma as never);
    const res = await svc.create(dto);
    expect(res.data).toMatchObject({ id: 'g1' });
    expect(tx.pengguna.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ guruId: 'g1' }) }),
    );
  });

  it('create menolak NIP duplikat (409)', async () => {
    const prisma = mockPrisma();
    prisma.guru.findUnique = jest.fn().mockResolvedValue({ id: 'g9' });
    const svc = new GuruService(prisma as never);
    await expect(svc.create(dto)).rejects.toBeInstanceOf(ConflictException);
  });

  it('setMapel menolak mapel asing (404)', async () => {
    const prisma = mockPrisma();
    prisma.guru.findUnique = jest.fn().mockResolvedValue({ id: 'g1' });
    prisma.mapel.count = jest.fn().mockResolvedValue(0);
    const svc = new GuruService(prisma as never);
    await expect(svc.setMapel('g1', { mapelIds: ['m-x'] })).rejects.toBeInstanceOf(NotFoundException);
  });
});
