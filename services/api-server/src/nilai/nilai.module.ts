import { Module } from '@nestjs/common';
import { NilaiController } from './nilai.controller';
import { NilaiService } from './nilai.service';

@Module({
  controllers: [NilaiController],
  providers: [NilaiService],
  exports: [NilaiService],
})
export class NilaiModule {}
