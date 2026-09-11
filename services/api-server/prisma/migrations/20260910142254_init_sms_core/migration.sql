-- CreateEnum
CREATE TYPE "Role" AS ENUM ('SUPER_ADMIN', 'KEPALA_SEKOLAH', 'GURU_MAPEL', 'WALI_KELAS', 'GURU_BK', 'SISWA', 'ORANG_TUA');

-- CreateEnum
CREATE TYPE "Semester" AS ENUM ('GANJIL', 'GENAP');

-- CreateEnum
CREATE TYPE "Hari" AS ENUM ('SENIN', 'SELASA', 'RABU', 'KAMIS', 'JUMAT', 'SABTU');

-- CreateEnum
CREATE TYPE "StatusKehadiran" AS ENUM ('HADIR', 'IZIN', 'SAKIT', 'ALPA');

-- CreateEnum
CREATE TYPE "SumberAbsensi" AS ENUM ('WEB', 'MOBILE');

-- CreateEnum
CREATE TYPE "MetodePresensi" AS ENUM ('FACE', 'MANUAL_FALLBACK');

-- CreateEnum
CREATE TYPE "StatusVerifikasi" AS ENUM ('TERVERIFIKASI', 'PENDING', 'DITOLAK');

-- CreateEnum
CREATE TYPE "JenisNilai" AS ENUM ('TUGAS', 'HARIAN', 'UTS', 'UAS', 'SUMATIF');

-- CreateEnum
CREATE TYPE "StatusIzin" AS ENUM ('DIAJUKAN', 'DISETUJUI', 'DITOLAK');

-- CreateEnum
CREATE TYPE "JenisIzin" AS ENUM ('IZIN', 'SAKIT');

-- CreateTable
CREATE TABLE "tahun_ajaran" (
    "id" UUID NOT NULL,
    "nama" VARCHAR(20) NOT NULL,
    "semester_aktif" "Semester" NOT NULL,
    "is_aktif" BOOLEAN NOT NULL DEFAULT false,
    "tgl_mulai" DATE NOT NULL,
    "tgl_selesai" DATE NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tahun_ajaran_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tingkat" (
    "id" UUID NOT NULL,
    "nama" VARCHAR(10) NOT NULL,
    "urutan" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tingkat_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rombel" (
    "id" UUID NOT NULL,
    "tingkat_id" UUID NOT NULL,
    "tahun_ajaran_id" UUID NOT NULL,
    "nama" VARCHAR(10) NOT NULL,
    "wali_kelas_id" UUID,
    "kapasitas" INTEGER NOT NULL DEFAULT 32,
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rombel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "guru" (
    "id" UUID NOT NULL,
    "nip" VARCHAR(30) NOT NULL,
    "nama" TEXT NOT NULL,
    "foto_url" TEXT,
    "face_embedding_enc" TEXT,
    "face_consent" BOOLEAN NOT NULL DEFAULT false,
    "face_consent_at" TIMESTAMP(3),
    "is_aktif" BOOLEAN NOT NULL DEFAULT true,
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "guru_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pengguna" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "guru_id" UUID,
    "siswa_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pengguna_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "siswa" (
    "id" UUID NOT NULL,
    "nisn" CHAR(10) NOT NULL,
    "nama" TEXT NOT NULL,
    "rombel_id" UUID,
    "jenis_kelamin" VARCHAR(20),
    "tgl_lahir" DATE,
    "foto_url" TEXT,
    "data_ortu" JSONB,
    "is_aktif" BOOLEAN NOT NULL DEFAULT true,
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "siswa_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mapel" (
    "id" UUID NOT NULL,
    "kode" VARCHAR(20) NOT NULL,
    "nama" TEXT NOT NULL,
    "kelompok" VARCHAR(50),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mapel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "guru_mapel" (
    "guru_id" UUID NOT NULL,
    "mapel_id" UUID NOT NULL,

    CONSTRAINT "guru_mapel_pkey" PRIMARY KEY ("guru_id","mapel_id")
);

-- CreateTable
CREATE TABLE "jadwal" (
    "id" UUID NOT NULL,
    "rombel_id" UUID NOT NULL,
    "mapel_id" UUID NOT NULL,
    "guru_id" UUID NOT NULL,
    "hari" "Hari" NOT NULL,
    "jam_mulai" TIME NOT NULL,
    "jam_selesai" TIME NOT NULL,
    "jam_ke" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "jadwal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "absensi" (
    "id" UUID NOT NULL,
    "siswa_id" UUID NOT NULL,
    "tanggal" DATE NOT NULL,
    "mapel_id" UUID NOT NULL,
    "jam_ke" INTEGER NOT NULL,
    "status" "StatusKehadiran" NOT NULL,
    "keterangan" TEXT,
    "dicatat_oleh" UUID NOT NULL,
    "sumber" "SumberAbsensi" NOT NULL DEFAULT 'MOBILE',
    "alasan_override" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "absensi_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "absensi_guru" (
    "id" UUID NOT NULL,
    "guru_id" UUID NOT NULL,
    "tanggal" DATE NOT NULL,
    "jam_masuk" TIMESTAMP(3),
    "jam_pulang" TIMESTAMP(3),
    "metode" "MetodePresensi" NOT NULL,
    "status_verifikasi" "StatusVerifikasi" NOT NULL DEFAULT 'TERVERIFIKASI',
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "di_luar_area" BOOLEAN NOT NULL DEFAULT false,
    "face_score" DOUBLE PRECISION,
    "alasan" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "absensi_guru_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nilai" (
    "id" UUID NOT NULL,
    "siswa_id" UUID NOT NULL,
    "mapel_id" UUID NOT NULL,
    "tahun_ajaran_id" UUID NOT NULL,
    "semester" "Semester" NOT NULL,
    "jenis" "JenisNilai" NOT NULL,
    "nilai" DECIMAL(5,2) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "nilai_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "perizinan" (
    "id" UUID NOT NULL,
    "siswa_id" UUID NOT NULL,
    "tgl_mulai" DATE NOT NULL,
    "tgl_selesai" DATE NOT NULL,
    "jenis" "JenisIzin" NOT NULL,
    "alasan" TEXT NOT NULL,
    "lampiran_url" TEXT,
    "status" "StatusIzin" NOT NULL DEFAULT 'DIAJUKAN',
    "diproses_oleh" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "perizinan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pengumuman" (
    "id" UUID NOT NULL,
    "judul" TEXT NOT NULL,
    "isi" TEXT NOT NULL,
    "target_role" TEXT[],
    "target_rombel_id" UUID,
    "diterbitkan_pada" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pengumuman_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pelanggaran" (
    "id" UUID NOT NULL,
    "siswa_id" UUID NOT NULL,
    "tanggal" DATE NOT NULL,
    "kategori" TEXT NOT NULL,
    "poin" INTEGER NOT NULL,
    "keterangan" TEXT,
    "dicatat_oleh" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pelanggaran_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "riwayat_kelas" (
    "id" UUID NOT NULL,
    "siswa_id" UUID NOT NULL,
    "rombel_lama_id" UUID,
    "rombel_baru_id" UUID NOT NULL,
    "tahun_ajaran_id" UUID NOT NULL,
    "tanggal" DATE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "diproses_oleh" UUID NOT NULL,

    CONSTRAINT "riwayat_kelas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_log" (
    "id" UUID NOT NULL,
    "aksi" TEXT NOT NULL,
    "entitas" TEXT NOT NULL,
    "entitas_id" UUID NOT NULL,
    "sebelum" JSONB,
    "sesudah" JSONB,
    "dilakukan_oleh" UUID NOT NULL,
    "kapan" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "perangkat" (
    "id" UUID NOT NULL,
    "pengguna_id" UUID NOT NULL,
    "fcm_token" TEXT NOT NULL,
    "platform" VARCHAR(20) NOT NULL,
    "last_login" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "perangkat_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sesi" (
    "id" UUID NOT NULL,
    "pengguna_id" UUID NOT NULL,
    "refresh_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "dicabut" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sesi_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tingkat_nama_key" ON "tingkat"("nama");

-- CreateIndex
CREATE UNIQUE INDEX "rombel_tahun_ajaran_id_nama_key" ON "rombel"("tahun_ajaran_id", "nama");

-- CreateIndex
CREATE UNIQUE INDEX "guru_nip_key" ON "guru"("nip");

-- CreateIndex
CREATE UNIQUE INDEX "pengguna_email_key" ON "pengguna"("email");

-- CreateIndex
CREATE UNIQUE INDEX "pengguna_guru_id_key" ON "pengguna"("guru_id");

-- CreateIndex
CREATE UNIQUE INDEX "pengguna_siswa_id_key" ON "pengguna"("siswa_id");

-- CreateIndex
CREATE UNIQUE INDEX "siswa_nisn_key" ON "siswa"("nisn");

-- CreateIndex
CREATE UNIQUE INDEX "mapel_kode_key" ON "mapel"("kode");

-- CreateIndex
CREATE UNIQUE INDEX "jadwal_rombel_id_hari_jam_mulai_key" ON "jadwal"("rombel_id", "hari", "jam_mulai");

-- CreateIndex
CREATE UNIQUE INDEX "absensi_siswa_id_tanggal_mapel_id_jam_ke_key" ON "absensi"("siswa_id", "tanggal", "mapel_id", "jam_ke");

-- CreateIndex
CREATE UNIQUE INDEX "absensi_guru_guru_id_tanggal_key" ON "absensi_guru"("guru_id", "tanggal");

-- CreateIndex
CREATE UNIQUE INDEX "perangkat_pengguna_id_fcm_token_key" ON "perangkat"("pengguna_id", "fcm_token");

-- CreateIndex
CREATE UNIQUE INDEX "sesi_refresh_hash_key" ON "sesi"("refresh_hash");

-- AddForeignKey
ALTER TABLE "rombel" ADD CONSTRAINT "rombel_tingkat_id_fkey" FOREIGN KEY ("tingkat_id") REFERENCES "tingkat"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rombel" ADD CONSTRAINT "rombel_tahun_ajaran_id_fkey" FOREIGN KEY ("tahun_ajaran_id") REFERENCES "tahun_ajaran"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rombel" ADD CONSTRAINT "rombel_wali_kelas_id_fkey" FOREIGN KEY ("wali_kelas_id") REFERENCES "guru"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pengguna" ADD CONSTRAINT "pengguna_guru_id_fkey" FOREIGN KEY ("guru_id") REFERENCES "guru"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pengguna" ADD CONSTRAINT "pengguna_siswa_id_fkey" FOREIGN KEY ("siswa_id") REFERENCES "siswa"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "siswa" ADD CONSTRAINT "siswa_rombel_id_fkey" FOREIGN KEY ("rombel_id") REFERENCES "rombel"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "guru_mapel" ADD CONSTRAINT "guru_mapel_guru_id_fkey" FOREIGN KEY ("guru_id") REFERENCES "guru"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "guru_mapel" ADD CONSTRAINT "guru_mapel_mapel_id_fkey" FOREIGN KEY ("mapel_id") REFERENCES "mapel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jadwal" ADD CONSTRAINT "jadwal_rombel_id_fkey" FOREIGN KEY ("rombel_id") REFERENCES "rombel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jadwal" ADD CONSTRAINT "jadwal_mapel_id_fkey" FOREIGN KEY ("mapel_id") REFERENCES "mapel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jadwal" ADD CONSTRAINT "jadwal_guru_id_fkey" FOREIGN KEY ("guru_id") REFERENCES "guru"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "absensi" ADD CONSTRAINT "absensi_siswa_id_fkey" FOREIGN KEY ("siswa_id") REFERENCES "siswa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "absensi" ADD CONSTRAINT "absensi_mapel_id_fkey" FOREIGN KEY ("mapel_id") REFERENCES "mapel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "absensi" ADD CONSTRAINT "absensi_dicatat_oleh_fkey" FOREIGN KEY ("dicatat_oleh") REFERENCES "guru"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "absensi_guru" ADD CONSTRAINT "absensi_guru_guru_id_fkey" FOREIGN KEY ("guru_id") REFERENCES "guru"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nilai" ADD CONSTRAINT "nilai_siswa_id_fkey" FOREIGN KEY ("siswa_id") REFERENCES "siswa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nilai" ADD CONSTRAINT "nilai_mapel_id_fkey" FOREIGN KEY ("mapel_id") REFERENCES "mapel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nilai" ADD CONSTRAINT "nilai_tahun_ajaran_id_fkey" FOREIGN KEY ("tahun_ajaran_id") REFERENCES "tahun_ajaran"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "perizinan" ADD CONSTRAINT "perizinan_siswa_id_fkey" FOREIGN KEY ("siswa_id") REFERENCES "siswa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "perizinan" ADD CONSTRAINT "perizinan_diproses_oleh_fkey" FOREIGN KEY ("diproses_oleh") REFERENCES "guru"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pelanggaran" ADD CONSTRAINT "pelanggaran_siswa_id_fkey" FOREIGN KEY ("siswa_id") REFERENCES "siswa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pelanggaran" ADD CONSTRAINT "pelanggaran_dicatat_oleh_fkey" FOREIGN KEY ("dicatat_oleh") REFERENCES "guru"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "riwayat_kelas" ADD CONSTRAINT "riwayat_kelas_siswa_id_fkey" FOREIGN KEY ("siswa_id") REFERENCES "siswa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "riwayat_kelas" ADD CONSTRAINT "riwayat_kelas_rombel_lama_id_fkey" FOREIGN KEY ("rombel_lama_id") REFERENCES "rombel"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "riwayat_kelas" ADD CONSTRAINT "riwayat_kelas_rombel_baru_id_fkey" FOREIGN KEY ("rombel_baru_id") REFERENCES "rombel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "riwayat_kelas" ADD CONSTRAINT "riwayat_kelas_tahun_ajaran_id_fkey" FOREIGN KEY ("tahun_ajaran_id") REFERENCES "tahun_ajaran"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "riwayat_kelas" ADD CONSTRAINT "riwayat_kelas_diproses_oleh_fkey" FOREIGN KEY ("diproses_oleh") REFERENCES "guru"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sesi" ADD CONSTRAINT "sesi_pengguna_id_fkey" FOREIGN KEY ("pengguna_id") REFERENCES "pengguna"("id") ON DELETE CASCADE ON UPDATE CASCADE;
