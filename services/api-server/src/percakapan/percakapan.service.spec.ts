import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { PercakapanService } from './percakapan.service';
import type { JwtPayload } from '../common/decorators/current-user.decorator';

const ortuUser: JwtPayload = { sub: 'u-ortu', role: 'ORANG_TUA' };
const foreignUser: JwtPayload = { sub: 'u-other', role: 'ORANG_TUA' };

describe('PercakapanService', () => {
  it('orang tua resmi berhasil membuat percakapan dengan wali kelas', async () => {
    const prisma = {
      siswa: {
        findUnique: jest.fn().mockResolvedValue({
          id: 's1',
          rombel: { id: 'r1', waliKelasId: 'g-wali' },
        }),
      },
      ortuSiswa: {
        findUnique: jest.fn().mockResolvedValue({ id: 'os1', ortuId: 'u-ortu', siswaId: 's1' }),
      },
      percakapan: {
        upsert: jest.fn().mockResolvedValue({
          id: 'c1',
          waliId: 'g-wali',
          ortuId: 'u-ortu',
          siswaId: 's1',
        }),
      },
    };
    const svc = new PercakapanService(prisma as never);
    const res = await svc.buat(ortuUser, { siswaId: 's1' });
    expect(res.data).toHaveProperty('id', 'c1');
    expect(prisma.percakapan.upsert).toHaveBeenCalled();
  });

  it('orang tua bukan wali/ortu resmi siswa ditolak (403)', async () => {
    const prisma = {
      siswa: {
        findUnique: jest.fn().mockResolvedValue({
          id: 's1',
          rombel: { id: 'r1', waliKelasId: 'g-wali' },
        }),
      },
      ortuSiswa: {
        findUnique: jest.fn().mockResolvedValue(null),
      },
    };
    const svc = new PercakapanService(prisma as never);
    await expect(svc.buat(foreignUser, { siswaId: 's1' })).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('siswa belum memiliki wali kelas ditolak (BadRequest)', async () => {
    const prisma = {
      siswa: {
        findUnique: jest.fn().mockResolvedValue({
          id: 's1',
          rombel: { id: 'r1', waliKelasId: null },
        }),
      },
    };
    const svc = new PercakapanService(prisma as never);
    await expect(svc.buat(ortuUser, { siswaId: 's1' })).rejects.toBeInstanceOf(BadRequestException);
  });

  it('peserta percakapan berhasil mengirim pesan', async () => {
    const prisma = {
      percakapan: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'c1',
          ortuId: 'u-ortu',
          waliId: 'g-wali',
        }),
        update: jest.fn().mockResolvedValue({}),
      },
      pesan: {
        create: jest.fn().mockResolvedValue({
          id: 'm1',
          percakapanId: 'c1',
          isi: 'Halo Bapak Wali Kelas',
          pengirimId: 'u-ortu',
        }),
      },
      $transaction: jest.fn().mockImplementation((promises) => Promise.all(promises)),
    };
    const svc = new PercakapanService(prisma as never);
    const res = await svc.kirimPesan(ortuUser, 'c1', { isi: 'Halo Bapak Wali Kelas' });
    expect(res.data).toHaveProperty('id', 'm1');
    expect(prisma.pesan.create).toHaveBeenCalled();
  });

  it('bukan peserta percakapan ditolak mengirim pesan (403)', async () => {
    const prisma = {
      percakapan: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'c1',
          ortuId: 'u-ortu',
          waliId: 'g-wali',
        }),
      },
    };
    const svc = new PercakapanService(prisma as never);
    await expect(
      svc.kirimPesan(foreignUser, 'c1', { isi: 'Pesan penyusup' }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
