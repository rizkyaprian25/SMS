import { Module } from '@nestjs/common';
import { PerizinanController } from './perizinan.controller';
import { PerizinanService } from './perizinan.service';

@Module({
  controllers: [PerizinanController],
  providers: [PerizinanService],
  exports: [PerizinanService],
})
export class PerizinanModule {}
