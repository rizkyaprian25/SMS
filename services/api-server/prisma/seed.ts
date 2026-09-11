import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  // Tahun ajaran aktif
  const ta = await prisma.tahunAjaran.upsert({
    where: { id: '00000000-0000-0000-0000-000000000001' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000001',
      nama: '2026/2027',
      semesterAktif: 'GANJIL',
      isAktif: true,
      tglMulai: new Date('2026-07-01'),
      tglSelesai: new Date('2027-06-30'),
    },
  });

  // Tingkat 7,8,9
  for (const [nama, urutan] of [['7', 7], ['8', 8], ['9', 9]] as const) {
    await prisma.tingkat.upsert({
      where: { nama },
      update: {},
      create: { nama, urutan },
    });
  }
  const tingkat = Object.fromEntries(
    (await prisma.tingkat.findMany()).map((t) => [t.nama, t.id]),
  );

  // Rombel seed: 7A-7H, 8A-8G, 9A-9G (DATA, bukan konstanta kode)
  const seedRombel: Array<[string, string[]]> = [
    ['7', ['7A', '7B', '7C', '7D', '7E', '7F', '7G', '7H']],
    ['8', ['8A', '8B', '8C', '8D', '8E', '8F', '8G']],
    ['9', ['9A', '9B', '9C', '9D', '9E', '9F', '9G']],
  ];
  for (const [tk, names] of seedRombel) {
    for (const nama of names) {
      await prisma.rombel.upsert({
        where: { tahunAjaranId_nama: { tahunAjaranId: ta.id, nama } },
        update: {},
        create: { tingkatId: tingkat[tk], tahunAjaranId: ta.id, nama, kapasitas: 32 },
      });
    }
  }

  // Mapel dasar
  const mapels = [
    ['INF', 'Informatika'], ['MTK', 'Matematika'], ['IPA', 'IPA'], ['IPS', 'IPS'],
    ['BIN', 'Bahasa Indonesia'], ['BIG', 'Bahasa Inggris'], ['PPKN', 'PPKn'],
    ['PAI', 'PAI'], ['PJOK', 'PJOK'], ['SN', 'Seni'], ['PKY', 'Prakarya'],
  ] as const;
  for (const [kode, nama] of mapels) {
    await prisma.mapel.upsert({ where: { kode }, update: {}, create: { kode, nama } });
  }

  // Admin seed
  const hash = await bcrypt.hash('Admin123!', 12);
  const guru = await prisma.guru.upsert({
    where: { nip: 'ADM001' },
    update: {},
    create: { nip: 'ADM001', nama: 'Operator TU' },
  });
  await prisma.pengguna.upsert({
    where: { email: 'admin@sekolah.sch.id' },
    update: {},
    create: { email: 'admin@sekolah.sch.id', passwordHash: hash, role: 'SUPER_ADMIN', guruId: guru.id },
  });

  // Guru seed (untuk Mobile Guru)
  const guruHash = await bcrypt.hash('Guru123!', 12);
  const guruBudi = await prisma.guru.upsert({
    where: { nip: '198203112006041008' },
    update: {},
    create: { nip: '198203112006041008', nama: 'Budi Santoso, S.Pd' },
  });
  await prisma.pengguna.upsert({
    where: { email: 'guru@sekolah.sch.id' },
    update: {},
    create: { email: 'guru@sekolah.sch.id', passwordHash: guruHash, role: 'GURU_MAPEL', guruId: guruBudi.id },
  });

  // eslint-disable-next-line no-console
  console.log('Seed OK: TA 2026/2027, 22 rombel, 11 mapel, admin@sekolah.sch.id / Admin123!, guru@sekolah.sch.id / Guru123!');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
