import 'package:flutter_test/flutter_test.dart';
import 'package:mobile_guru/core/api/page.dart';
import 'package:mobile_guru/features/jadwal/jadwal_repository.dart';

void main() {
  test('Page.fromJson memetakan data + meta', () {
    final page = Page<Map<String, dynamic>>.fromJson(
      {
        'data': [
          {'id': '1'},
          {'id': '2'},
        ],
        'meta': {'total': 32, 'page': 1, 'limit': 30, 'totalPages': 2},
      },
      (j) => j,
    );
    expect(page.data, hasLength(2));
    expect(page.meta.total, 32);
    expect(page.meta.totalPages, 2);
  });

  test('Page.fromJson tahan null', () {
    final page = Page<Map<String, dynamic>>.fromJson({}, (j) => j);
    expect(page.data, isEmpty);
    expect(page.meta.page, 1);
  });

  test('Jadwal.fromJson membaca relasi rombel + mapel', () {
    final j = Jadwal.fromJson({
      'id': 'j1',
      'hari': 'SENIN',
      'jamKe': 3,
      'rombel': {'id': 'r1', 'nama': '7A'},
      'mapel': {'id': 'm1', 'nama': 'Informatika'},
    });
    expect(j.rombelNama, '7A');
    expect(j.mapelNama, 'Informatika');
    expect(j.jamKe, 3);
  });
}
