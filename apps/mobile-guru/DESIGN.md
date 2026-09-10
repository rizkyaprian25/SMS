# apps/mobile-guru — DESIGN

App Flutter guru (MVP). Detail: `docs/05-mobile-guru-design.md`, face: `docs/09`, offline: `docs/10`.

- State Riverpod (`AsyncNotifier`), navigasi go_router + guard login, network Dio, draft offline Hive, push FCM.
- Fitur: login, jadwal saya, absensi manual bulk (mapel otomatis dari akun), presensi wajah masuk/pulang + fallback, nilai cepat, pengumuman, profil. Wali kelas +approval izin.
- Aturan: mapel & rombel dari API (`GET /jadwal-saya`, `GET /rombel`), jangan hard-code. Kode face hanya di `features/presensi`.

```powershell
flutter pub get
flutter run --dart-define=API_URL=http://192.168.1.10:3001
flutter analyze; flutter test
```
