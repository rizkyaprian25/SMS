import { ConflictException, NotFoundException } from '@nestjs/common';
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
});
