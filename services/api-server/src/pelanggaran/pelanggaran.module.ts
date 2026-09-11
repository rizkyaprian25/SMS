import { Module } from '@nestjs/common';
import { PelanggaranController } from './pelanggaran.controller';
import { PelanggaranService } from './pelanggaran.service';

@Module({
  controllers: [PelanggaranController],
  providers: [PelanggaranService],
  exports: [PelanggaranService],
})
export class PelanggaranModule {}
