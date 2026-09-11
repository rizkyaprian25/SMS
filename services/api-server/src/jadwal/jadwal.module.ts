import { Module } from '@nestjs/common';
import { JadwalController } from './jadwal.controller';
import { JadwalService } from './jadwal.service';

@Module({
  controllers: [JadwalController],
  providers: [JadwalService],
  exports: [JadwalService],
})
export class JadwalModule {}
