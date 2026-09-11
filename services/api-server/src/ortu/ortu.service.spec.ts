import { BadRequestException } from '@nestjs/common';
import { OrtuService } from './ortu.service';
import type { JwtPayload } from '../common/decorators/current-user.decorator';

const ortuUser: JwtPayload = { sub: 'u-ortu', role: 'ORANG_TUA' };

describe('OrtuService', () => {
  it('berhasil menampilkan daftar anak terhubung', async () => {
    const prisma = {
      ortuSiswa: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'os1',
            ortuId: 'u-ortu',
            siswaId: 's1',
            hubungan: 'AYAH',
            siswa: {
              id: 's1',
              nama: 'Budi Santoso',
              nisn: '1234567890',
              rombelId: 'r1',
              rombel: { id: 'r1', nama: '7A' },
            },
          },
        ]),
      },
    };
    const svc = new OrtuService(prisma as never);
    const res = await svc.listAnak(ortuUser);
    expect(res.data).toHaveLength(1);
    expect(res.data[0]).toHaveProperty('hubungan', 'AYAH');
    expect(res.data[0].siswa).toHaveProperty('nama', 'Budi Santoso');
  });

  it('hubungkanAnak sukses bila akun ortu dan data siswa valid', async () => {
    const prisma = {
      pengguna: {
        findUnique: jest.fn().mockResolvedValue({ id: 'u-ortu', role: 'ORANG_TUA' }),
      },
      siswa: {
        findUnique: jest.fn().mockResolvedValue({ id: 's1', nama: 'Budi' }),
      },
      ortuSiswa: {
        upsert: jest.fn().mockResolvedValue({
          id: 'os1',
          ortuId: 'u-ortu',
          siswaId: 's1',
          hubungan: 'IBU',
        }),
      },
    };
    const svc = new OrtuService(prisma as never);
    const res = await svc.hubungkanAnak({
      ortuId: 'u-ortu',
      siswaId: 's1',
      hubungan: 'IBU',
    });
    expect(res.data).toHaveProperty('id', 'os1');
  });

  it('hubungkanAnak gagal jika akun bukan role ORANG_TUA', async () => {
    const prisma = {
      pengguna: {
        findUnique: jest.fn().mockResolvedValue({ id: 'u-guru', role: 'GURU_MAPEL' }),
      },
      siswa: {
        findUnique: jest.fn().mockResolvedValue({ id: 's1' }),
      },
    };
    const svc = new OrtuService(prisma as never);
    await expect(
      svc.hubungkanAnak({ ortuId: 'u-guru', siswaId: 's1' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
