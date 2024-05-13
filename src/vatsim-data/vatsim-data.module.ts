import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { VatsimDataController } from './vatsim-data.controller';
import { VatsimDataService } from './vatsim-data.service';

@Module({
  controllers: [VatsimDataController],
  providers: [VatsimDataService],
  imports: [HttpModule, ConfigModule],
})
export class VatsimDataModule {}
