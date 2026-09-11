import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { GuruService } from './guru.service';
import type { JwtPayload } from '../common/decorators/current-user.decorator';
import { dekripsiTeks } from '../common/crypto';

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

  it('enroll menyimpan template terenkripsi + consent (bukan plaintext)', async () => {
    process.env.ENKRIPSI_WAJAH_KEY =
      '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
    const update = jest.fn().mockResolvedValue({});
    const prisma = {
      ...mockPrisma(),
      guru: { ...mockPrisma().guru, findUnique: jest.fn().mockResolvedValue({ id: 'g1' }), update },
    };
    const svc = new GuruService(prisma as never);
    const user: JwtPayload = { sub: 'u1', role: 'GURU_MAPEL', guruId: 'g1' };
    const res = await svc.enrollWajah('g1', user, { embedding: 'e'.repeat(64), consent: true });
    expect(res.data).toMatchObject({ faceConsent: true });
    const tersimpan = update.mock.calls[0][0].data.faceEmbeddingEnc as string;
    expect(tersimpan).not.toContain('e'.repeat(8));
    expect(dekripsiTeks(tersimpan)).toBe('e'.repeat(64));
  });

  it('enroll ditolak untuk guru lain (403)', async () => {
    const svc = new GuruService(mockPrisma() as never);
    const user: JwtPayload = { sub: 'u2', role: 'GURU_MAPEL', guruId: 'g9' };
    await expect(
      svc.enrollWajah('g1', user, { embedding: 'e'.repeat(64), consent: true }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
