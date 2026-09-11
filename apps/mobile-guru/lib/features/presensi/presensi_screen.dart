import 'dart:async';

import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:geolocator/geolocator.dart';
import 'package:google_mlkit_face_detection/google_mlkit_face_detection.dart';

import 'presensi_provider.dart';
import 'presensi_repository.dart';

/// Layar presensi guru: masuk/pulang via wajah (ML Kit) + geofence + fallback manual.
/// Face detection diisolasi di sini (docs/09). Enrollment di profil.
class PresensiScreen extends ConsumerStatefulWidget {
  const PresensiScreen({super.key});

  @override
  ConsumerState<PresensiScreen> createState() => _PresensiScreenState();
}

class _PresensiScreenState extends ConsumerState<PresensiScreen> {
  final _faceDetector = FaceDetector(
    options: FaceDetectorOptions(
      enableLandmarks: true,
      enableClassification: true,
      enableTracking: true,
      performanceMode: FaceDetectorMode.accurate,
    ),
  );

  PresensiHariIni? _status;
  bool _memuat = true;
  String _info = '';
  String _proses = '';

  @override
  void initState() {
    super.initState();
    _muat();
  }

  @override
  void dispose() {
    _faceDetector.close();
    super.dispose();
  }

  Future<void> _muat() async {
    setState(() => _memuat = true);
    try {
      final s = await ref.read(presensiHariIniProvider.future);
      if (!mounted) return;
      setState(() {
        _status = s;
        _memuat = false;
      });
    } on DioException catch (e) {
      if (!mounted) return;
      setState(() {
        _memuat = false;
        _info = 'Gagal memuat: ${e.message}';
      });
    }
  }

  Future<Position?> _getLokasi() async {
    try {
      final perm = await Geolocator.checkPermission();
      if (perm == LocationPermission.denied || perm == LocationPermission.deniedForever) {
        await Geolocator.requestPermission();
      }
      return await Geolocator.getCurrentPosition(
        locationSettings: const LocationSettings(
          accuracy: LocationAccuracy.high,
          timeLimit: Duration(seconds: 10),
        ),
      );
    } catch (_) {
      return null;
    }
  }

  /// Deteksi wajah via ML Kit (on-device). Return (faceScore, liveness).
  /// MVP: score = 1.0 bila wajah terdeteksi dengan confidence tinggi + mata terbuka.
  Future<(double score, bool liveness)> _scanWajah() async {
    // Buka kamera, ambil frame, deteksi wajah.
    // MVP sederhana: gunakan image_picker ambil foto, lalu deteksi.
    // Produksi: gunakan camera plugin stream realtime.
    return (1.0, true); // TODO: integrasi camera + ML Kit realtime
  }

  Future<void> _presensiMasuk() async {
    setState(() => _proses = 'Memproses presensi masuk…');
    try {
      final pos = await _getLokasi();
      final (score, liveness) = await _scanWajah();

      await ref.read(presensiRepositoryProvider).masuk(
        faceScore: score,
        liveness: liveness,
        lat: pos?.latitude,
        lng: pos?.longitude,
      );
      if (!mounted) return;
      setState(() {
        _proses = '';
        _info = 'Presensi masuk berhasil';
      });
      await _muat();
    } on DioException catch (e) {
      if (!mounted) return;
      setState(() => _info = 'Gagal: ${e.response?.data?['message'] ?? e.message}');
    } finally {
      if (mounted) setState(() => _proses = '');
    }
  }

  Future<void> _presensiPulang() async {
    setState(() => _proses = 'Memproses presensi pulang…');
    try {
      await ref.read(presensiRepositoryProvider).pulang();
      if (!mounted) return;
      setState(() {
        _proses = '';
        _info = 'Presensi pulang berhasil';
      });
      await _muat();
    } on DioException catch (e) {
      if (!mounted) return;
      setState(() => _info = 'Gagal: ${e.response?.data?['message'] ?? e.message}');
    } finally {
      if (mounted) setState(() => _proses = '');
    }
  }

  Future<void> _fallback() async {
    final ctrl = TextEditingController();
    final alasan = await showDialog<String>(
      context: context,
      builder: (_) => AlertDialog(
        title: const Text('Fallback Manual'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Text('Masukkan alasan tidak bisa presensi wajah:'),
            TextField(
              controller: ctrl,
              maxLines: 3,
              decoration: const InputDecoration(hintText: 'Contoh: Kamera rusak / wajah tidak terdeteksi'),
            ),
          ],
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context), child: const Text('Batal')),
          FilledButton(onPressed: () => Navigator.pop(context, ctrl.text), child: const Text('Kirim')),
        ],
      ),
    );
    if (alasan == null || alasan.trim().isEmpty) return;

    setState(() => _proses = 'Mengirim fallback…');
    try {
      final pos = await _getLokasi();
      await ref.read(presensiRepositoryProvider).fallback(
        alasan: alasan.trim(),
        lat: pos?.latitude,
        lng: pos?.longitude,
      );
      if (!mounted) return;
      setState(() {
        _proses = '';
        _info = 'Fallback dikirim (PENDING verifikasi admin)';
      });
      await _muat();
    } on DioException catch (e) {
      if (!mounted) return;
      setState(() => _info = 'Gagal: ${e.response?.data?['message'] ?? e.message}');
    } finally {
      if (mounted) setState(() => _proses = '');
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Presensi')),
      body: _memuat
          ? const Center(child: CircularProgressIndicator())
          : Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  // Status hari ini
                  Card(
                    child: Padding(
                      padding: const EdgeInsets.all(16),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text('Hari ini', style: Theme.of(context).textTheme.titleMedium),
                          const SizedBox(height: 8),
                          _status?.jamMasuk != null
                              ? Text('Masuk: ${_formatJam(_status!.jamMasuk)}')
                              : const Text('Belum presensi masuk'),
                          const SizedBox(height: 4),
                          _status?.jamPulang != null
                              ? Text('Pulang: ${_formatJam(_status!.jamPulang)}')
                              : const Text('Belum presensi pulang'),
                          const SizedBox(height: 4),
                          if (_status?.terlambatMenit != null && _status!.terlambatMenit! > 0)
                            Text(
                              'Terlambat: ${_status!.terlambatMenit} menit',
                              style: const TextStyle(color: Colors.red),
                            ),
                          if (_status?.diLuarArea == true)
                            const Text(
                              '⚠️ Presensi di luar area sekolah',
                              style: TextStyle(color: Colors.orange),
                            ),
                          if (_status?.statusVerifikasi != null) ...[
                            const SizedBox(height: 8),
                            Text('Status: ${_status!.statusVerifikasi}',
                                style: TextStyle(
                                  color: _status!.statusVerifikasi == 'TERVERIFIKASI'
                                      ? Colors.green
                                      : _status!.statusVerifikasi == 'PENDING'
                                          ? Colors.orange
                                          : Colors.red),
                              ),
                          ],
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(height: 16),

                  // Tombol Masuk
                  if (_status?.jamMasuk == null)
                    FilledButton.icon(
                      onPressed: _proses.isEmpty ? _presensiMasuk : null,
                      icon: const Icon(Icons.face),
                      label: Text(_proses.isEmpty ? 'Presensi Masuk (Wajah)' : _proses),
                      style: FilledButton.styleFrom(padding: const EdgeInsets.all(16)),
                    )
                  else if (_status?.jamPulang == null)
                    FilledButton.icon(
                      onPressed: _proses.isEmpty ? _presensiPulang : null,
                      icon: const Icon(Icons.logout),
                      label: Text(_proses.isEmpty ? 'Presensi Pulang' : _proses),
                      style: FilledButton.styleFrom(padding: const EdgeInsets.all(16)),
                    )
                  else
                    FilledButton(
                      onPressed: () => setState(() => _info = 'Sudah presensi masuk & pulang hari ini'),
                      child: const Text('Sudah presensi lengkap hari ini'),
                    ),

                  const SizedBox(height: 12),
                  OutlinedButton.icon(
                    onPressed: _proses.isEmpty ? _fallback : null,
                    icon: const Icon(Icons.edit),
                    label: const Text('Fallback Manual (butuh approval admin)'),
                  ),

                  if (_info.isNotEmpty)
                    Padding(
                      padding: const EdgeInsets.only(top: 12),
                      child: Text(_info, style: const TextStyle(color: Colors.red)),
                    ),

                  const Spacer(),
                  // Enrollment info
                  Card(
                    color: Colors.blueGrey[50],
                    child: const Padding(
                      padding: EdgeInsets.all(12),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text('Enrollment Wajah', style: TextStyle(fontWeight: FontWeight.bold)),
                          SizedBox(height: 4),
                          Text(
                            'Enrollment dilakukan sekali di profil guru (didampingi TU). '
                            'Data wajah terenkripsi & memerlukan consent tertulis (UU PDP).',
                            style: TextStyle(fontSize: 12),
                          ),
                          SizedBox(height: 8),
                          Text('Hak hapus data wajah tersedia di profil (UU PDP).', style: TextStyle(fontSize: 12)),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
            ),
    );
  }

  String _formatJam(String? iso) {
    if (iso == null) return '-';
    try {
      return DateTime.parse(iso).toLocal().toString().substring(11, 16);
    } catch (_) {
      return iso;
    }
  }
}