import { BadRequestException, Injectable } from '@nestjs/common';
import ExcelJS from 'exceljs';
import { PrismaService } from '../prisma/prisma.service';

export interface BarisGagal {
  baris: number;
  nisn: string;
  alasan: string;
}

/**
 * Import massal siswa dari xlsx (migrasi data awal sekolah).
 * Kolom header: NISN*, Nama*, Rombel, JK, TglLahir(YYYY-MM-DD).
 * NISN ada -> update; baru -> create. Baris gagal dilaporkan, tidak menggagalkan file.
 */
@Injectable()
export class ImportService {
  constructor(private readonly prisma: PrismaService) {}

  async importSiswa(file: { buffer: Buffer } | undefined, tahunAjaranId?: string) {
    if (!file?.buffer?.length) throw new BadRequestException('File xlsx wajib diisi');
    if (file.buffer[0] !== 0x50 || file.buffer[1] !== 0x4b) {
      throw new BadRequestException('File harus .xlsx yang valid');
    }
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(file.buffer as unknown as ExcelJS.Buffer);
    const ws = wb.worksheets[0];
    if (!ws) throw new BadRequestException('Sheet pertama tidak ditemukan');

    const header = (ws.getRow(1).values as unknown[]).map((v) =>
      String(v ?? '').trim().toLowerCase(),
    );
    const col = (nama: string) => {
      const i = header.indexOf(nama);
      return i < 0 ? -1 : i;
    };
    const cNisn = col('nisn');
    const cNama = col('nama');
    if (cNisn < 0 || cNama < 0) throw new BadRequestException('Header wajib: NISN, Nama');
    const cRombel = col('rombel');
    const cJk = col('jk');
    const cLahir = col('tgllahir');

    let taId = tahunAjaranId;
    if (!taId) {
      const aktif = await this.prisma.tahunAjaran.findFirst({ where: { isAktif: true } });
      if (!aktif) throw new BadRequestException('tahunAjaranId wajib (tidak ada TA aktif)');
      taId = aktif.id;
    }
    const rombels = await this.prisma.rombel.findMany({
      where: { tahunAjaranId: taId, deletedAt: null },
    });
    const rombelMap = new Map(rombels.map((r) => [r.nama.trim().toUpperCase(), r.id]));

    let dibuat = 0;
    let diperbarui = 0;
    const gagal: BarisGagal[] = [];
    for (let i = 2; i <= ws.rowCount; i += 1) {
      const vals = ws.getRow(i).values as unknown[];
      const nisn = String(vals[cNisn] ?? '').trim();
      const nama = String(vals[cNama] ?? '').trim();
      try {
        if (!/^\d{10}$/.test(nisn)) throw new Error('NISN harus 10 digit angka');
        if (!nama) throw new Error('Nama kosong');
        let rombelId: string | undefined;
        if (cRombel >= 0 && vals[cRombel]) {
          const kunci = String(vals[cRombel]).trim().toUpperCase();
          rombelId = rombelMap.get(kunci);
          if (!rombelId) throw new Error(`Rombel ${kunci} tidak ada di tahun ajaran ini`);
        }
        const data = {
          nama,
          rombelId,
          jenisKelamin: cJk >= 0 && vals[cJk] ? String(vals[cJk]).trim() : undefined,
          tglLahir: cLahir >= 0 && vals[cLahir] ? new Date(String(vals[cLahir])) : undefined,
        };
        const ada = await this.prisma.siswa.findUnique({ where: { nisn } });
        if (ada) {
          await this.prisma.siswa.update({ where: { nisn }, data });
          diperbarui += 1;
        } else {
          await this.prisma.siswa.create({ data: { nisn, ...data } });
          dibuat += 1;
        }
      } catch (e) {
        gagal.push({ baris: i, nisn, alasan: (e as Error).message });
      }
    }
    return { data: { dibuat, diperbarui, gagal } };
  }
}
