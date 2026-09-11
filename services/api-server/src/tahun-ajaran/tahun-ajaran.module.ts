import { Module } from '@nestjs/common';
import { TahunAjaranController } from './tahun-ajaran.controller';
import { TahunAjaranService } from './tahun-ajaran.service';

@Module({
  controllers: [TahunAjaranController],
  providers: [TahunAjaranService],
  exports: [TahunAjaranService],
})
export class TahunAjaranModule {}
