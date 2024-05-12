import { Module } from '@nestjs/common';
import { ConfigurationModule } from 'src/configuration/configuration.module';
import { SocketGateway } from './socket.gateway';

@Module({
  imports: [ConfigurationModule],
  providers: [SocketGateway],
})
export class SocketModule {}
