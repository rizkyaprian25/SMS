import { ForbiddenException } from '@nestjs/common';
import type { PrismaService } from '../prisma/prisma.service';

/**
 * Satu pintu cek "guru boleh input mapel ini?" — dipakai absensi & nilai.
 * SUPER_ADMIN bypass. Tanpa guruId (akun belum terhubung guru) selalu ditolak.
 */
export async function assertDapatInputMapel(
  prisma: PrismaService,
  args: { role: string; guruId?: string; mapelId: string },
): Promise<void> {
  if (args.role === 'SUPER_ADMIN') return;
  if (!args.guruId) throw new ForbiddenException('Akun belum terhubung ke data guru');
  const rel = await prisma.guruMapel.findUnique({
    where: { guruId_mapelId: { guruId: args.guruId, mapelId: args.mapelId } },
  });
  if (!rel) throw new ForbiddenException('Anda tidak mengampu mapel ini');
}
