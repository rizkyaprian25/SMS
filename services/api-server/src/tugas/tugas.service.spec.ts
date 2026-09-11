import { ForbiddenException } from '@nestjs/common';
import { TugasService } from './tugas.service';
import type { JwtPayload } from '../common/decorators/current-user.decorator';

const guruUser: JwtPayload = { sub: 'u-guru', role: 'GURU_MAPEL', guruId: 'g1' };
const siswaUser: JwtPayload = { sub: 'u-siswa', role: 'SISWA', siswaId: 's1' };

describe('TugasService', () => {
  it('guru pengampu berhasil membuat tugas baru', async () => {
    const prisma = {
      guruMapel: { findUnique: jest.fn().mockResolvedValue({}) },
      rombel: { findUnique: jest.fn().mockResolvedValue({ id: 'r1' }) },
      tugas: {
        create: jest.fn().mockResolvedValue({
          id: 't1',
          judul: 'Tugas Matematika 1',
          rombel: { id: 'r1', nama: '7A' },
          mapel: { id: 'm1', nama: 'Matematika' },
        }),
      },
    };
    const svc = new TugasService(prisma as never);
    const res = await svc.create(guruUser, {
      rombelId: 'r1',
      mapelId: 'm1',
      judul: 'Tugas Matematika 1',
      deskripsi: 'Kerjakan hal 20',
      tenggatWaktu: '2026-10-01T23:59:59Z',
    });
    expect(res.data).toHaveProperty('id', 't1');
    expect(prisma.tugas.create).toHaveBeenCalled();
  });

  it('guru ditolak membuat tugas jika bukan pengampu mapel', async () => {
    const prisma = {
      guruMapel: { findUnique: jest.fn().mockResolvedValue(null) },
    };
    const svc = new TugasService(prisma as never);
    await expect(
      svc.create(guruUser, {
        rombelId: 'r1',
        mapelId: 'm1',
        judul: 'Tugas',
        deskripsi: 'Deskripsi',
        tenggatWaktu: '2026-10-01T23:59:59Z',
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('siswa kelas bersangkutan berhasil mengumpulkan tugas', async () => {
    const prisma = {
      tugas: { findUnique: jest.fn().mockResolvedValue({ id: 't1', rombelId: 'r1' }) },
      siswa: { findUnique: jest.fn().mockResolvedValue({ id: 's1', rombelId: 'r1' }) },
      pengumpulanTugas: {
        upsert: jest.fn().mockResolvedValue({
          id: 'p1',
          tugasId: 't1',
          siswaId: 's1',
          fileUrl: 'https://minio.local/sms/tugas1.pdf',
        }),
      },
    };
    const svc = new TugasService(prisma as never);
    const res = await svc.kumpul(siswaUser, 't1', {
      fileUrl: 'https://minio.local/sms/tugas1.pdf',
      catatan: 'Sudah selesai pak',
    });
    expect(res.data).toHaveProperty('id', 'p1');
    expect(prisma.pengumpulanTugas.upsert).toHaveBeenCalled();
  });

  it('siswa dari rombel lain ditolak mengumpulkan tugas', async () => {
    const prisma = {
      tugas: { findUnique: jest.fn().mockResolvedValue({ id: 't1', rombelId: 'r1' }) },
      siswa: { findUnique: jest.fn().mockResolvedValue({ id: 's1', rombelId: 'r2' }) },
    };
    const svc = new TugasService(prisma as never);
    await expect(
      svc.kumpul(siswaUser, 't1', { fileUrl: 'https://minio.local/sms/tugas1.pdf' }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('guru pengampu dapat memberi nilai tugas', async () => {
    const prisma = {
      pengumpulanTugas: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'p1',
          tugas: { guruId: 'g1' },
        }),
        update: jest.fn().mockResolvedValue({
          id: 'p1',
          nilai: 90,
          catatanGuru: 'Sangat baik',
        }),
      },
    };
    const svc = new TugasService(prisma as never);
    const res = await svc.beriNilai(guruUser, 'p1', { nilai: 90, catatanGuru: 'Sangat baik' });
    expect(res.data).toHaveProperty('nilai', 90);
  });
});
