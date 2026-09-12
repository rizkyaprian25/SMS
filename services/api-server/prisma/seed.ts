import { PrismaClient, Hari, StatusKehadiran, JenisNilai, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { randomUUID } from 'crypto';

const prisma = new PrismaClient();

function hariIniUTC(): Date {
  return new Date(new Date().toISOString().slice(0, 10) + 'T00:00:00.000Z');
}

function kemarinUTC(): Date {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return new Date(d.toISOString().slice(0, 10) + 'T00:00:00.000Z');
}

function createTime(hour: number, minute: number): Date {
  const d = new Date('1970-01-01T00:00:00.000Z');
  d.setUTCHours(hour, minute, 0, 0);
  return d;
}

// Koleksi nama Indonesia realistis untuk variasi 900 siswa
const NAMA_DEPAN_L = [
  'Muhammad', 'Ahmad', 'Dimas', 'Arya', 'Kevin', 'Fajar', 'Rizky', 'Ilham', 'Bagas', 'Gilang',
  'Hendri', 'Wahyu', 'Dani', 'Zikri', 'Viko', 'Joko', 'Luqman', 'Tegar', 'Rendy', 'Panji',
  'Naufal', 'Adam', 'Farhan', 'Bayu', 'Aditya', 'Daffa', 'Hafizh', 'Raditya', 'Satria', 'Yusuf',
  'Fikri', 'Galang', 'Bima', 'Alif', 'Rian', 'Fauzan', 'Aldi', 'Chandra', 'Danu', 'Faisal',
  'Guntur', 'Haryo', 'Indra', 'Kemal', 'Maulana', 'Nizam', 'Pratama', 'Rafi', 'Surya', 'Taufik'
];

const NAMA_DEPAN_P = [
  'Siti', 'Nur', 'Anindya', 'Putri', 'Fadhilah', 'Hafizah', 'Jessica', 'Larasati', 'Olivia', 'Qania',
  'Ulya', 'Yasmin', 'Adelia', 'Cantika', 'Elsa', 'Gita', 'Intan', 'Kania', 'Aisyah', 'Nabila',
  'Zahra', 'Safira', 'Salma', 'Rahma', 'Dinda', 'Nadya', 'Aliyah', 'Bella', 'Citra', 'Dara',
  'Fitri', 'Hana', 'Irma', 'Julia', 'Kirana', 'Lestari', 'Mega', 'Nina', 'Pratiwi', 'Ratu',
  'Sekar', 'Tiara', 'Utami', 'Vina', 'Wulan', 'Yuliana', 'Amalia', 'Dewi', 'Endang', 'Griselda'
];

const NAMA_TENGAH = [
  'Ayu', 'Budi', 'Cahya', 'Dwi', 'Eka', 'Fajar', 'Gumilang', 'Hadi', 'Indah', 'Jaya',
  'Kusuma', 'Laksana', 'Maulida', 'Nurul', 'Oktavian', 'Permata', 'Qurrata', 'Rahmat', 'Saputri', 'Tri',
  'Utama', 'Vidia', 'Wira', 'Xaveria', 'Yuda', 'Zahrotun', 'Agung', 'Bintang', 'Citra', 'Darma'
];

const NAMA_BELAKANG = [
  'Pratama', 'Rahmadani', 'Sena', 'Aini', 'Ramadhan', 'Khairunnisa', 'Akbar', 'Puspitasari', 'Raditya', 'Ningrum',
  'Putra', 'Maharani', 'Bagaskara', 'Salsabila', 'Saputra', 'Nurhaliza', 'Firmansyah', 'Marwah', 'Alamsyah', 'Wicaksono',
  'Rahman', 'Hidayatullah', 'Safitri', 'Prasetyo', 'Lestari', 'Kurniawan', 'Novitasari', 'Sari', 'Gunawan', 'Permatasari',
  'Susilo', 'Syahrani', 'Hakim', 'Wijaya', 'Santoso', 'Wibowo', 'Setiawan', 'Nugroho', 'Kusuma', 'Utomo',
  'Pamungkas', 'Siregar', 'Nasution', 'Hidayat', 'Permana', 'Syahputra', 'Wardhana', 'Anggraini', 'Octavia', 'Dewantara'
];

async function main() {
  console.log('=== MEMULAI SEED LENGKAP SMP NEGERI (GURU RESMI & ~900 SISWA) ===');

  // Bersihkan data dinamis terlebih dahulu agar bersih dan konsisten
  console.log('1. Membersihkan tabel transaksi absensi, nilai, pelanggaran, jadwal, dan siswa...');
  await prisma.absensi.deleteMany();
  await prisma.nilai.deleteMany();
  await prisma.pelanggaran.deleteMany();
  await prisma.jadwal.deleteMany();
  await prisma.siswa.deleteMany();
  await prisma.guruMapel.deleteMany();

  // 1. Tahun Ajaran Aktif
  console.log('2. Memastikan Tahun Ajaran Aktif 2026/2027...');
  const ta = await prisma.tahunAjaran.upsert({
    where: { id: '00000000-0000-0000-0000-000000000001' },
    update: { isAktif: true, semesterAktif: 'GANJIL' },
    create: {
      id: '00000000-0000-0000-0000-000000000001',
      nama: '2026/2027',
      semesterAktif: 'GANJIL',
      isAktif: true,
      tglMulai: new Date('2026-07-01'),
      tglSelesai: new Date('2027-06-30'),
    },
  });

  // 2. Tingkat 7, 8, 9
  for (const [nama, urutan] of [['7', 7], ['8', 8], ['9', 9]] as const) {
    await prisma.tingkat.upsert({
      where: { nama },
      update: {},
      create: { nama, urutan },
    });
  }
  const tingkatList = await prisma.tingkat.findMany();
  const tingkat = Object.fromEntries(tingkatList.map((t) => [t.nama, t.id]));

  // 3. Rombongan Belajar (22 rombel sesuai permintaan: 7A-7H, 8A-8G, 9A-9G)
  console.log('3. Menyiapkan 22 Rombel (7A-7H, 8A-8G, 9A-9G)...');
  const rombelConfig: Array<{ tk: string; nama: string; targetKapasitas: number }> = [
    // Kelas 7 (40 siswa per rombel)
    { tk: '7', nama: '7A', targetKapasitas: 40 },
    { tk: '7', nama: '7B', targetKapasitas: 40 },
    { tk: '7', nama: '7C', targetKapasitas: 40 },
    { tk: '7', nama: '7D', targetKapasitas: 40 },
    { tk: '7', nama: '7E', targetKapasitas: 40 },
    { tk: '7', nama: '7F', targetKapasitas: 40 },
    { tk: '7', nama: '7G', targetKapasitas: 40 },
    { tk: '7', nama: '7H', targetKapasitas: 40 },
    // Kelas 8 (40-42 siswa per rombel)
    { tk: '8', nama: '8A', targetKapasitas: 41 },
    { tk: '8', nama: '8B', targetKapasitas: 41 },
    { tk: '8', nama: '8C', targetKapasitas: 40 },
    { tk: '8', nama: '8D', targetKapasitas: 42 },
    { tk: '8', nama: '8E', targetKapasitas: 41 },
    { tk: '8', nama: '8F', targetKapasitas: 40 },
    { tk: '8', nama: '8G', targetKapasitas: 42 },
    // Kelas 9 (40-42 siswa per rombel)
    { tk: '9', nama: '9A', targetKapasitas: 41 },
    { tk: '9', nama: '9B', targetKapasitas: 40 },
    { tk: '9', nama: '9C', targetKapasitas: 42 },
    { tk: '9', nama: '9D', targetKapasitas: 41 },
    { tk: '9', nama: '9E', targetKapasitas: 40 },
    { tk: '9', nama: '9F', targetKapasitas: 42 },
    { tk: '9', nama: '9G', targetKapasitas: 41 },
  ];

  for (const r of rombelConfig) {
    await prisma.rombel.upsert({
      where: { tahunAjaranId_nama: { tahunAjaranId: ta.id, nama: r.nama } },
      update: { kapasitas: r.targetKapasitas },
      create: { tingkatId: tingkat[r.tk], tahunAjaranId: ta.id, nama: r.nama, kapasitas: r.targetKapasitas },
    });
  }
  const allRombels = await prisma.rombel.findMany({ where: { tahunAjaranId: ta.id } });
  const rombelMap = Object.fromEntries(allRombels.map((r) => [r.nama, r.id]));

  // 4. Mata Pelajaran Lengkap (termasuk B. Sunda & PPKn sesuai daftar guru)
  console.log('4. Mendaftarkan Mata Pelajaran Lengkap...');
  const mapelDaftar = [
    ['INF', 'Informatika', 'Kelompok A'],
    ['MTK', 'Matematika', 'Kelompok A'],
    ['IPA', 'Ilmu Pengetahuan Alam', 'Kelompok A'],
    ['IPS', 'Ilmu Pengetahuan Sosial', 'Kelompok A'],
    ['BIN', 'Bahasa Indonesia', 'Kelompok A'],
    ['BIG', 'Bahasa Inggris', 'Kelompok A'],
    ['PPKN', 'Pendidikan Pancasila', 'Kelompok A'],
    ['PAI', 'PAIBP (Pendidikan Agama Islam)', 'Kelompok A'],
    ['PJOK', 'Pendidikan Jasmani & Olahraga', 'Kelompok B'],
    ['SN', 'Seni Budaya', 'Kelompok B'],
    ['PKY', 'Prakarya', 'Kelompok B'],
    ['SUN', 'Bahasa Sunda', 'Muatan Lokal'],
  ] as const;

  for (const [kode, nama, kelompok] of mapelDaftar) {
    await prisma.mapel.upsert({
      where: { kode },
      update: { nama, kelompok },
      create: { kode, nama, kelompok },
    });
  }
  const mapelRecords = await prisma.mapel.findMany();
  const mapelMap = Object.fromEntries(mapelRecords.map((m) => [m.kode, m.id]));

  // 5. Guru & Tenaga Pendidik Sesuai Gambar User + Admin TU
  console.log('5. Menginput Data Guru & Mata Pelajaran Sesuai Tabel Gambar...');
  const adminHash = await bcrypt.hash('Admin123!', 10);
  const guruHash = await bcrypt.hash('Guru123!', 10);

  // Admin Operator TU
  const guruAdmin = await prisma.guru.upsert({
    where: { nip: 'ADM001' },
    update: {},
    create: { nip: 'ADM001', nama: 'Operator TU' },
  });
  await prisma.pengguna.upsert({
    where: { email: 'admin@sekolah.sch.id' },
    update: { passwordHash: adminHash },
    create: { email: 'admin@sekolah.sch.id', passwordHash: adminHash, role: Role.SUPER_ADMIN, guruId: guruAdmin.id },
  });

  // Guru Budi Santoso (Demo Account untuk Flutter Mobile Guru)
  const guruBudi = await prisma.guru.upsert({
    where: { nip: '198203112006041008' },
    update: {},
    create: { nip: '198203112006041008', nama: 'Budi Santoso, S.Pd' },
  });
  await prisma.pengguna.upsert({
    where: { email: 'guru@sekolah.sch.id' },
    update: { passwordHash: guruHash, role: Role.GURU_MAPEL, guruId: guruBudi.id },
    create: { email: 'guru@sekolah.sch.id', passwordHash: guruHash, role: Role.GURU_MAPEL, guruId: guruBudi.id },
  });

  // 30 Guru Resmi sesuai gambar yang diunggah
  const guruResmi = [
    { nama: 'Dra. Juwariyah, M.Pd', nip: '196805121994032001', role: Role.KEPALA_SEKOLAH, email: 'kepsek@sekolah.sch.id', mapels: [] },
    { nama: 'Aini Supiyah, S.Pd, MM', nip: '197204151998022001', role: Role.WALI_KELAS, email: 'aini.supiyah@sekolah.sch.id', mapels: ['IPS'], wali: '7F' },
    { nama: 'Lilis Yuliati, M.Pd', nip: '197508202000032002', role: Role.WALI_KELAS, email: 'lilis.yuliati@sekolah.sch.id', mapels: ['IPA'], wali: '7B' },
    { nama: 'Hj. Heny Susana, S.Pd', nip: '197103101997022001', role: Role.WALI_KELAS, email: 'heny.susana@sekolah.sch.id', mapels: ['PPKN'], wali: '7G' },
    { nama: 'Dewi Nurhandayani, S.Pd', nip: '197809142005012008', role: Role.WALI_KELAS, email: 'dewi.nurhandayani@sekolah.sch.id', mapels: ['BIG'], wali: '7D' },
    { nama: 'Mohamad Reza Septiyani, S.Pd', nip: '198609252010011015', role: Role.WALI_KELAS, email: 'reza.septiyani@sekolah.sch.id', mapels: ['PJOK'], wali: '7E' },
    { nama: 'Wilda Fajaratu Rahmi A, S.Pd', nip: '199011122019032018', role: Role.WALI_KELAS, email: 'wilda.fajaratu@sekolah.sch.id', mapels: ['BIN'], wali: '7C' },
    { nama: 'Nika Musrifah, S.Pd', nip: '198402162009022007', role: Role.GURU_BK, email: 'bk@sekolah.sch.id', mapels: [] },
    { nama: 'Wiwin Djueriah, S.Pd, M.Han', nip: '198006182006042021', role: Role.WALI_KELAS, email: 'wiwin.djueriah@sekolah.sch.id', mapels: ['MTK'], wali: '7A' },
    { nama: 'Reza Kusnendar, S.Pd', nip: '198712052011011009', role: Role.WALI_KELAS, email: 'reza.kusnendar@sekolah.sch.id', mapels: ['MTK'], wali: '7H' },
    { nama: 'Acip Sulaeman, S.Pd I', nip: '197905142008011014', role: Role.WALI_KELAS, email: 'acip.sulaeman@sekolah.sch.id', mapels: ['IPS', 'PAI'], wali: '8A' },
    { nama: "Awaliyatussa'dah M, S.Pd.I", nip: '198307222009012011', role: Role.WALI_KELAS, email: 'awaliyatussadah@sekolah.sch.id', mapels: ['PAI', 'SUN'], wali: '8B' },
    { nama: 'Saherudin, S.Pd', nip: '197403191999031004', role: Role.WALI_KELAS, email: 'saherudin@sekolah.sch.id', mapels: ['IPS'], wali: '8C' },
    { nama: 'Anwar Sanusi, M.Pd', nip: '197611082003121005', role: Role.WALI_KELAS, email: 'anwar.sanusi@sekolah.sch.id', mapels: ['BIN'], wali: '8D' },
    { nama: 'Siti Mariam Ulfah, S.Pd', nip: '198504202010012030', role: Role.WALI_KELAS, email: 'siti.mariam@sekolah.sch.id', mapels: ['BIN'], wali: '8E' },
    { nama: 'Iip Latifah, S.Pd.I', nip: '198208142008012016', role: Role.WALI_KELAS, email: 'iip.latifah@sekolah.sch.id', mapels: ['PKY', 'PAI'], wali: '8F' },
    { nama: 'Adam Yahya, S.Pd', nip: '198801282014031002', role: Role.WALI_KELAS, email: 'adam.yahya@sekolah.sch.id', mapels: ['PJOK'], wali: '8G' },
    { nama: 'Siti Maesaroh, S.Pd', nip: '198109032007012015', role: Role.WALI_KELAS, email: 'siti.maesaroh@sekolah.sch.id', mapels: ['BIN'], wali: '9A' },
    { nama: 'Taufik Zulkarnaen, S.Pd', nip: '198005162006041011', role: Role.WALI_KELAS, email: 'taufik.zulkarnaen@sekolah.sch.id', mapels: ['MTK', 'BIG'], wali: '9B' },
    { nama: 'Imas Masitoh, S.Pd', nip: '197706242005012006', role: Role.WALI_KELAS, email: 'imas.masitoh@sekolah.sch.id', mapels: ['BIG'], wali: '9C' },
    { nama: 'Nia Kurniawati, S.Pd', nip: '198603122011012019', role: Role.WALI_KELAS, email: 'nia.kurniawati@sekolah.sch.id', mapels: ['IPA'], wali: '9D' },
    { nama: 'Dian Permatasari, S.Pd', nip: '198907152015032004', role: Role.WALI_KELAS, email: 'dian.permatasari@sekolah.sch.id', mapels: ['IPA'], wali: '9E' },
    { nama: 'Aisyah Nurul Amini, S.Pd', nip: '199202102019032021', role: Role.WALI_KELAS, email: 'aisyah.nurul@sekolah.sch.id', mapels: ['MTK'], wali: '9F' },
    { nama: 'Ainun Fitri, S.Pd', nip: '199105182019032016', role: Role.WALI_KELAS, email: 'ainun.fitri@sekolah.sch.id', mapels: ['PKY'], wali: '9G' },
    { nama: 'Sofiyah, S.Sos', nip: '197308111998022003', role: Role.GURU_MAPEL, email: 'sofiyah@sekolah.sch.id', mapels: ['PPKN'] },
    { nama: 'Fingkan Ellita, S.Pd', nip: '199310222020122014', role: Role.GURU_MAPEL, email: 'fingkan.ellita@sekolah.sch.id', mapels: ['IPS', 'BIG', 'PKY'] },
    { nama: 'Lucky Aditya Putra, S.Kom', nip: '199401152022031005', role: Role.GURU_MAPEL, email: 'lucky.aditya@sekolah.sch.id', mapels: ['INF'] },
    { nama: 'Mohammad Fauzi Rahman, M.I.Kom', nip: '199008062019031012', role: Role.GURU_MAPEL, email: 'fauzi.rahman@sekolah.sch.id', mapels: ['SUN'] },
    { nama: 'Muhamad Rizky Aprian, S.Kom', nip: '199504252024011003', role: Role.GURU_MAPEL, email: 'rizky.aprian@sekolah.sch.id', mapels: ['INF'] },
    { nama: 'Wikrama Wardana', nip: '198511202010011018', role: Role.GURU_MAPEL, email: 'wikrama.wardana@sekolah.sch.id', mapels: ['IPA'] },
  ];

  const guruMap: Record<string, string> = {
    [guruBudi.nip]: guruBudi.id,
    [guruAdmin.nip]: guruAdmin.id,
  };

  for (const g of guruResmi) {
    const record = await prisma.guru.upsert({
      where: { nip: g.nip },
      update: { nama: g.nama },
      create: { nip: g.nip, nama: g.nama },
    });
    guruMap[g.nip] = record.id;

    // Buat akun pengguna
    await prisma.pengguna.upsert({
      where: { email: g.email },
      update: { passwordHash: guruHash, role: g.role, guruId: record.id },
      create: { email: g.email, passwordHash: guruHash, role: g.role, guruId: record.id },
    });

    // Petakan mata pelajaran yang diampu
    for (const mKode of g.mapels) {
      const mapelId = mapelMap[mKode];
      if (mapelId) {
        await prisma.guruMapel.upsert({
          where: { guruId_mapelId: { guruId: record.id, mapelId } },
          update: {},
          create: { guruId: record.id, mapelId },
        });
      }
    }

    // Pasangkan sebagai wali kelas jika ada
    if (g.wali && rombelMap[g.wali]) {
      await prisma.rombel.update({
        where: { id: rombelMap[g.wali] },
        data: { waliKelasId: record.id },
      });
    }
  }

  // 6. Generate Data Siswa Skala Penuh (894 Siswa)
  console.log('6. Mengenerate 894 Data Siswa (Kelas 7: 40/kelas, Kelas 8-9: 40-42/kelas)...');
  interface SiswaItemSeed {
    id: string;
    nisn: string;
    nama: string;
    rombelId: string;
    jenisKelamin: string;
    tglLahir: Date;
    isAktif: boolean;
    dataOrtu: {
      namaAyah: string;
      namaIbu: string;
      noHp: string;
      alamat: string;
    };
  }
  const semuaSiswa: SiswaItemSeed[] = [];
  let globalIndex = 0;

  for (const rombel of rombelConfig) {
    const rId = rombelMap[rombel.nama];
    const prefixNisn = rombel.tk === '7' ? '0091' : rombel.tk === '8' ? '0081' : '0071';
    const tahunLahir = rombel.tk === '7' ? 2013 : rombel.tk === '8' ? 2012 : 2011;

    for (let i = 1; i <= rombel.targetKapasitas; i++) {
      globalIndex++;
      const isL = (globalIndex + i) % 2 === 0;
      const jk = isL ? 'L' : 'P';
      const depan = isL
        ? NAMA_DEPAN_L[(globalIndex * 7 + i) % NAMA_DEPAN_L.length]
        : NAMA_DEPAN_P[(globalIndex * 11 + i) % NAMA_DEPAN_P.length];
      const tengah = NAMA_TENGAH[(globalIndex * 13 + i * 3) % NAMA_TENGAH.length];
      const belakang = NAMA_BELAKANG[(globalIndex * 17 + i * 5) % NAMA_BELAKANG.length];
      const nama = `${depan} ${tengah} ${belakang}`;

      const nisnSequence = String(globalIndex).padStart(6, '0');
      const nisn = `${prefixNisn}${nisnSequence}`;

      const bulan = ((i % 12) + 1).toString().padStart(2, '0');
      const tanggal = (((i * 7) % 28) + 1).toString().padStart(2, '0');
      const tglLahir = new Date(`${tahunLahir}-${bulan}-${tanggal}`);

      semuaSiswa.push({
        id: randomUUID(),
        nisn,
        nama,
        rombelId: rId,
        jenisKelamin: jk,
        tglLahir,
        isAktif: true,
        dataOrtu: {
          namaAyah: `Bpk. ${belakang}`,
          namaIbu: `Ibu ${tengah}`,
          noHp: `0812${Math.floor(10000000 + ((globalIndex * 9301 + 49297) % 90000000))}`,
          alamat: `Jl. Melati No. ${(globalIndex % 95) + 1}, RT 0${(i % 5) + 1}/RW 02`,
        },
      });
    }
  }

  // Insert massal siswa dengan createMany (sangat cepat & efisien)
  await prisma.siswa.createMany({
    data: semuaSiswa,
    skipDuplicates: true,
  });
  console.log(`✅ Berhasil mendaftarkan ${semuaSiswa.length} siswa ke database!`);

  // 7. Absensi Siswa Harian (Hari Ini & Kemarin untuk seluruh 894 siswa)
  console.log('7. Membuat Riwayat Presensi Siswa Harian Hari Ini & Kemarin...');
  const today = hariIniUTC();
  const yesterday = kemarinUTC();
  const guruAbsenId = guruMap['198006182006042021'] || guruBudi.id; // Wiwin / Budi
  const mapelUmumId = mapelMap['MTK'];

  const absensiBatch: Array<{
    id: string;
    siswaId: string;
    tanggal: Date;
    mapelId: string;
    jamKe: number;
    status: StatusKehadiran;
    keterangan: string | null;
    dicatatOleh: string;
    sumber: 'WEB' | 'MOBILE';
  }> = [];

  for (let idx = 0; idx < semuaSiswa.length; idx++) {
    const s = semuaSiswa[idx];
    let statusHariIni: StatusKehadiran = StatusKehadiran.HADIR;
    let keteranganHariIni: string | null = null;

    // Pola kehadiran realistis sekolah (95% Hadir, 2.5% Sakit, 1.5% Izin, 1% Alpa)
    if (idx % 120 === 7) {
      statusHariIni = StatusKehadiran.ALPA;
      keteranganHariIni = 'Tidak hadir tanpa konfirmasi orang tua';
    } else if (idx % 45 === 3) {
      statusHariIni = StatusKehadiran.SAKIT;
      keteranganHariIni = 'Sakit flu dan demam (surat dokter terlampir)';
    } else if (idx % 65 === 5) {
      statusHariIni = StatusKehadiran.IZIN;
      keteranganHariIni = 'Izin menghadiri acara keluarga';
    }

    absensiBatch.push({
      id: randomUUID(),
      siswaId: s.id,
      tanggal: today,
      mapelId: mapelUmumId,
      jamKe: 1,
      status: statusHariIni,
      keterangan: keteranganHariIni,
      dicatatOleh: guruAbsenId,
      sumber: 'WEB' as const,
    });

    // Absensi kemarin
    absensiBatch.push({
      id: randomUUID(),
      siswaId: s.id,
      tanggal: yesterday,
      mapelId: mapelUmumId,
      jamKe: 1,
      status: idx % 60 === 2 ? StatusKehadiran.SAKIT : StatusKehadiran.HADIR,
      keterangan: idx % 60 === 2 ? 'Hari pertama istirahat medis' : null,
      dicatatOleh: guruAbsenId,
      sumber: 'MOBILE' as const,
    });
  }

  await prisma.absensi.createMany({
    data: absensiBatch,
    skipDuplicates: true,
  });
  console.log(`✅ Berhasil mencatat ${absensiBatch.length} log presensi siswa!`);

  // 8. Jadwal Pelajaran (Terdistribusi per hari untuk berbagai rombel)
  // 8. Jadwal Pelajaran (Matriks Lengkap Sesuai SK Pembagian Tugas Mengajar 30 Guru)
  console.log('8. Membuat Jadwal Pelajaran Lengkap 22 Rombel Sesuai SK Dosen/Guru Pengampu...');
  const penugasanSK: Array<{
    nip: string;
    mapel: string;
    rombels: string[];
  }> = [
    // 2. Aini Supiyah, S.Pd, MM: IPS (8G // 9 ABCDEFG)
    { nip: '197204151998022001', mapel: 'IPS', rombels: ['8G', '9A', '9B', '9C', '9D', '9E', '9F', '9G'] },
    // 3. Lilis Yuliati, M.Pd: IPA (8 ABCDEF)
    { nip: '197508202000032002', mapel: 'IPA', rombels: ['8A', '8B', '8C', '8D', '8E', '8F'] },
    // 4. Hj. Heny Susana, S.Pd: PPKN (7 ABCDEFGH // 9 ABC)
    { nip: '197103101997022001', mapel: 'PPKN', rombels: ['7A', '7B', '7C', '7D', '7E', '7F', '7G', '7H', '9A', '9B', '9C'] },
    // 5. Dewi Nurhandayani, S.Pd: BIG (8 ABCDEFG)
    { nip: '197809142005012008', mapel: 'BIG', rombels: ['8A', '8B', '8C', '8D', '8E', '8F', '8G'] },
    // 6. Mohamad Reza Septiyani, S.Pd: PJOK (7 ABCD // 9ABCDEFG)
    { nip: '198609252010011015', mapel: 'PJOK', rombels: ['7A', '7B', '7C', '7D', '9A', '9B', '9C', '9D', '9E', '9F', '9G'] },
    // 7. Wilda Fajaratu Rahmi A, S.Pd: BIN (7 ABCDE)
    { nip: '199011122019032018', mapel: 'BIN', rombels: ['7A', '7B', '7C', '7D', '7E'] },
    // 9. Wiwin Djueriah, S.Pd, M.Han: MTK (9 ABCDEFG)
    { nip: '198006182006042021', mapel: 'MTK', rombels: ['9A', '9B', '9C', '9D', '9E', '9F', '9G'] },
    // 10. Reza Kusnendar, S.Pd: MTK (7 ABCDEFG)
    { nip: '198712052011011009', mapel: 'MTK', rombels: ['7A', '7B', '7C', '7D', '7E', '7F', '7G'] },
    // 11. Acip Sulaeman, S.Pd I: IPS (7 ABC) & PAI (9 ABCDEFG)
    { nip: '197905142008011014', mapel: 'IPS', rombels: ['7A', '7B', '7C'] },
    { nip: '197905142008011014', mapel: 'PAI', rombels: ['9A', '9B', '9C', '9D', '9E', '9F', '9G'] },
    // 12. Awaliyatussa'dah M, S.Pd.I: PAI (7 ABCDEFGH) & SUN (9 ABC)
    { nip: '198307222009012011', mapel: 'PAI', rombels: ['7A', '7B', '7C', '7D', '7E', '7F', '7G', '7H'] },
    { nip: '198307222009012011', mapel: 'SUN', rombels: ['9A', '9B', '9C'] },
    // 13. Saherudin, S.Pd: IPS (7 GH // 8 ABCDEF)
    { nip: '197403191999031004', mapel: 'IPS', rombels: ['7G', '7H', '8A', '8B', '8C', '8D', '8E', '8F'] },
    // 14. Anwar Sanusi, M.Pd: BIN (9 ABCDE)
    { nip: '197611082003121005', mapel: 'BIN', rombels: ['9A', '9B', '9C', '9D', '9E'] },
    // 15. Siti Mariam Ulfah, S.Pd: BIN (7 FGH // 8 EFG)
    { nip: '198504202010012030', mapel: 'BIN', rombels: ['7F', '7G', '7H', '8E', '8F', '8G'] },
    // 16. Iip Latifah, S.Pd.I: PKY (7 EFGH) & PAI (8 ABCDEFG)
    { nip: '198208142008012016', mapel: 'PKY', rombels: ['7E', '7F', '7G', '7H'] },
    { nip: '198208142008012016', mapel: 'PAI', rombels: ['8A', '8B', '8C', '8D', '8E', '8F', '8G'] },
    // 17. Adam Yahya, S.Pd: PJOK (7 EFGH // 8 ABCDEFG)
    { nip: '198801282014031002', mapel: 'PJOK', rombels: ['7E', '7F', '7G', '7H', '8A', '8B', '8C', '8D', '8E', '8F', '8G'] },
    // 18. Siti Maesaroh, S.Pd: BIN (8 ABCD // 9 FG)
    { nip: '198109032007012015', mapel: 'BIN', rombels: ['8A', '8B', '8C', '8D', '9F', '9G'] },
    // 19. Taufik Zulkarnaen, S.Pd: MTK (7 H) & BIG (9 ABCDEFG)
    { nip: '198005162006041011', mapel: 'MTK', rombels: ['7H'] },
    { nip: '198005162006041011', mapel: 'BIG', rombels: ['9A', '9B', '9C', '9D', '9E', '9F', '9G'] },
    // 20. Imas Masitoh, S.Pd: BIG (7 ABCDEFG)
    { nip: '197706242005012006', mapel: 'BIG', rombels: ['7A', '7B', '7C', '7D', '7E', '7F', '7G'] },
    // 21. Nia Kurniawati, S.Pd: IPA (7 ABCDEFG)
    { nip: '198603122011012019', mapel: 'IPA', rombels: ['7A', '7B', '7C', '7D', '7E', '7F', '7G'] },
    // 22. Dian Permatasari, S.Pd: IPA (9 ABCDEFG)
    { nip: '198907152015032004', mapel: 'IPA', rombels: ['9A', '9B', '9C', '9D', '9E', '9F', '9G'] },
    // 23. Aisyah Nurul Amini, S.Pd: MTK (8 ABCDEFG)
    { nip: '199202102019032021', mapel: 'MTK', rombels: ['8A', '8B', '8C', '8D', '8E', '8F', '8G'] },
    // 24. Ainun Fitri, S.Pd: PKY (7 ABCD // 9 ABCDEFG)
    { nip: '199105182019032016', mapel: 'PKY', rombels: ['7A', '7B', '7C', '7D', '9A', '9B', '9C', '9D', '9E', '9F', '9G'] },
    // 25. Sofiyah, S.Sos: PPKN (8 ABCDEFG // 9 DEFG)
    { nip: '197308111998022003', mapel: 'PPKN', rombels: ['8A', '8B', '8C', '8D', '8E', '8F', '8G', '9D', '9E', '9F', '9G'] },
    // 26. Fingkan Ellita, S.Pd: IPS (7 DEF) & BIG (7 H) & PKY (8 ABCDEFG)
    { nip: '199310222020122014', mapel: 'IPS', rombels: ['7D', '7E', '7F'] },
    { nip: '199310222020122014', mapel: 'BIG', rombels: ['7H'] },
    { nip: '199310222020122014', mapel: 'PKY', rombels: ['8A', '8B', '8C', '8D', '8E', '8F', '8G'] },
    // 27. Lucky Aditya Putra, S.Kom: INF (8 CDEFG // 9 ABCDEFG)
    { nip: '199401152022031005', mapel: 'INF', rombels: ['8C', '8D', '8E', '8F', '8G', '9A', '9B', '9C', '9D', '9E', '9F', '9G'] },
    // 28. Mohammad Fauzi Rahman, M.I.Kom: SUN (7 ABCDEFGH // 8 ABCDEFG // 9 DEFG)
    { nip: '199008062019031012', mapel: 'SUN', rombels: ['7A', '7B', '7C', '7D', '7E', '7F', '7G', '7H', '8A', '8B', '8C', '8D', '8E', '8F', '8G', '9D', '9E', '9F', '9G'] },
    // 29. Muhamad Rizky Aprian, S.Kom: INF (7 ABCDEFGH // 8 AB)
    { nip: '199504252024011003', mapel: 'INF', rombels: ['7A', '7B', '7C', '7D', '7E', '7F', '7G', '7H', '8A', '8B'] },
    // 30. Wikrama Wardana: IPA (7 H // 8 G)
    { nip: '198511202010011018', mapel: 'IPA', rombels: ['7H', '8G'] },
  ];

  // Susunan waktu slot belajar per mapel untuk setiap rombel
  const slotMapelConfig: Array<{ mapel: string; hari: Hari; jamKe: number; jamMulai: Date; jamSelesai: Date }> = [
    { mapel: 'MTK', hari: Hari.SENIN, jamKe: 1, jamMulai: createTime(7, 30), jamSelesai: createTime(8, 50) },
    { mapel: 'BIN', hari: Hari.SENIN, jamKe: 2, jamMulai: createTime(9, 5), jamSelesai: createTime(10, 25) },
    { mapel: 'IPA', hari: Hari.SELASA, jamKe: 1, jamMulai: createTime(7, 30), jamSelesai: createTime(8, 50) },
    { mapel: 'BIG', hari: Hari.SELASA, jamKe: 2, jamMulai: createTime(9, 5), jamSelesai: createTime(10, 25) },
    { mapel: 'IPS', hari: Hari.RABU, jamKe: 1, jamMulai: createTime(7, 30), jamSelesai: createTime(8, 50) },
    { mapel: 'PJOK', hari: Hari.RABU, jamKe: 2, jamMulai: createTime(9, 5), jamSelesai: createTime(10, 25) },
    { mapel: 'INF', hari: Hari.KAMIS, jamKe: 1, jamMulai: createTime(7, 30), jamSelesai: createTime(8, 50) },
    { mapel: 'PKY', hari: Hari.KAMIS, jamKe: 2, jamMulai: createTime(9, 5), jamSelesai: createTime(10, 25) },
    { mapel: 'PPKN', hari: Hari.JUMAT, jamKe: 1, jamMulai: createTime(7, 30), jamSelesai: createTime(8, 50) },
    { mapel: 'SUN', hari: Hari.JUMAT, jamKe: 2, jamMulai: createTime(9, 5), jamSelesai: createTime(10, 25) },
    { mapel: 'PAI', hari: Hari.JUMAT, jamKe: 3, jamMulai: createTime(10, 35), jamSelesai: createTime(11, 45) },
  ];

  const jadwalBatch: Array<{
    id: string;
    rombelId: string;
    mapelId: string;
    guruId: string;
    hari: Hari;
    jamKe: number;
    jamMulai: Date;
    jamSelesai: Date;
  }> = [];

  for (const r of allRombels) {
    const rombelNama = r.nama;
    for (const slot of slotMapelConfig) {
      // Cari penugasan guru yang mengampu mapel slot ini di rombel ini
      const tugas = penugasanSK.find(
        (t) => t.mapel === slot.mapel && t.rombels.includes(rombelNama)
      );

      if (tugas) {
        const guruId = guruMap[tugas.nip];
        const mapelId = mapelMap[slot.mapel];
        if (guruId && mapelId) {
          jadwalBatch.push({
            id: randomUUID(),
            rombelId: r.id,
            mapelId,
            guruId,
            hari: slot.hari,
            jamKe: slot.jamKe,
            jamMulai: slot.jamMulai,
            jamSelesai: slot.jamSelesai,
          });
        }
      }
    }
  }

  await prisma.jadwal.createMany({
    data: jadwalBatch,
    skipDuplicates: true,
  });
  console.log(`✅ Berhasil membuat ${jadwalBatch.length} slot jadwal & penugasan mengajar resmi!`);

  // 9. Nilai Sampel untuk Siswa
  console.log('9. Memasukkan Nilai Siswa (Tugas, Harian, UTS)...');
  const nilaiBatch: Array<{
    id: string;
    siswaId: string;
    mapelId: string;
    tahunAjaranId: string;
    semester: 'GANJIL';
    jenis: JenisNilai;
    nilai: number;
  }> = [];
  const mapelListUntukNilai = [mapelMap['MTK'], mapelMap['BIN'], mapelMap['IPA'], mapelMap['BIG']];

  for (let i = 0; i < Math.min(80, semuaSiswa.length); i++) {
    const s = semuaSiswa[i];
    const mId = mapelListUntukNilai[i % mapelListUntukNilai.length];
    if (mId) {
      nilaiBatch.push({
        id: randomUUID(),
        siswaId: s.id,
        mapelId: mId,
        tahunAjaranId: ta.id,
        semester: 'GANJIL' as const,
        jenis: JenisNilai.TUGAS,
        nilai: 80 + (i % 18),
      });
      nilaiBatch.push({
        id: randomUUID(),
        siswaId: s.id,
        mapelId: mId,
        tahunAjaranId: ta.id,
        semester: 'GANJIL' as const,
        jenis: JenisNilai.HARIAN,
        nilai: 82 + ((i * 3) % 17),
      });
      nilaiBatch.push({
        id: randomUUID(),
        siswaId: s.id,
        mapelId: mId,
        tahunAjaranId: ta.id,
        semester: 'GANJIL' as const,
        jenis: JenisNilai.UTS,
        nilai: 85 + ((i * 7) % 14),
      });
    }
  }
  await prisma.nilai.createMany({ data: nilaiBatch });

  // 10. Pengumuman Resmi Sekolah
  console.log('10. Menerbitkan Pengumuman Sekolah...');
  await prisma.pengumuman.deleteMany();
  await prisma.pengumuman.createMany({
    data: [
      {
        judul: 'Pelaksanaan Asesmen Sumatif Tengah Semester (ASTS) Ganjil 2026/2027',
        isi: 'Diberitahukan kepada seluruh bapak/ibu guru, staf, dan peserta didik kelas 7, 8, dan 9 bahwa pelaksanaan ASTS Ganjil akan dimulai tanggal 22 September 2026. Jadwal pengawasan dan ruangan telah tertera pada mading utama.',
        targetRole: ['GURU_MAPEL', 'WALI_KELAS', 'SISWA', 'ORANG_TUA'],
        diterbitkanPada: new Date(),
      },
      {
        judul: 'Rapat Evaluasi Bulanan & Koordinasi Pembelajaran Kurikulum Merdeka',
        isi: 'Rapat dewan guru dipimpin oleh Kepala Sekolah Dra. Hj. Juwariyah, M.Pd akan diadakan pada hari Jumat pukul 13.30 WIB di Ruang Guru. Dimohon seluruh wali kelas membawa rekap absensi rombel masing-masing.',
        targetRole: ['GURU_MAPEL', 'WALI_KELAS', 'KEPALA_SEKOLAH'],
        diterbitkanPada: new Date(),
      },
      {
        judul: 'Tata Tertib Seragam dan Kedisiplinan Upacara Bendera Hari Senin',
        isi: 'Seluruh peserta didik kelas 7, 8, dan 9 diwajibkan memakai seragam putih-biru lengkap beserta dasi, topi berlogo sekolah, sabuk hitam, dan sepatu hitam polos. Pintu gerbang sekolah ditutup tepat pukul 07.00 WIB.',
        targetRole: ['SISWA', 'ORANG_TUA'],
        diterbitkanPada: new Date(),
      },
      {
        judul: 'Pendaftaran Ekstrakurikuler Unggulan TP 2026/2027',
        isi: 'Pendaftaran kegiatan ekstrakurikuler (Pramuka, Paskibra, PMR, Robotika, Futsal, Tari Tradisional, dan Paduan Suara) dibuka melalui masing-masing guru pembina.',
        targetRole: ['SISWA', 'GURU_MAPEL'],
        diterbitkanPada: new Date(),
      },
    ],
  });

  // 11. Pelanggaran / Buku Kasus BK
  console.log('11. Mencatat Kasus Pelanggaran & Konseling Siswa...');
  const bkGuruId = guruMap['198402162009022007'] || guruBudi.id; // Nika Musrifah / Budi
  await prisma.pelanggaran.createMany({
    data: [
      {
        siswaId: semuaSiswa[5].id,
        tanggal: today,
        kategori: 'KEDISIPLINAN',
        poin: 10,
        keterangan: 'Terlambat masuk sekolah sebanyak 3 kali berturut-turut pada minggu ini.',
        dicatatOleh: bkGuruId,
      },
      {
        siswaId: semuaSiswa[45].id,
        tanggal: today,
        kategori: 'KERAPIAN',
        poin: 5,
        keterangan: 'Tidak memakai kelengkapan atribut upacara (topi dan dasi sekolah).',
        dicatatOleh: bkGuruId,
      },
      {
        siswaId: semuaSiswa[88].id,
        tanggal: yesterday,
        kategori: 'TERTIB_BELAJAR',
        poin: 15,
        keterangan: 'Mengoperasikan game di ponsel ketika jam pelajaran berlangsung tanpa izin guru.',
        dicatatOleh: bkGuruId,
      },
      {
        siswaId: semuaSiswa[120].id,
        tanggal: yesterday,
        kategori: 'KEDISIPLINAN',
        poin: 5,
        keterangan: 'Meninggalkan kelas sebelum bel istirahat berbunyi.',
        dicatatOleh: bkGuruId,
      },
    ],
  });

  // 12. Presensi Guru Hari Ini (Face / Manual)
  console.log('12. Mencatat Presensi Masuk Dewan Guru...');
  await prisma.absensiGuru.deleteMany();
  for (const g of guruResmi.slice(0, 15)) {
    const gId = guruMap[g.nip];
    if (gId) {
      await prisma.absensiGuru.create({
        data: {
          guruId: gId,
          tanggal: today,
          jamMasuk: createTime(6, 40),
          metode: 'FACE',
          statusVerifikasi: 'TERVERIFIKASI',
          faceScore: 0.95,
          diLuarArea: false,
        },
      });
    }
  }

  console.log('=== SEEDING BERHASIL DISELESAIKAN 100%! ===');
  console.log(`• Rombongan Belajar: 22 rombel (7A-H: 40/kelas, 8A-G: 40-42/kelas, 9A-G: 40-42/kelas)`);
  console.log(`• Total Siswa: ${semuaSiswa.length} siswa`);
  console.log(`• Total Guru & Tenaga Pendidik: ${guruResmi.length + 2} orang`);
  console.log(`• Akun Login Utama:`);
  console.log(`  - Super Admin: admin@sekolah.sch.id / Admin123!`);
  console.log(`  - Kepala Sekolah (Dra. Juwariyah): kepsek@sekolah.sch.id / Guru123!`);
  console.log(`  - Guru BK (Nika Musrifah): bk@sekolah.sch.id / Guru123!`);
  console.log(`  - Guru Demo (Budi Santoso): guru@sekolah.sch.id / Guru123!`);
}

main()
  .catch((e) => {
    console.error('Error saat proses seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
