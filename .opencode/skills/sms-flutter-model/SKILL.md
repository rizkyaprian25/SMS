---
name: sms-flutter-model
description: Pola model Mobile Guru Flutter SMS (feature-first, Riverpod AsyncNotifier, repository, offline khusus absensi). Pakai saat menambah fitur di apps/mobile-guru.
---

# SMS Flutter Model (Flutter + Riverpod)

Acuan: `docs/05-mobile-guru-design.md`, offline `docs/10-notification-offline-sync.md`, face `docs/09-face-recognition-design.md`.

## Struktur (feature-first, jangan campur Bloc/GetX)

```
lib/
├── core/api/dio_client.dart   # satu-satunya HTTP client
├── core/api/page.dart         # model Page<T> generik untuk list paginated
├── core/auth/                 # token (secure storage), guard route
└── features/<fitur>/
    ├── <fitur>_screen.dart       # UI saja, tanpa Dio langsung
    ├── <fitur>_repository.dart   # abstract + implementasi Dio (1 class per file)
    └── <fitur>_provider.dart     # AsyncNotifier + StateProvider terkait
```

## Aturan

1. Screen tidak boleh import `dio` / panggil HTTP langsung — selalu lewat repository. Repository menerima `DioClient` via constructor (mudah di-mock untuk test).
2. State remote pakai Riverpod `AsyncNotifier` (`.when(loading/error/data)` di UI). `setState` hanya untuk state lokal murni (tab, dropdown).
3. List dari API selalu model `Page<T>` (`core/api/page.dart`) — jangan parse `data` mentah di tiap screen.
4. Offline: HANYA absensi siswa yang antre (Hive box `absensi_tertunda`, 1 paket = 1 request bulk) + badge "Belum tersinkron" + retry saat online + dialog konflik bila server sudah punya data. Presensi wajah dan nilai wajib online dengan pesan jelas.
5. Face recognition terisolasi di `features/presensi/`. Jangan simpan foto wajah mentah; hanya embedding, hapus foto setelah jadi. Tanpa consent (`face_consent`) tolak enroll.
6. Jangan hard-code mapel/rombel — dari `GET /jadwal-saya` dan `GET /rombel`. Mapel absensi otomatis dari akun guru.
7. List panjang: `ListView.builder`, search lokal, thumbnail kecil. API URL hanya via `--dart-define=API_URL=`.
8. Setiap fitur baru: `flutter analyze` bersih + widget test untuk flow inti bila ada logika.

## Contoh acuan di repo

- `core/api/page.dart` — parsing paginated generik.
- `features/rombel/rombel_repository.dart` — contoh abstract + implementasi + provider.
- `features/absensi/absensi_screen.dart` — contoh pola bulk + "Tandai Semua Hadir".
