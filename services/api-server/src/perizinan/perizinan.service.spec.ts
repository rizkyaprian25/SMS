import { BadRequestException, ConflictException, ForbiddenException } from '@nestjs/common';
import { PerizinanService } from './perizinan.service';
import type { JwtPayload } from '../common/decorators/current-user.decorator';

const wali: JwtPayload = { sub: 'u2', role: 'WALI_KELAS', guruId: 'g1' };
const ajuan = {
  siswaId: 's1',
  tglMulai: '2026-09-14', // Senin
  tglSelesai: '2026-09-14',
  jenis: 'SAKIT' as const,
  alasan: 'Demam',
};

function txMock() {
  return {
    perizinan: { update: jest.fn().mockResolvedValue({ id: 'i1', status: 'DISETUJUI' }) },
    jadwal: {
      findMany: jest.fn().mockResolvedValue([{ mapelId: 'm1', jamKe: 1 }]),
    },
    absensi: {
      findUnique: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue({}),
      update: jest.fn(),
    },
    auditLog: { create: jest.fn().mockResolvedValue({}) },
  };
}

function mockPrisma(tx: unknown = txMock(), waliDari: string | null = 'g1') {
  return {
    siswa: { findUnique: jest.fn().mockResolvedValue({ id: 's1' }) },
    perizinan: {
      findMany: jest.fn().mockResolvedValue([]),
      count: jest.fn().mockResolvedValue(0),
      create: jest.fn().mockResolvedValue({}),
      findUnique: jest.fn().mockResolvedValue({
        id: 'i1',
        status: 'DIAJUKAN',
        siswaId: 's1',
        tglMulai: new Date('2026-09-14T00:00:00.000Z'),
        tglSelesai: new Date('2026-09-14T00:00:00.000Z'),
        jenis: 'SAKIT',
        siswa: { rombelId: 'r1', rombel: { waliKelasId: waliDari } },
      }),
    },
    $transaction: jest.fn().mockImplementation((fn: (t: unknown) => unknown) => fn(tx)),
  };
}

describe('PerizinanService', () => {
  it('menolak rentang > 30 hari (400)', async () => {
    const svc = new PerizinanService(mockPrisma() as never);
    await expect(
      svc.ajukan({ ...ajuan, tglSelesai: '2026-12-31' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('wali kelas lain ditolak memutuskan (403)', async () => {
    const svc = new PerizinanService(mockPrisma(txMock(), 'g9') as never);
    await expect(svc.putuskan('i1', wali, { putusan: 'SETUJU' })).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('setuju -> absensi SAKIT otomatis per jadwal + audit', async () => {
    const tx = txMock();
    const svc = new PerizinanService(mockPrisma(tx) as never);
    const res = await svc.putuskan('i1', wali, { putusan: 'SETUJU' });
    expect(res.data).toMatchObject({ status: 'DISETUJUI' });
    expect(tx.absensi.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'SAKIT', dicatatOleh: 'g1' }),
      }),
    );
    expect(tx.auditLog.create).toHaveBeenCalled();
  });

  it('yang sudah diputuskan tidak bisa diputuskan lagi (409)', async () => {
    const prisma = mockPrisma();
    prisma.perizinan.findUnique = jest.fn().mockResolvedValue({
      id: 'i1',
      status: 'DISETUJUI',
      siswa: { rombelId: 'r1', rombel: { waliKelasId: 'g1' } },
    });
    const svc = new PerizinanService(prisma as never);
    await expect(svc.putuskan('i1', wali, { putusan: 'TOLAK' })).rejects.toBeInstanceOf(
      ConflictException,
    );
  });
});
