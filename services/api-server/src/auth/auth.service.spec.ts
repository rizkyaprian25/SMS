import { UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';

function mockJwt() {
  return {
    signAsync: jest.fn().mockResolvedValue('tok-baru'),
    verifyAsync: jest.fn().mockResolvedValue({ sub: 'u1' }),
  };
}

function mockPrisma(sesi: unknown = null, user: unknown = null) {
  return {
    pengguna: { findUnique: jest.fn().mockResolvedValue(user) },
    sesi: {
      create: jest.fn().mockResolvedValue({}),
      findUnique: jest.fn().mockResolvedValue(sesi),
      update: jest.fn().mockResolvedValue({}),
      updateMany: jest.fn().mockResolvedValue({}),
    },
    perangkat: { upsert: jest.fn().mockResolvedValue({}) },
  };
}

const USER = { id: 'u1', email: 'a@b.id', role: 'SUPER_ADMIN', guruId: null, guru: null };

describe('AuthService', () => {
  it('login sukses + sesi dibuat', async () => {
    const hash = await bcrypt.hash('secret123', 4);
    const prisma = mockPrisma(null, { ...USER, passwordHash: hash });
    const svc = new AuthService(prisma as never, mockJwt() as never);
    const res = await svc.login({ email: 'a@b.id', password: 'secret123' });
    expect(res.data.accessToken).toBe('tok-baru');
    expect(res.refreshToken).toBe('tok-baru');
    expect(prisma.sesi.create).toHaveBeenCalled();
  });

  it('login password salah (401), tanpa sesi baru', async () => {
    const hash = await bcrypt.hash('secret123', 4);
    const prisma = mockPrisma(null, { ...USER, passwordHash: hash });
    const svc = new AuthService(prisma as never, mockJwt() as never);
    await expect(svc.login({ email: 'a@b.id', password: 'salah1234' })).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    expect(prisma.sesi.create).not.toHaveBeenCalled();
  });

  it('refresh valid -> sesi lama dihanguskan + pasangan baru', async () => {
    const prisma = mockPrisma(
      { id: 's1', penggunaId: 'u1', dicabut: false, expiresAt: new Date(Date.now() + 3600000) },
      USER,
    );
    const svc = new AuthService(prisma as never, mockJwt() as never);
    const res = await svc.refresh('tok-lama');
    expect(res.data.accessToken).toBe('tok-baru');
    expect(prisma.sesi.update).toHaveBeenCalledWith({
      where: { id: 's1' },
      data: { dicabut: true },
    });
    expect(prisma.sesi.create).toHaveBeenCalled();
  });

  it('refresh yang sudah dihanguskan ditolak (anti replay)', async () => {
    const prisma = mockPrisma(
      { id: 's1', penggunaId: 'u1', dicabut: true, expiresAt: new Date(Date.now() + 3600000) },
      USER,
    );
    const svc = new AuthService(prisma as never, mockJwt() as never);
    await expect(svc.refresh('tok-lama')).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('refresh tanpa cookie ditolak', async () => {
    const svc = new AuthService(mockPrisma() as never, mockJwt() as never);
    await expect(svc.refresh(undefined)).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('logout mencabut sesi device ybs', async () => {
    const prisma = mockPrisma();
    const svc = new AuthService(prisma as never, mockJwt() as never);
    await svc.logout('tok-lama');
    expect(prisma.sesi.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ data: { dicabut: true } }),
    );
  });

  it('daftarPerangkat upsert FCM token', async () => {
    const prisma = mockPrisma();
    const svc = new AuthService(prisma as never, mockJwt() as never);
    await svc.daftarPerangkat('u1', { fcmToken: 'fcm-1', platform: 'ANDROID' });
    expect(prisma.perangkat.upsert).toHaveBeenCalled();
  });
});
