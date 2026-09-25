import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { JenisNilai, Semester } from '@prisma/client';
import { NilaiService } from './nilai.service';
import type { JwtPayload } from '../common/decorators/current-user.decorator';

const guru: JwtPayload = { sub: 'u1', role: 'GURU_MAPEL', guruId: 'g1' };
const dto = {
  mapelId: 'm1',
  tahunAjaranId: 'ta1',
  semester: Semester.GANJIL,
  jenis: JenisNilai.HARIAN,
  judul: 'Ulangan Harian 1',
  items: [{ siswaId: 's1', nilai: 85 }],
};

function mockPrisma(mengampu = true, lama: unknown = null, bobotLama: unknown = null) {
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
    tahunAjaran: { findFirst: jest.fn().mockResolvedValue({ id: 'ta1' }) },
    nilai: { findMany: jest.fn(), count: jest.fn() },
    bobotNilai: {
      findFirst: jest.fn().mockResolvedValue(bobotLama),
      create: jest.fn().mockResolvedValue({ id: 'b1', mapelId: 'm1' }),
      update: jest.fn().mockResolvedValue({ id: 'b1', mapelId: 'm1' }),
    },
    $transaction: jest.fn().mockImplementation((fn: (t: unknown) => unknown) => fn(tx)),
    __tx: tx,
  };
}

describe('NilaiService', () => {
  it('bulk tersimpan (baru + timpa aman dengan judul)', async () => {
    const prisma = mockPrisma(true, { id: 'n1' });
    const svc = new NilaiService(prisma as never);
    const res = await svc.createBulk(guru, dto);
    expect(res.data).toMatchObject({ tersimpan: 1 });
    expect(prisma.__tx.nilai.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ judul: 'Ulangan Harian 1' }),
      }),
    );
  });

  it('bulk ditolak bila bukan pengampu (403)', async () => {
    const prisma = mockPrisma(false);
    const svc = new NilaiService(prisma as never);
    await expect(svc.createBulk(guru, dto)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('getBobot mengembalikan nilai default (20, 30, 25, 25) jika belum diset', async () => {
    const prisma = mockPrisma(true, null, null);
    const svc = new NilaiService(prisma as never);
    const res = await svc.getBobot({ mapelId: 'm1', tahunAjaranId: 'ta1' }, guru);
    expect(res.data).toMatchObject({
      bobotTugas: 20,
      bobotHarian: 30,
      bobotUts: 25,
      bobotUas: 25,
    });
  });

  it('upsertBobot menolak bila total tidak sama dengan 100% (400)', async () => {
    const prisma = mockPrisma(true);
    const svc = new NilaiService(prisma as never);
    await expect(
      svc.upsertBobot(guru, {
        mapelId: 'm1',
        tahunAjaranId: 'ta1',
        bobotTugas: 30,
        bobotHarian: 30,
        bobotUts: 20,
        bobotUas: 10, // total 90%
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('upsertBobot berhasil menyimpan jika total sama dengan 100%', async () => {
    const prisma = mockPrisma(true, null, null);
    const svc = new NilaiService(prisma as never);
    const res = await svc.upsertBobot(guru, {
      mapelId: 'm1',
      tahunAjaranId: 'ta1',
      bobotTugas: 25,
      bobotHarian: 25,
      bobotUts: 25,
      bobotUas: 25,
    });
    expect(res.data).toBeDefined();
    expect(prisma.bobotNilai.create).toHaveBeenCalled();
  });
});
