import { Module } from '@nestjs/common';
import { RaporController } from './rapor.controller';
import { RaporService } from './rapor.service';

@Module({
  controllers: [RaporController],
  providers: [RaporService],
  exports: [RaporService],
})
export class RaporModule {}
