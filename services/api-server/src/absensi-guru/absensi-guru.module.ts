import { Module } from '@nestjs/common';
import { AbsensiGuruController } from './absensi-guru.controller';
import { AbsensiGuruService } from './absensi-guru.service';

@Module({
  controllers: [AbsensiGuruController],
  providers: [AbsensiGuruService],
  exports: [AbsensiGuruService],
})
export class AbsensiGuruModule {}
