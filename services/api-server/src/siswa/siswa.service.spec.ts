import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { SiswaService } from './siswa.service';
import type { JwtPayload } from '../common/decorators/current-user.decorator';

const admin: JwtPayload = { sub: 'u1', role: 'SUPER_ADMIN' };
const wali: JwtPayload = { sub: 'u2', role: 'WALI_KELAS', guruId: 'g1' };

function mockPrisma(overrides: Record<string, unknown> = {}) {
  return {
    rombel: { findMany: jest.fn().mockResolvedValue([{ id: 'r1' }]) },
    jadwal: { findMany: jest.fn().mockResolvedValue([]) },
    siswa: {
      findMany: jest.fn().mockResolvedValue([]),
      count: jest.fn().mockResolvedValue(0),
      findUnique: jest.fn().mockResolvedValue(null),
      create: jest.fn(),
      update: jest.fn(),
    },
    ...overrides,
  };
}

describe('SiswaService', () => {
  it('admin membaca semua tanpa scope', async () => {
    const prisma = mockPrisma();
    const svc = new SiswaService(prisma as never);
    const res = await svc.list({}, admin);
    expect(res.meta).toMatchObject({ total: 0, page: 1 });
    expect(prisma.rombel.findMany).not.toHaveBeenCalled();
  });

  it('wali ditolak bila minta rombel di luar binaannya (403)', async () => {
    const prisma = mockPrisma();
    const svc = new SiswaService(prisma as never);
    await expect(svc.list({ rombelId: 'r-lain' }, wali)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('create menolak NISN duplikat (409)', async () => {
    const prisma = mockPrisma({
      siswa: {
        findMany: jest.fn(),
        count: jest.fn(),
        findUnique: jest.fn().mockResolvedValue({ id: 's1' }),
        create: jest.fn(),
        update: jest.fn(),
      },
    });
    const svc = new SiswaService(prisma as never);
    await expect(
      svc.create({ nisn: '1234567890', nama: 'Budi' }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('archive menolak id tidak ada (404)', async () => {
    const prisma = mockPrisma();
    const svc = new SiswaService(prisma as never);
    await expect(svc.archive('x')).rejects.toBeInstanceOf(NotFoundException);
  });
});
