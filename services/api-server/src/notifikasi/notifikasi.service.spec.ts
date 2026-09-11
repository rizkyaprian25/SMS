import { Role } from '@prisma/client';
import { FcmService } from './fcm.service';
import { NotifikasiService } from './notifikasi.service';

jest.mock('firebase-admin/app', () => ({
  cert: jest.fn(),
  initializeApp: jest.fn(),
  getApps: jest.fn(() => []),
}));
jest.mock('firebase-admin/messaging', () => ({ getMessaging: jest.fn() }));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { getMessaging } = require('firebase-admin/messaging') as {
  getMessaging: jest.Mock;
};

function mockPrisma(devices: string[] = []) {
  return {
    pengguna: { findMany: jest.fn().mockResolvedValue([{ id: 'u1' }]) },
    perangkat: {
      findMany: jest.fn().mockResolvedValue(devices.map((fcmToken) => ({ fcmToken }))),
      deleteMany: jest.fn().mockResolvedValue({}),
    },
    notifikasi: {
      create: jest.fn().mockImplementation((a: { data: unknown }) => Promise.resolve(a.data)),
      findMany: jest.fn().mockResolvedValue([]),
      count: jest.fn().mockResolvedValue(0),
    },
  };
}

describe('FcmService', () => {
  it('mode LOG tanpa kredensial (tidak kirim, tidak error)', async () => {
    delete process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
    const svc = new FcmService(mockPrisma() as never);
    const res = await svc.kirim(['tok'], 'Judul', 'Isi');
    expect(res).toMatchObject({ sukses: 0, gagal: 0, mode: 'LOG' });
  });

  it('membersihkan token mati setelah kirim', async () => {
    process.env.FIREBASE_SERVICE_ACCOUNT_JSON = '{"project_id":"x"}';
    getMessaging.mockReturnValue({
      sendEachForMulticast: jest.fn().mockResolvedValue({
        successCount: 1,
        failureCount: 1,
        responses: [
          { success: true },
          { success: false, error: { code: 'messaging/registration-token-not-registered' } },
        ],
      }),
    });
    const prisma = mockPrisma();
    const svc = new FcmService(prisma as never);
    const res = await svc.kirim(['ok', 'mati'], 'J', 'I');
    expect(res).toMatchObject({ sukses: 1, gagal: 1, mode: 'FCM' });
    expect(prisma.perangkat.deleteMany).toHaveBeenCalledWith({
      where: { fcmToken: { in: ['mati'] } },
    });
    delete process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  });
});

describe('NotifikasiService', () => {
  it('broadcast mencatat log walau tanpa device', async () => {
    const prisma = mockPrisma([]);
    const svc = new NotifikasiService(prisma as never, new FcmService(prisma as never));
    const res = await svc.broadcastPengumuman({
      judul: 'Libur',
      isi: 'Besok libur',
      targetRole: [Role.GURU_MAPEL],
    });
    expect(res.data).toMatchObject({ judul: 'Libur', mode: 'LOG' });
    expect(prisma.notifikasi.create).toHaveBeenCalled();
  });
});
