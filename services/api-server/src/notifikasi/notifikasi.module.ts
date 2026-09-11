import { Module } from '@nestjs/common';
import { NotifikasiController } from './notifikasi.controller';
import { NotifikasiService } from './notifikasi.service';
import { FcmService } from './fcm.service';

@Module({
  controllers: [NotifikasiController],
  providers: [NotifikasiService, FcmService],
  exports: [NotifikasiService],
})
export class NotifikasiModule {}
