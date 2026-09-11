import { Injectable } from '@nestjs/common';
import ExcelJS from 'exceljs';
import { PrismaService } from '../prisma/prisma.service';
import { ExportAbsensiDto, ExportNilaiDto } from './dto/export.dto';

/**
 * Export dibuat di SERVER (docs/04): client hanya unduh file.
 * Dibatasi 5000 baris per file agar tidak membebani memori.
 */
const MAKS_BARIS = 5000;

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  private tgl(iso?: string): Date | undefined {
    return iso ? new Date(`${iso}T00:00:00.000Z`) : undefined;
  }

  async absensiXlsx(q: ExportAbsensiDto): Promise<{ namaFile: string; buffer: Buffer }> {
    const dari = this.tgl(q.dari);
    const sampai = this.tgl(q.sampai);
    const rows = await this.prisma.absensi.findMany({
      where: {
        ...(q.mapelId ? { mapelId: q.mapelId } : {}),
        ...(q.rombelId ? { siswa: { rombelId: q.rombelId } } : {}),
        ...(dari || sampai
          ? { tanggal: { ...(dari ? { gte: dari } : {}), ...(sampai ? { lte: sampai } : {}) } }
          : {}),
      },
      take: MAKS_BARIS,
      orderBy: [{ tanggal: 'asc' }, { jamKe: 'asc' }],
      include: {
        siswa: { select: { nama: true, rombel: { select: { nama: true } } } },
        mapel: { select: { nama: true } },
      },
    });
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Absensi');
    ws.columns = [
      { header: 'Tanggal', key: 'tanggal', width: 14 },
      { header: 'Rombel', key: 'rombel', width: 10 },
      { header: 'Nama Siswa', key: 'nama', width: 30 },
      { header: 'Mapel', key: 'mapel', width: 20 },
      { header: 'Jam Ke', key: 'jamKe', width: 8 },
      { header: 'Status', key: 'status', width: 10 },
      { header: 'Keterangan', key: 'keterangan', width: 30 },
    ];
    for (const r of rows) {
      ws.addRow({
        tanggal: r.tanggal.toISOString().slice(0, 10),
        rombel: r.siswa.rombel?.nama ?? '',
        nama: r.siswa.nama,
        mapel: r.mapel.nama,
        jamKe: r.jamKe,
        status: r.status,
        keterangan: r.keterangan ?? '',
      });
    }
    ws.getRow(1).font = { bold: true };
    const buffer = Buffer.from(await wb.xlsx.writeBuffer());
    return { namaFile: 'rekap-absensi.xlsx', buffer };
  }

  async nilaiXlsx(q: ExportNilaiDto): Promise<{ namaFile: string; buffer: Buffer }> {
    const rows = await this.prisma.nilai.findMany({
      where: {
        ...(q.mapelId ? { mapelId: q.mapelId } : {}),
        ...(q.semester ? { semester: q.semester } : {}),
        ...(q.jenis ? { jenis: q.jenis } : {}),
        ...(q.rombelId ? { siswa: { rombelId: q.rombelId } } : {}),
      },
      take: MAKS_BARIS,
      orderBy: { createdAt: 'desc' },
      include: {
        siswa: { select: { nama: true, rombel: { select: { nama: true } } } },
        mapel: { select: { nama: true } },
      },
    });
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Nilai');
    ws.columns = [
      { header: 'Rombel', key: 'rombel', width: 10 },
      { header: 'Nama Siswa', key: 'nama', width: 30 },
      { header: 'Mapel', key: 'mapel', width: 20 },
      { header: 'Jenis', key: 'jenis', width: 10 },
      { header: 'Semester', key: 'semester', width: 10 },
      { header: 'Nilai', key: 'nilai', width: 10 },
    ];
    for (const r of rows) {
      ws.addRow({
        rombel: r.siswa.rombel?.nama ?? '',
        nama: r.siswa.nama,
        mapel: r.mapel.nama,
        jenis: r.jenis,
        semester: r.semester,
        nilai: Number(r.nilai),
      });
    }
    ws.getRow(1).font = { bold: true };
    const buffer = Buffer.from(await wb.xlsx.writeBuffer());
    return { namaFile: 'rekap-nilai.xlsx', buffer };
  }
}
