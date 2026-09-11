import { Module } from '@nestjs/common';
import { OrtuController } from './ortu.controller';
import { OrtuService } from './ortu.service';

@Module({
  controllers: [OrtuController],
  providers: [OrtuService],
  exports: [OrtuService],
})
export class OrtuModule {}
