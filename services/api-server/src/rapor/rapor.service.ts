import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { PrismaService } from '../prisma/prisma.service';
import type { JwtPayload } from '../common/decorators/current-user.decorator';
import { QueryRaporDto } from './dto/query-rapor.dto';

export interface RaporMapel {
  mapelId: string;
  mapelNama: string;
  jumlah: number;
  rataRata: number;
  capaian: string;
}

/**
 * Rapor digital (docs/07): rekap JSON + PDF per semester.
 * PDF dibuat di server (pdf-lib, tanpa chromium) agar ringan di VPS.
 */
@Injectable()
export class RaporService {
  constructor(private readonly prisma: PrismaService) {}

  capaianUntuk(rata: number): string {
    if (rata >= 90) return 'Sangat Baik';
    if (rata >= 80) return 'Baik';
    if (rata >= 70) return 'Cukup';
    return 'Perlu Bimbingan';
  }

  async rekap(siswaId: string, q: QueryRaporDto, user: JwtPayload) {
    const siswa = await this.prisma.siswa.findUnique({
      where: { id: siswaId },
      include: { rombel: { select: { id: true, nama: true, waliKelasId: true } } },
    });
    if (!siswa || siswa.deletedAt) throw new NotFoundException('Siswa tidak ditemukan');
    // Wali hanya rapor kelas binaannya (GURU_MAPEL tidak boleh buka rapor).
    if (user.role === 'WALI_KELAS') {
      if (!user.guruId || siswa.rombel?.waliKelasId !== user.guruId) {
        throw new ForbiddenException('Di luar kelas binaan Anda');
      }
    }
    let tahunAjaranId = q.tahunAjaranId;
    if (!tahunAjaranId) {
      const aktif = await this.prisma.tahunAjaran.findFirst({ where: { isAktif: true } });
      if (!aktif) throw new BadRequestException('tahunAjaranId wajib diisi (tidak ada TA aktif)');
      tahunAjaranId = aktif.id;
    }
    const semester = q.semester ?? 'GANJIL';
    const rows = await this.prisma.nilai.findMany({
      where: { siswaId, tahunAjaranId, semester },
      include: { mapel: { select: { id: true, nama: true } } },
    });
    const mapelIds = [...new Set(rows.map((r) => r.mapelId))];
    const daftarBobot = await this.prisma.bobotNilai.findMany({
      where: {
        mapelId: { in: mapelIds },
        tahunAjaranId,
      },
    });

    const DEFAULT_BOBOT = { bobotTugas: 20, bobotHarian: 30, bobotUts: 25, bobotUas: 25 };
    const bobotPerMapel = new Map<string, { bobotTugas: number; bobotHarian: number; bobotUts: number; bobotUas: number }>();
    for (const b of daftarBobot) {
      bobotPerMapel.set(b.mapelId, {
        bobotTugas: b.bobotTugas,
        bobotHarian: b.bobotHarian,
        bobotUts: b.bobotUts,
        bobotUas: b.bobotUas,
      });
    }

    const perMapel = new Map<
      string,
      {
        nama: string;
        tugas: number[];
        harian: number[];
        uts: number[];
        uas: number[];
      }
    >();

    for (const n of rows) {
      const e = perMapel.get(n.mapelId) ?? {
        nama: n.mapel.nama,
        tugas: [],
        harian: [],
        uts: [],
        uas: [],
      };
      const val = Number(n.nilai);
      if (n.jenis === 'TUGAS') e.tugas.push(val);
      else if (n.jenis === 'HARIAN') e.harian.push(val);
      else if (n.jenis === 'UTS') e.uts.push(val);
      else if (n.jenis === 'UAS') e.uas.push(val);
      perMapel.set(n.mapelId, e);
    }

    const mapel: RaporMapel[] = [...perMapel.entries()].map(([mapelId, e]) => {
      const bobot = bobotPerMapel.get(mapelId) ?? DEFAULT_BOBOT;
      let totalSkorTertimbang = 0;
      let totalBobotAktif = 0;
      let totalCount = 0;

      const komponen = [
        { nilaiList: e.tugas, bobotVal: bobot.bobotTugas },
        { nilaiList: e.harian, bobotVal: bobot.bobotHarian },
        { nilaiList: e.uts, bobotVal: bobot.bobotUts },
        { nilaiList: e.uas, bobotVal: bobot.bobotUas },
      ];

      for (const k of komponen) {
        if (k.nilaiList.length > 0) {
          const avg = k.nilaiList.reduce((a, b) => a + b, 0) / k.nilaiList.length;
          totalSkorTertimbang += avg * k.bobotVal;
          totalBobotAktif += k.bobotVal;
          totalCount += k.nilaiList.length;
        }
      }

      const rataRata =
        totalBobotAktif > 0
          ? Math.round((totalSkorTertimbang / totalBobotAktif) * 100) / 100
          : 0;

      return {
        mapelId,
        mapelNama: e.nama,
        jumlah: totalCount,
        rataRata,
        capaian: this.capaianUntuk(rataRata),
      };
    });
    const rataKeseluruhan =
      mapel.length === 0
        ? 0
        : Math.round((mapel.reduce((a, m) => a + m.rataRata, 0) / mapel.length) * 100) / 100;
    return {
      data: {
        siswa: { id: siswa.id, nama: siswa.nama, nisn: siswa.nisn, rombel: siswa.rombel?.nama ?? null },
        tahunAjaranId,
        semester,
        mapel,
        rataKeseluruhan,
      },
    };
  }

  async pdf(siswaId: string, q: QueryRaporDto, user: JwtPayload): Promise<{ namaFile: string; buffer: Buffer }> {
    const { data } = await this.rekap(siswaId, q, user);
    const doc = await PDFDocument.create();
    let page = doc.addPage([595, 842]);
    const font = await doc.embedFont(StandardFonts.Helvetica);
    const bold = await doc.embedFont(StandardFonts.HelveticaBold);
    let y = 800;
    const tulis = (teks: string, ukuran = 11, tebal = false) => {
      if (y < 60) {
        page = doc.addPage([595, 842]);
        y = 800;
      }
      page.drawText(teks, { x: 50, y, size: ukuran, font: tebal ? bold : font, color: rgb(0, 0, 0) });
      y -= ukuran + 6;
    };
    tulis('RAPOR DIGITAL — SMP NEGERI', 14, true);
    tulis(`Nama: ${data.siswa.nama}   NISN: ${data.siswa.nisn}`);
    tulis(`Rombel: ${data.siswa.rombel ?? '-'}   Semester: ${data.semester}`);
    y -= 6;
    tulis('No  Mata Pelajaran              Rata-rata   Capaian', 11, true);
    data.mapel.forEach((m, i) => {
      tulis(`${i + 1}.  ${m.mapelNama}  —  ${m.rataRata}  (${m.capaian})`);
    });
    y -= 6;
    tulis(`Rata-rata keseluruhan: ${data.rataKeseluruhan}`, 12, true);
    const bytes = await doc.save();
    const namaFile = `rapor-${data.siswa.nisn}-${data.semester}.pdf`;
    return { namaFile, buffer: Buffer.from(bytes) };
  }
}
