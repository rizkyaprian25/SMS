import { BadRequestException } from '@nestjs/common';
import ExcelJS from 'exceljs';
import { ImportService } from './import.service';

async function xlsxBuffer(baris: unknown[][]): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Siswa');
  for (const b of baris) ws.addRow(b);
  return Buffer.from(await wb.xlsx.writeBuffer());
}

function mockPrisma() {
  return {
    tahunAjaran: { findFirst: jest.fn().mockResolvedValue({ id: 'ta1' }) },
    rombel: {
      findMany: jest.fn().mockResolvedValue([{ id: 'r1', nama: '7A' }]),
    },
    siswa: {
      findUnique: jest.fn().mockImplementation(({ where }: { where: { nisn: string } }) =>
        Promise.resolve(where.nisn === '1234567890' ? { id: 's1' } : null),
      ),
      create: jest.fn().mockResolvedValue({}),
      update: jest.fn().mockResolvedValue({}),
    },
  };
}

describe('ImportService', () => {
  it('dibuat + diperbarui + gagal dilaporkan per baris', async () => {
    const prisma = mockPrisma();
    const svc = new ImportService(prisma as never);
    const buf = await xlsxBuffer([
      ['NISN', 'Nama', 'Rombel'],
      ['0987654321', 'Ani', '7A'], // baru
      ['1234567890', 'Budi X', '7A'], // update
      ['abc', 'Caca', '7A'], // NISN salah
      ['1111111111', 'Dedi', '9Z'], // rombel asing
    ]);
    const res = await svc.importSiswa({ buffer: buf });
    expect(res.data).toMatchObject({ dibuat: 1, diperbarui: 1 });
    expect(res.data.gagal).toHaveLength(2);
    expect(res.data.gagal[0]).toMatchObject({ baris: 4 });
  });

  it('menolak file bukan xlsx', async () => {
    const svc = new ImportService(mockPrisma() as never);
    await expect(svc.importSiswa({ buffer: Buffer.from('bukan-excel') })).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('menolak header tanpa NISN/Nama', async () => {
    const svc = new ImportService(mockPrisma() as never);
    const buf = await xlsxBuffer([['Foo', 'Bar']]);
    await expect(svc.importSiswa({ buffer: buf })).rejects.toBeInstanceOf(BadRequestException);
  });
});
