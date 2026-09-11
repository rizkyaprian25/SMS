import { DashboardService } from './dashboard.service';

function mockPrisma() {
  return {
    siswa: { count: jest.fn().mockResolvedValue(1000) },
    guru: { count: jest.fn().mockResolvedValue(60) },
    rombel: { count: jest.fn().mockResolvedValue(22) },
    absensi: { count: jest.fn().mockResolvedValueOnce(900).mockResolvedValueOnce(100) },
  };
}

describe('DashboardService', () => {
  it('ringkasan mengembalikan 5 angka kunci', async () => {
    const svc = new DashboardService(mockPrisma() as never);
    const res = await svc.ringkasan();
    expect(res.data).toMatchObject({
      totalSiswa: 1000,
      totalGuru: 60,
      totalRombel: 22,
      hadirHariIni: 900,
      tidakHadirHariIni: 100,
    });
  });
});
