import {
  ConflictException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { AbsensiGuruService } from './absensi-guru.service';
import type { JwtPayload } from '../common/decorators/current-user.decorator';

const guru: JwtPayload = { sub: 'u1', role: 'GURU_MAPEL', guruId: 'g1' };

function mockPrisma(ada: unknown = null) {
  return {
    absensiGuru: {
      findUnique: jest.fn().mockResolvedValue(ada),
      create: jest.fn().mockImplementation((a: { data: unknown }) => Promise.resolve(a.data)),
      update: jest.fn().mockImplementation((a: { data: unknown }) => Promise.resolve(a.data)),
      findMany: jest.fn().mockResolvedValue([]),
    },
  };
}

describe('AbsensiGuruService', () => {
  it('masuk sukses bila liveness + skor cukup', async () => {
    const prisma = mockPrisma(null);
    const svc = new AbsensiGuruService(prisma as never);
    const res = await svc.masuk(guru, { faceScore: 0.9, liveness: true });
    expect(res.data).toMatchObject({ metode: 'FACE', statusVerifikasi: 'TERVERIFIKASI' });
  });

  it('masuk ditolak tanpa liveness (anti foto) dan skor rendah', async () => {
    const svc = new AbsensiGuruService(mockPrisma() as never);
    await expect(svc.masuk(guru, { faceScore: 0.9, liveness: false })).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    await expect(svc.masuk(guru, { faceScore: 0.2, liveness: true })).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('masuk dobel ditolak (409)', async () => {
    const svc = new AbsensiGuruService(
      mockPrisma({ id: 'p1', jamMasuk: new Date() }) as never,
    );
    await expect(svc.masuk(guru, { faceScore: 0.9, liveness: true })).rejects.toBeInstanceOf(
      ConflictException,
    );
  });

  it('di luar geofence tetap dicatat + flag', async () => {
    process.env.GEOFENCE_LAT = '-6.2';
    process.env.GEOFENCE_LNG = '106.8';
    process.env.GEOFENCE_RADIUS_M = '200';
    const prisma = mockPrisma(null);
    const svc = new AbsensiGuruService(prisma as never);
    const res = await svc.masuk(guru, { faceScore: 0.9, liveness: true, lat: 0, lng: 0 });
    expect(res.data).toMatchObject({ diLuarArea: true });
    delete process.env.GEOFENCE_LAT;
    delete process.env.GEOFENCE_LNG;
    delete process.env.GEOFENCE_RADIUS_M;
  });

  it('pulang tanpa masuk ditolak (404), dobel ditolak (409)', async () => {
    const svc = new AbsensiGuruService(mockPrisma(null) as never);
    await expect(svc.pulang(guru)).rejects.toBeInstanceOf(NotFoundException);
    const svc2 = new AbsensiGuruService(
      mockPrisma({ id: 'p1', jamMasuk: new Date(), jamPulang: new Date() }) as never,
    );
    await expect(svc2.pulang(guru)).rejects.toBeInstanceOf(ConflictException);
  });

  it('fallback selalu PENDING untuk verifikasi admin', async () => {
    const prisma = mockPrisma(null);
    const svc = new AbsensiGuruService(prisma as never);
    const res = await svc.fallback(guru, { alasan: 'Kamera rusak' });
    expect(res.data).toMatchObject({
      metode: 'MANUAL_FALLBACK',
      statusVerifikasi: 'PENDING',
    });
  });
});
