import { BadRequestException, ConflictException } from '@nestjs/common';
import { Hari } from '@prisma/client';
import { JadwalService } from './jadwal.service';

function mockPrisma(jadwalAda: unknown[] = []) {
  return {
    jadwal: {
      findMany: jest.fn().mockResolvedValue(jadwalAda),
      count: jest.fn().mockResolvedValue(jadwalAda.length),
      findUnique: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockImplementation((a: { data: unknown }) => Promise.resolve(a.data)),
      delete: jest.fn(),
    },
  };
}

const dto = {
  rombelId: 'r1',
  mapelId: 'm1',
  guruId: 'g1',
  hari: Hari.SENIN,
  jamMulai: '08:00',
  jamSelesai: '09:00',
};

describe('JadwalService', () => {
  it('menolak jam_selesai <= jam_mulai (400)', async () => {
    const svc = new JadwalService(mockPrisma() as never);
    await expect(
      svc.create({ ...dto, jamMulai: '09:00', jamSelesai: '08:00' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('menolak guru dobel di jam overlap (409 + detail)', async () => {
    const svc = new JadwalService(
      mockPrisma([
        {
          id: 'j1',
          guruId: 'g1',
          rombelId: 'r2',
          jamMulai: new Date('1970-01-01T08:30:00.000Z'),
          jamSelesai: new Date('1970-01-01T09:30:00.000Z'),
          guru: { nama: 'Sari' },
          mapel: { nama: 'MTK' },
          rombel: { nama: '8B' },
        },
      ]) as never,
    );
    await expect(svc.create(dto)).rejects.toThrow(/Sari.*MTK.*8B/);
  });

  it('slot tidak overlap boleh dibuat', async () => {
    const svc = new JadwalService(
      mockPrisma([
        {
          id: 'j1',
          guruId: 'g1',
          rombelId: 'r2',
          jamMulai: new Date('1970-01-01T09:00:00.000Z'),
          jamSelesai: new Date('1970-01-01T10:00:00.000Z'),
          guru: { nama: 'Sari' },
          mapel: { nama: 'MTK' },
          rombel: { nama: '8B' },
        },
      ]) as never,
    );
    const res = await svc.create(dto);
    expect((res.data as { rombelId: string }).rombelId).toBe('r1');
  });

  it('bentrok rombel ditolak walau guru beda', async () => {
    const svc = new JadwalService(
      mockPrisma([
        {
          id: 'j1',
          guruId: 'g9',
          rombelId: 'r1',
          jamMulai: new Date('1970-01-01T08:00:00.000Z'),
          jamSelesai: new Date('1970-01-01T09:00:00.000Z'),
          guru: { nama: 'Budi' },
          mapel: { nama: 'IPA' },
          rombel: { nama: '7A' },
        },
      ]) as never,
    );
    await expect(svc.create(dto)).rejects.toBeInstanceOf(ConflictException);
  });
});
