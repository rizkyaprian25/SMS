import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { withinRadius } from '../common/utils/haversine';
import { hariIniUTC } from '../common/dates';
import type { JwtPayload } from '../common/decorators/current-user.decorator';
import { PresensiFallbackDto, PresensiMasukDto } from './dto/presensi.dto';
import { QueryRekapGuruDto, VerifikasiFallbackDto } from './dto/query-rekap.dto';

/**
 * Presensi guru via wajah (docs/09). Semua ambang + geofence dicek di SERVER:
 * - liveness wajib true, face_score >= FACE_MIN_SCORE (default 0.6)
 * - di luar radius sekolah tetap dicatat + flag di_luar_area (dinas luar)
 * - 1 baris per (guru, tanggal): masuk = insert, pulang = update
 * - gagal 3x di HP -> fallback manual (PENDING) -> verifikasi admin
 */
@Injectable()
export class AbsensiGuruService {
  constructor(private readonly prisma: PrismaService) {}

  private skorMinimal(): number {
    return Number(process.env.FACE_MIN_SCORE ?? 0.6);
  }

  private geofence() {
    return {
      lat: Number(process.env.GEOFENCE_LAT ?? 0),
      lng: Number(process.env.GEOFENCE_LNG ?? 0),
      radiusM: Number(process.env.GEOFENCE_RADIUS_M ?? 200),
    };
  }

  private jamMasukNormal(): { jam: number; menit: number } {
    const [jam, menit] = (process.env.SEKOLAH_JAM_MASUK ?? '07:00').split(':').map(Number);
    return { jam, menit };
  }

  private diLuarArea(lat?: number, lng?: number): boolean {
    if (lat === undefined || lng === undefined) return false;
    const g = this.geofence();
    if (!g.lat && !g.lng) return false; // geofence belum dikonfigurasi
    return !withinRadius(lat, lng, g.lat, g.lng, g.radiusM);
  }

  async masuk(user: JwtPayload, dto: PresensiMasukDto) {
    if (!user.guruId) throw new ForbiddenException('Akun belum terhubung ke data guru');
    if (!dto.liveness) throw new UnauthorizedException('Liveness tidak lolos — foto/video ditolak');
    if (dto.faceScore < this.skorMinimal()) {
      throw new UnauthorizedException('Wajah tidak cocok — coba lagi atau pakai fallback manual');
    }
    const tanggal = hariIniUTC();
    const ada = await this.prisma.absensiGuru.findUnique({
      where: { guruId_tanggal: { guruId: user.guruId, tanggal } },
    });
    if (ada?.jamMasuk) throw new ConflictException('Sudah presensi masuk hari ini');
    const sekarang = new Date(); // jam server, bukan jam HP
    const row = ada
      ? await this.prisma.absensiGuru.update({
          where: { id: ada.id },
          data: {
            jamMasuk: sekarang,
            metode: 'FACE',
            statusVerifikasi: 'TERVERIFIKASI',
            lat: dto.lat,
            lng: dto.lng,
            diLuarArea: this.diLuarArea(dto.lat, dto.lng),
            faceScore: dto.faceScore,
          },
        })
      : await this.prisma.absensiGuru.create({
          data: {
            guruId: user.guruId,
            tanggal,
            jamMasuk: sekarang,
            metode: 'FACE',
            statusVerifikasi: 'TERVERIFIKASI',
            lat: dto.lat,
            lng: dto.lng,
            diLuarArea: this.diLuarArea(dto.lat, dto.lng),
            faceScore: dto.faceScore,
          },
        });
    return { data: row };
  }

  async pulang(user: JwtPayload) {
    if (!user.guruId) throw new ForbiddenException('Akun belum terhubung ke data guru');
    const tanggal = hariIniUTC();
    const ada = await this.prisma.absensiGuru.findUnique({
      where: { guruId_tanggal: { guruId: user.guruId, tanggal } },
    });
    if (!ada?.jamMasuk) throw new NotFoundException('Belum presensi masuk hari ini');
    if (ada.jamPulang) throw new ConflictException('Sudah presensi pulang hari ini');
    const row = await this.prisma.absensiGuru.update({
      where: { id: ada.id },
      data: { jamPulang: new Date() },
    });
    return { data: row };
  }

  async fallback(user: JwtPayload, dto: PresensiFallbackDto) {
    if (!user.guruId) throw new ForbiddenException('Akun belum terhubung ke data guru');
    const tanggal = hariIniUTC();
    const ada = await this.prisma.absensiGuru.findUnique({
      where: { guruId_tanggal: { guruId: user.guruId, tanggal } },
    });
    const isi = {
      guruId: user.guruId,
      tanggal,
      jamMasuk: ada?.jamMasuk ?? new Date(),
      metode: 'MANUAL_FALLBACK' as const,
      statusVerifikasi: 'PENDING' as const,
      lat: dto.lat,
      lng: dto.lng,
      diLuarArea: this.diLuarArea(dto.lat, dto.lng),
      alasan: dto.alasan,
    };
    const row = ada
      ? await this.prisma.absensiGuru.update({ where: { id: ada.id }, data: isi })
      : await this.prisma.absensiGuru.create({ data: isi });
    // TODO: notifikasi ke admin untuk verifikasi (docs/10).
    return { data: row };
  }

  async verifikasi(id: string, dto: VerifikasiFallbackDto) {
    const lama = await this.prisma.absensiGuru.findUnique({ where: { id } });
    if (!lama) throw new NotFoundException('Presensi tidak ditemukan');
    const row = await this.prisma.absensiGuru.update({
      where: { id },
      data: {
        statusVerifikasi: dto.putusan === 'SETUJU' ? 'TERVERIFIKASI' : 'DITOLAK',
      },
    });
    return { data: row };
  }

  /** Status presensi hari ini milik guru login — dipakai layar presensi mobile. */
  async hariIni(user: JwtPayload) {
    if (!user.guruId) throw new ForbiddenException('Akun belum terhubung ke data guru');
    const row = await this.prisma.absensiGuru.findUnique({
      where: { guruId_tanggal: { guruId: user.guruId, tanggal: hariIniUTC() } },
    });
    return { data: row };
  }

  /** Rekap + keterlambatan (menit vs SEKOLAH_JAM_MASUK) dihitung di server. */
  async rekap(q: QueryRekapGuruDto) {
    const where = {
      ...(q.guruId ? { guruId: q.guruId } : {}),
      ...(q.dari || q.sampai
        ? {
            tanggal: {
              ...(q.dari ? { gte: new Date(`${q.dari}T00:00:00.000Z`) } : {}),
              ...(q.sampai ? { lte: new Date(`${q.sampai}T00:00:00.000Z`) } : {}),
            },
          }
        : {}),
    };
    const rows = await this.prisma.absensiGuru.findMany({
      where,
      orderBy: { tanggal: 'desc' },
      include: { guru: { select: { id: true, nama: true } } },
    });
    const normal = this.jamMasukNormal();
    const data = rows.map((r) => {
      let terlambatMenit: number | null = null;
      if (r.jamMasuk) {
        const masuk = new Date(r.jamMasuk);
        const batas = new Date(masuk);
        batas.setUTCHours(normal.jam, normal.menit, 0, 0);
        terlambatMenit = Math.max(0, Math.round((masuk.getTime() - batas.getTime()) / 60000));
      }
      return { ...r, terlambatMenit };
    });
    return { data };
  }
}
