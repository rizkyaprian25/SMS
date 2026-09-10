import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { RombelModule } from './rombel/rombel.module';
import { HealthController } from './health.controller';

@Module({
  imports: [
    PrismaModule,
    JwtModule.register({
      global: true,
      secret: process.env.JWT_ACCESS_SECRET ?? 'dev-access-secret-min-32-karakter-xxxx',
      signOptions: { expiresIn: '15m' },
    }),
    AuthModule,
    RombelModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
