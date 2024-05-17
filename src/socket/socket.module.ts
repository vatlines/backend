import { Module } from '@nestjs/common';
import { ConfigurationModule } from 'src/configuration/configuration.module';
import { VatsimDataModule } from 'src/vatsim-data/vatsim-data.module';
import { SocketGateway } from './socket.gateway';

@Module({
  imports: [VatsimDataModule, ConfigurationModule],
  providers: [SocketGateway],
})
export class SocketModule {}
