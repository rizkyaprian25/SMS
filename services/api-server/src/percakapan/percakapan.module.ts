import { Module } from '@nestjs/common';
import { PercakapanController } from './percakapan.controller';
import { PercakapanService } from './percakapan.service';

@Module({
  controllers: [PercakapanController],
  providers: [PercakapanService],
  exports: [PercakapanService],
})
export class PercakapanModule {}
