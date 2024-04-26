import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { VatsimDataService } from './vatsim-data.service';

@Module({
  providers: [VatsimDataService],
  imports: [HttpModule],
})
export class VatsimDataModule {}
