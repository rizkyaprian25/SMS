import { ConflictException } from '@nestjs/common';
import { MapelService } from './mapel.service';

describe('MapelService', () => {
  it('create menolak kode duplikat (409)', async () => {
    const prisma = { mapel: { findMany: jest.fn(), findUnique: jest.fn().mockResolvedValue({ id: 'm1' }), create: jest.fn() } };
    const svc = new MapelService(prisma as never);
    await expect(svc.create({ kode: 'MTK', nama: 'Matematika' })).rejects.toBeInstanceOf(
      ConflictException,
    );
  });

  it('list mengembalikan semua mapel', async () => {
    const prisma = {
      mapel: { findMany: jest.fn().mockResolvedValue([{ kode: 'MTK' }]), findUnique: jest.fn(), create: jest.fn() },
    };
    const svc = new MapelService(prisma as never);
    const res = await svc.list();
    expect(res.data).toHaveLength(1);
  });
});
