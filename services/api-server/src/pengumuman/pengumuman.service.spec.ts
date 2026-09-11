import { NotFoundException } from '@nestjs/common';
import { Role } from '@prisma/client';
import { PengumumanService } from './pengumuman.service';

function mockPrisma(ada: unknown = { id: 'p1' }) {
  return {
    pengumuman: {
      findMany: jest.fn().mockResolvedValue([]),
      count: jest.fn().mockResolvedValue(0),
      create: jest.fn().mockImplementation((a: { data: unknown }) => Promise.resolve(a.data)),
      findUnique: jest.fn().mockResolvedValue(ada),
      delete: jest.fn(),
    },
  };
}

describe('PengumumanService', () => {
  it('list meneruskan filter role + rombel ke prisma', async () => {
    const prisma = mockPrisma();
    const svc = new PengumumanService(prisma as never, { broadcastPengumuman: jest.fn() } as never);
    await svc.list({ role: Role.GURU_MAPEL, rombelId: 'r1' });
    expect(prisma.pengumuman.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ AND: expect.any(Array) }) }),
    );
  });

  it('hapus menolak id tidak ada (404)', async () => {
    const svc = new PengumumanService(mockPrisma(null) as never, { broadcastPengumuman: jest.fn() } as never);
    await expect(svc.remove('x')).rejects.toBeInstanceOf(NotFoundException);
  });
});
