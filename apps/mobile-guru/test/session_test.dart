import 'package:flutter_test/flutter_test.dart';
import 'package:mobile_guru/core/auth/session.dart';

void main() {
  group('SessionData Tests', () {
    test('SessionData default belum masuk', () {
      const session = SessionData();
      expect(session.sudahMasuk, isFalse);
      expect(session.token, isNull);
      expect(session.guruNama, isNull);
    });

    test('SessionData dengan data guru terisi lengkap', () {
      const session = SessionData(
        token: 'test_token_123',
        email: 'guru.smp@sekolah.sch.id',
        role: 'GURU_MAPEL',
        guruNama: 'Budi Santoso, S.Pd',
        guruNip: '198501012010011001',
      );

      expect(session.sudahMasuk, isTrue);
      expect(session.email, 'guru.smp@sekolah.sch.id');
      expect(session.role, 'GURU_MAPEL');
      expect(session.guruNama, 'Budi Santoso, S.Pd');
      expect(session.guruNip, '198501012010011001');
    });
  });
}
