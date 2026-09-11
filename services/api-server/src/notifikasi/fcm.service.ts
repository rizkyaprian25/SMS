import { Injectable } from '@nestjs/common';
import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getMessaging } from 'firebase-admin/messaging';
import { PrismaService } from '../prisma/prisma.service';

export interface HasilKirim {
  sukses: number;
  gagal: number;
  mode: 'FCM' | 'LOG';
}

/**
 * Pengirim push FCM (docs/10). Tanpa kredensial service-account
 * (FIREBASE_SERVICE_ACCOUNT_JSON) jalan mode LOG: tidak kirim, hanya catat.
 * Token mati (not-registered) dibersihkan dari tabel perangkat.
 */
@Injectable()
export class FcmService {
  private siap = false;

  constructor(private readonly prisma: PrismaService) {
    const json = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
    if (json) {
      try {
        if (getApps().length === 0) {
          initializeApp({ credential: cert(JSON.parse(json)) });
        }
        this.siap = true;
      } catch {
        this.siap = false;
      }
    }
  }

  async kirim(tokens: string[], judul: string, isi: string, route?: string): Promise<HasilKirim> {
    const unik = [...new Set(tokens)];
    if (!unik.length) return { sukses: 0, gagal: 0, mode: this.siap ? 'FCM' : 'LOG' };
    if (!this.siap) return { sukses: 0, gagal: 0, mode: 'LOG' };
    const hasil = await getMessaging().sendEachForMulticast({
      tokens: unik,
      notification: { title: judul, body: isi },
      data: route ? { route } : undefined,
    });
    const mati: string[] = [];
    hasil.responses.forEach((r, i) => {
      if (!r.success && r.error?.code === 'messaging/registration-token-not-registered') {
        mati.push(unik[i]);
      }
    });
    if (mati.length) {
      await this.prisma.perangkat.deleteMany({ where: { fcmToken: { in: mati } } });
    }
    return { sukses: hasil.successCount, gagal: hasil.failureCount, mode: 'FCM' };
  }
}
