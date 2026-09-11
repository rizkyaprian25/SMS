import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { StatusKehadiran } from '@prisma/client';
import { AbsensiService } from './absensi.service';
import type { JwtPayload } from '../common/decorators/current-user.decorator';

const guru: JwtPayload = { sub: 'u1', role: 'GURU_MAPEL', guruId: 'g1' };
const baseDto = {
  tanggal: '2026-09-10',
  rombelId: 'r1',
  mapelId: 'm1',
  jamKe: 3,
  items: [{ siswaId: 's1', status: StatusKehadiran.HADIR }],
};

function txMock(ada: unknown = null) {
  return {
    absensi: {
      findUnique: jest.fn().mockResolvedValue(ada),
      create: jest.fn().mockResolvedValue({ id: 'a1' }),
      update: jest.fn().mockResolvedValue({ id: 'a1', status: StatusKehadiran.SAKIT }),
    },
    auditLog: { create: jest.fn().mockResolvedValue({}) },
  };
}

function mockPrisma(tx: unknown = txMock(), mengampu = true, jadwalCocok = 1) {
  return {
    guruMapel: { findUnique: jest.fn().mockResolvedValue(mengampu ? {} : null) },
    jadwal: { count: jest.fn().mockResolvedValue(jadwalCocok) },
    siswa: { count: jest.fn().mockResolvedValue(1) },
    absensi: {
      findUnique: jest.fn().mockResolvedValue(null),
      findMany: jest.fn().mockResolvedValue([]),
      count: jest.fn().mockResolvedValue(0),
      groupBy: jest
        .fn()
        .mockResolvedValue([{ status: 'HADIR', _count: { status: 30 } }]),
    },
    auditLog: { create: jest.fn().mockResolvedValue({}) },
    $transaction: jest.fn().mockImplementation((fn: (t: unknown) => unknown) => fn(tx)),
  };
}

describe('AbsensiService', () => {
  it('bulk baru tersimpan tanpa audit', async () => {
    const tx = txMock(null);
    const prisma = mockPrisma(tx);
    const svc = new AbsensiService(prisma as never);
    const res = await svc.createBulk(guru, baseDto);
    expect(res.data).toMatchObject({ tersimpan: 1, tanggal: '2026-09-10' });
    expect(tx.absensi.create).toHaveBeenCalled();
    expect(tx.auditLog.create).not.toHaveBeenCalled();
  });

  it('bulk retry menimpa + tulis audit (idempoten untuk offline-sync)', async () => {
    const tx = txMock({ id: 'a1', status: StatusKehadiran.HADIR });
    const prisma = mockPrisma(tx);
    const svc = new AbsensiService(prisma as never);
    await svc.createBulk(guru, baseDto);
    expect(tx.absensi.update).toHaveBeenCalled();
    expect(tx.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ aksi: 'ABSENSI_UBAH' }) }),
    );
  });

  it('bulk ditolak bila guru tidak mengampu mapel (403)', async () => {
    const prisma = mockPrisma(txMock(), false);
    const svc = new AbsensiService(prisma as never);
    await expect(svc.createBulk(guru, baseDto)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('bulk ditolak bila ada siswa_id asing (400)', async () => {
    const tx = txMock();
    const prisma = { ...mockPrisma(tx), siswa: { count: jest.fn().mockResolvedValue(0) } };
    const svc = new AbsensiService(prisma as never);
    await expect(svc.createBulk(guru, baseDto)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('update menolak id tidak ada (404)', async () => {
    const prisma = mockPrisma();
    const svc = new AbsensiService(prisma as never);
    await expect(
      svc.update('x', guru, { status: StatusKehadiran.SAKIT }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('bulk di luar jadwal tanpa override ditolak (403), dengan override lolos', async () => {
    const svcLuar = new AbsensiService(mockPrisma(txMock(), true, 0) as never);
    await expect(svcLuar.createBulk(guru, baseDto)).rejects.toBeInstanceOf(ForbiddenException);
    const svcGanti = new AbsensiService(mockPrisma(txMock(), true, 0) as never);
    const res = await svcGanti.createBulk(guru, { ...baseDto, alasanOverride: 'Jam pengganti' });
    expect(res.data).toMatchObject({ tersimpan: 1 });
  });

  it('update oleh bukan pencatat ditolak (403)', async () => {
    const hariIni = new Date().toISOString().slice(0, 10);
    const prisma = {
      ...mockPrisma(),
      absensi: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'a1',
          tanggal: new Date(`${hariIni}T00:00:00.000Z`),
          status: 'HADIR',
          dicatatOleh: 'guru-lain',
        }),
        update: jest.fn(),
      },
    };
    const svc = new AbsensiService(prisma as never);
    await expect(
      svc.update('a1', guru, { status: StatusKehadiran.SAKIT }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('update H+1 ditolak untuk guru (403), boleh untuk admin', async () => {
    const kemarin = new Date(Date.now() - 86400000);
    const prisma = {
      ...mockPrisma(),
      absensi: {
        findUnique: jest.fn().mockResolvedValue({ id: 'a1', tanggal: kemarin, status: 'HADIR' }),
        update: jest.fn().mockResolvedValue({ id: 'a1', status: 'SAKIT' }),
      },
    };
    const svc = new AbsensiService(prisma as never);
    await expect(
      svc.update('a1', guru, { status: StatusKehadiran.SAKIT }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    const admin: JwtPayload = { sub: 'u9', role: 'SUPER_ADMIN', guruId: 'g9' };
    const res = await svc.update('a1', admin, { status: StatusKehadiran.SAKIT });
    expect(res.data).toMatchObject({ status: 'SAKIT' });
  });

  it('rekap agregasi per status di server', async () => {
    const prisma = mockPrisma();
    const svc = new AbsensiService(prisma as never);
    const res = await svc.rekap({ rombelId: 'r1' });
    expect(res.data).toEqual([{ status: 'HADIR', jumlah: 30 }]);
  });
});
