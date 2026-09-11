-- CreateTable
CREATE TABLE "notifikasi" (
    "id" UUID NOT NULL,
    "judul" TEXT NOT NULL,
    "isi" TEXT NOT NULL,
    "route" TEXT,
    "target" VARCHAR(50),
    "terkirim" INTEGER NOT NULL DEFAULT 0,
    "gagal" INTEGER NOT NULL DEFAULT 0,
    "mode" VARCHAR(10) NOT NULL DEFAULT 'FCM',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifikasi_pkey" PRIMARY KEY ("id")
);
