import { Module } from '@nestjs/common';
import { AbsensiController } from './absensi.controller';
import { AbsensiService } from './absensi.service';

@Module({
  controllers: [AbsensiController],
  providers: [AbsensiService],
  exports: [AbsensiService],
})
export class AbsensiModule {}
