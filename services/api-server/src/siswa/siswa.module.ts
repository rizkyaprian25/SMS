import { Module } from '@nestjs/common';
import { SiswaController } from './siswa.controller';
import { SiswaService } from './siswa.service';
import { ImportService } from './import.service';

@Module({
  controllers: [SiswaController],
  providers: [SiswaService, ImportService],
  exports: [SiswaService],
})
export class SiswaModule {}
