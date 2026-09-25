-- AlterTable
ALTER TABLE "nilai" ADD COLUMN     "judul" VARCHAR(100);

-- AlterTable
ALTER TABLE "perizinan" ADD COLUMN     "diajukan_oleh_id" UUID;

-- CreateTable
CREATE TABLE "bobot_nilai" (
    "id" UUID NOT NULL,
    "guru_id" UUID,
    "mapel_id" UUID NOT NULL,
    "tahun_ajaran_id" UUID NOT NULL,
    "bobot_tugas" INTEGER NOT NULL DEFAULT 20,
    "bobot_harian" INTEGER NOT NULL DEFAULT 30,
    "bobot_uts" INTEGER NOT NULL DEFAULT 25,
    "bobot_uas" INTEGER NOT NULL DEFAULT 25,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bobot_nilai_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ortu_siswa" (
    "id" UUID NOT NULL,
    "ortu_id" UUID NOT NULL,
    "siswa_id" UUID NOT NULL,
    "hubungan" VARCHAR(20),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ortu_siswa_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tugas" (
    "id" UUID NOT NULL,
    "rombel_id" UUID NOT NULL,
    "mapel_id" UUID NOT NULL,
    "guru_id" UUID NOT NULL,
    "judul" VARCHAR(150) NOT NULL,
    "deskripsi" TEXT NOT NULL,
    "tenggat_waktu" TIMESTAMP(3) NOT NULL,
    "file_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tugas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pengumpulan_tugas" (
    "id" UUID NOT NULL,
    "tugas_id" UUID NOT NULL,
    "siswa_id" UUID NOT NULL,
    "file_url" TEXT NOT NULL,
    "catatan" TEXT,
    "nilai" DECIMAL(5,2),
    "catatan_guru" TEXT,
    "dikumpulkan_pada" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dinilai_pada" TIMESTAMP(3),

    CONSTRAINT "pengumpulan_tugas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "percakapan" (
    "id" UUID NOT NULL,
    "wali_id" UUID NOT NULL,
    "ortu_id" UUID NOT NULL,
    "siswa_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "percakapan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pesan" (
    "id" UUID NOT NULL,
    "percakapan_id" UUID NOT NULL,
    "pengirim_id" UUID NOT NULL,
    "isi" TEXT NOT NULL,
    "is_dibaca" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pesan_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "bobot_nilai_mapel_id_tahun_ajaran_id_guru_id_key" ON "bobot_nilai"("mapel_id", "tahun_ajaran_id", "guru_id");

-- CreateIndex
CREATE UNIQUE INDEX "ortu_siswa_ortu_id_siswa_id_key" ON "ortu_siswa"("ortu_id", "siswa_id");

-- CreateIndex
CREATE UNIQUE INDEX "pengumpulan_tugas_tugas_id_siswa_id_key" ON "pengumpulan_tugas"("tugas_id", "siswa_id");

-- CreateIndex
CREATE UNIQUE INDEX "percakapan_wali_id_ortu_id_siswa_id_key" ON "percakapan"("wali_id", "ortu_id", "siswa_id");

-- AddForeignKey
ALTER TABLE "bobot_nilai" ADD CONSTRAINT "bobot_nilai_guru_id_fkey" FOREIGN KEY ("guru_id") REFERENCES "guru"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bobot_nilai" ADD CONSTRAINT "bobot_nilai_mapel_id_fkey" FOREIGN KEY ("mapel_id") REFERENCES "mapel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bobot_nilai" ADD CONSTRAINT "bobot_nilai_tahun_ajaran_id_fkey" FOREIGN KEY ("tahun_ajaran_id") REFERENCES "tahun_ajaran"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "perizinan" ADD CONSTRAINT "perizinan_diajukan_oleh_id_fkey" FOREIGN KEY ("diajukan_oleh_id") REFERENCES "pengguna"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ortu_siswa" ADD CONSTRAINT "ortu_siswa_ortu_id_fkey" FOREIGN KEY ("ortu_id") REFERENCES "pengguna"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ortu_siswa" ADD CONSTRAINT "ortu_siswa_siswa_id_fkey" FOREIGN KEY ("siswa_id") REFERENCES "siswa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tugas" ADD CONSTRAINT "tugas_rombel_id_fkey" FOREIGN KEY ("rombel_id") REFERENCES "rombel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tugas" ADD CONSTRAINT "tugas_mapel_id_fkey" FOREIGN KEY ("mapel_id") REFERENCES "mapel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tugas" ADD CONSTRAINT "tugas_guru_id_fkey" FOREIGN KEY ("guru_id") REFERENCES "guru"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pengumpulan_tugas" ADD CONSTRAINT "pengumpulan_tugas_tugas_id_fkey" FOREIGN KEY ("tugas_id") REFERENCES "tugas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pengumpulan_tugas" ADD CONSTRAINT "pengumpulan_tugas_siswa_id_fkey" FOREIGN KEY ("siswa_id") REFERENCES "siswa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "percakapan" ADD CONSTRAINT "percakapan_wali_id_fkey" FOREIGN KEY ("wali_id") REFERENCES "guru"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "percakapan" ADD CONSTRAINT "percakapan_ortu_id_fkey" FOREIGN KEY ("ortu_id") REFERENCES "pengguna"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "percakapan" ADD CONSTRAINT "percakapan_siswa_id_fkey" FOREIGN KEY ("siswa_id") REFERENCES "siswa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pesan" ADD CONSTRAINT "pesan_percakapan_id_fkey" FOREIGN KEY ("percakapan_id") REFERENCES "percakapan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pesan" ADD CONSTRAINT "pesan_pengirim_id_fkey" FOREIGN KEY ("pengirim_id") REFERENCES "pengguna"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
