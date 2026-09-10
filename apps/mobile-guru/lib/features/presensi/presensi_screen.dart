import 'package:flutter/material.dart';

/// Presensi wajah masuk/pulang. Lihat docs/09.
/// Kamera + liveness (ML Kit) on-device, kirim {face_score, liveness, lat, lng}.
/// Gagal 3x -> fallback manual (PENDING, verifikasi admin).
class PresensiScreen extends StatelessWidget {
  const PresensiScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Presensi')),
      body: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const Text('TODO: integrasi google_mlkit_face_detection + liveness + geofence.'),
            const SizedBox(height: 12),
            FilledButton(onPressed: () {}, child: const Text('Presensi Masuk (wajah)')),
            OutlinedButton(onPressed: () {}, child: const Text('Presensi Pulang (wajah)')),
            TextButton(onPressed: () {}, child: const Text('Fallback manual (butuh approval)')),
          ],
        ),
      ),
    );
  }
}
