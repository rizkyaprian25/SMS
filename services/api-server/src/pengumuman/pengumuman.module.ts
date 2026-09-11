import { Module } from '@nestjs/common';
import { PengumumanController } from './pengumuman.controller';
import { PengumumanService } from './pengumuman.service';
import { NotifikasiModule } from '../notifikasi/notifikasi.module';

@Module({
  imports: [NotifikasiModule],
  controllers: [PengumumanController],
  providers: [PengumumanService],
  exports: [PengumumanService],
})
export class PengumumanModule {}
