import 'package:flutter/material.dart';

/// Inti MVP: pilih kelas -> daftar siswa -> Tandai Semua Hadir -> ubah yg Izin/Sakit/Alpa
/// -> POST /absensi/bulk 1 request. Mapel otomatis dari akun (jangan pilih manual).
/// Offline: simpan ke Hive box absensi_tertunda + badge. Lihat docs/05 + docs/10.
class AbsensiScreen extends StatefulWidget {
  const AbsensiScreen({super.key});

  @override
  State<AbsensiScreen> createState() => _AbsensiScreenState();
}

class _AbsensiScreenState extends State<AbsensiScreen> {
  final Map<String, String> status = {};
  String info = 'TODO: muat GET /rombel/:id/siswa?tanggal=. Contoh 3 siswa di bawah.';

  @override
  void initState() {
    super.initState();
    for (final n in ['Siswa 1', 'Siswa 2', 'Siswa 3']) {
      status[n] = 'HADIR';
    }
  }

  @override
  Widget build(BuildContext context) {
    const opsi = ['HADIR', 'IZIN', 'SAKIT', 'ALPA'];
    return Scaffold(
      appBar: AppBar(
        title: const Text('Absensi 7A — Informatika'),
        actions: [
          TextButton(
            onPressed: () => setState(() => status.updateAll((_, __) => 'HADIR')),
            child: const Text('Semua Hadir', style: TextStyle(color: Colors.white)),
          ),
        ],
      ),
      body: Column(
        children: [
          Padding(padding: const EdgeInsets.all(8), child: Text(info)),
          Expanded(
            child: ListView.builder(
              itemCount: status.length,
              itemBuilder: (_, i) {
                final nama = status.keys.elementAt(i);
                return ListTile(
                  title: Text(nama),
                  trailing: DropdownButton<String>(
                    value: status[nama],
                    items: [for (final o in opsi) DropdownMenuItem(value: o, child: Text(o))],
                    onChanged: (v) => setState(() => status[nama] = v ?? 'HADIR'),
                  ),
                );
              },
            ),
          ),
          Padding(
            padding: const EdgeInsets.all(16),
            child: FilledButton(
              onPressed: () {
                // TODO: POST /absensi/bulk; gagal jaringan -> Hive + badge "Belum tersinkron".
                setState(() => info = 'TODO: kirim bulk (${status.length} siswa).');
              },
              child: const Text('Simpan Absensi (bulk)'),
            ),
          ),
        ],
      ),
    );
  }
}
