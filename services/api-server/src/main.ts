import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

/**
 * Gagal boot di production bila secret masih bawaan/contoh —
 * mencegah JWT bisa ditempa dengan secret publik di repo/contoh.
 */
function assertEnvProduksi() {
  if (process.env.NODE_ENV !== 'production') return;
  const bawaan = [
    'dev-access-secret-min-32-karakter-xxxx',
    'dev-refresh-secret-min-32-karakter-xxx',
    'ganti-min-32-karakter-akses',
    'ganti-min-32-karakter-refresh',
  ];
  for (const k of ['DATABASE_URL', 'JWT_ACCESS_SECRET', 'JWT_REFRESH_SECRET', 'ENKRIPSI_WAJAH_KEY']) {
    const v = process.env[k] ?? '';
    if (!v || bawaan.includes(v)) {
      throw new Error(`${k} wajib diisi secret asli di production`);
    }
  }
}

async function bootstrap() {
  assertEnvProduksi();
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api/v1');
  app.use(helmet());
  app.use(cookieParser());
  const asal = (process.env.CORS_ORIGIN ?? '').split(',').map((s) => s.trim()).filter(Boolean);
  app.enableCors({
    origin: asal.length ? asal : true, // dev: true; prod: isi CORS_ORIGIN
    credentials: true,
  });
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
  );
  app.useGlobalFilters(new HttpExceptionFilter());

  // Swagger hanya non-prod agar skema internal tidak terekspos publik.
  if (process.env.NODE_ENV !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('SMS SMP Negeri API')
      .setDescription('Kontrak tunggal web + mobile. Lihat docs/07-api-contract.md')
      .setVersion('1.0')
      .addBearerAuth()
      .build();
    const doc = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, doc);
  }

  const port = Number(process.env.PORT ?? 3001);
  await app.listen(port);
}
bootstrap().then(() => console.log('API ready'));
