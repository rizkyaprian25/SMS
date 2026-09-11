import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:hive_flutter/hive_flutter.dart';
import 'app.dart';

/// Box antrean offline absensi (docs/10). 1 entry = 1 request bulk.
const antreanBox = 'absensi_tertunda';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await Hive.initFlutter();
  await Hive.openBox(antreanBox);
  runApp(const ProviderScope(child: SmsApp()));
}
