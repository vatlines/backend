import { Module } from '@nestjs/common';
import { ConfigurationModule } from 'src/configuration/configuration.module';
import { SocketGateway } from './socket.gateway';
import { SocketService } from './socket.service';

@Module({
  imports: [ConfigurationModule],
  providers: [SocketService, SocketGateway],
})
export class SocketModule {}
