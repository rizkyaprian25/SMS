import { ForbiddenException } from '@nestjs/common';
import { JenisNilai, Semester } from '@prisma/client';
import { NilaiService } from './nilai.service';
import type { JwtPayload } from '../common/decorators/current-user.decorator';

const guru: JwtPayload = { sub: 'u1', role: 'GURU_MAPEL', guruId: 'g1' };
const dto = {
  mapelId: 'm1',
  tahunAjaranId: 'ta1',
  semester: Semester.GANJIL,
  jenis: JenisNilai.HARIAN,
  items: [{ siswaId: 's1', nilai: 85 }],
};

function mockPrisma(mengampu = true, lama: unknown = null) {
  const tx = {
    nilai: {
      findFirst: jest.fn().mockResolvedValue(lama),
      create: jest.fn().mockResolvedValue({}),
      update: jest.fn().mockResolvedValue({}),
    },
  };
  return {
    guruMapel: { findUnique: jest.fn().mockResolvedValue(mengampu ? {} : null) },
    siswa: { count: jest.fn().mockResolvedValue(1) },
    nilai: { findMany: jest.fn(), count: jest.fn() },
    $transaction: jest.fn().mockImplementation((fn: (t: unknown) => unknown) => fn(tx)),
    __tx: tx,
  };
}

describe('NilaiService', () => {
  it('bulk tersimpan (baru + timpa aman)', async () => {
    const prisma = mockPrisma(true, { id: 'n1' });
    const svc = new NilaiService(prisma as never);
    const res = await svc.createBulk(guru, dto);
    expect(res.data).toMatchObject({ tersimpan: 1 });
    expect(prisma.__tx.nilai.update).toHaveBeenCalled();
  });

  it('bulk ditolak bila bukan pengampu (403)', async () => {
    const prisma = mockPrisma(false);
    const svc = new NilaiService(prisma as never);
    await expect(svc.createBulk(guru, dto)).rejects.toBeInstanceOf(ForbiddenException);
  });
});
