import { ReportsService } from './reports.service';

function mockPrisma(absensi: unknown[] = [], nilai: unknown[] = []) {
  return {
    absensi: { findMany: jest.fn().mockResolvedValue(absensi) },
    nilai: { findMany: jest.fn().mockResolvedValue(nilai) },
  };
}

const ABSEN = {
  tanggal: new Date('2026-09-10T00:00:00.000Z'),
  jamKe: 1,
  status: 'HADIR',
  keterangan: null,
  siswa: { nama: 'Budi', rombel: { nama: '7A' } },
  mapel: { nama: 'MTK' },
};

describe('ReportsService', () => {
  it('absensiXlsx menghasilkan file zip xlsx valid', async () => {
    const svc = new ReportsService(mockPrisma([ABSEN]) as never);
    const { namaFile, buffer } = await svc.absensiXlsx({});
    expect(namaFile).toBe('rekap-absensi.xlsx');
    expect(buffer.subarray(0, 2).toString()).toBe('PK');
    expect(buffer.length).toBeGreaterThan(1000);
  });

  it('nilaiXlsx kosong tetap menghasilkan header saja', async () => {
    const svc = new ReportsService(mockPrisma([], []) as never);
    const { buffer } = await svc.nilaiXlsx({});
    expect(buffer.subarray(0, 2).toString()).toBe('PK');
  });
});
