import { Module } from '@nestjs/common';
import { RombelController } from './rombel.controller';
import { RombelService } from './rombel.service';

@Module({
  controllers: [RombelController],
  providers: [RombelService],
  exports: [RombelService],
})
export class RombelModule {}
