import { Logger } from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { randomUUID } from 'crypto';
import { Server } from 'socket.io';
import { ConfigurationLayout } from 'src/configuration/entities/configuration-layout.entity';
import { PositionConfiguration } from 'src/configuration/entities/position-configuration.entity';
import { ButtonType } from 'src/configuration/enums';
import { SocketWithAuth } from '../socket-io-adapter';
import { SocketService } from './socket.service';
import {
  CALL_TYPE,
  InitiateLandlineData,
  Landline,
  LandlineData,
  SignalData,
} from './types';

@WebSocketGateway()
export class SocketGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  private readonly logger = new Logger(SocketGateway.name);
  private activeLandlines: Landline[] = [];
  private sockets: string[] = [];

  constructor(private readonly socketService: SocketService) {}

  @WebSocketServer() io: Server;

  afterInit(_server: Server) {
    this.logger.log(`Websocket gateway initialized.`);
  }

  async handleConnection(client: SocketWithAuth, ..._args: any[]) {
    this.logger.log(
      `new connection ${client.cid} signed in to ${`facility`} ${`sector`} from ${client.id}. Network callsign ${client.callsign}`,
    );

    client.data.position = `${`facility`}-${`sector`}`;
    // @TODO load actual config
    // client.emit('config', 'config');
    client.join([`${'facility'}`, `${'facility'}-${'sector'}`]);

    this.io.emit(
      'rooms',
      Array.from(this.io.sockets.adapter.rooms.keys()).filter(
        (s) => !s.includes(s) && s.length < 10,
      ),
    );

    client.on('disconnecting', () => {
      this.io.emit('disconnected', client.id);
      this.activeLandlines
        .filter((l) => l.initiator === client.id)
        .forEach((l) => {
          this.logger.log(`disconnect terminating`, l.id);
          this.io.emit('terminate-landline', l.id);
        });

      let index = this.activeLandlines.findIndex(
        (l) => l.initiator === client.id,
      );
      while (index !== -1) {
        this.activeLandlines.splice(index, 1);
        index = this.activeLandlines.findIndex(
          (l) => l.initiator === client.id,
        );
      }
    });
  }

  async handleDisconnect(client: SocketWithAuth) {
    client.rooms.forEach((room) => {
      this.logger.debug(`${client.id} was in ${room}`);
    });
    if (this.sockets.indexOf(client.id) !== -1) {
      this.sockets.splice(this.sockets.indexOf(client.id), 1);
    }
  }

  @SubscribeMessage('initiate-landline')
  async initiateLandline(
    @MessageBody() data: InitiateLandlineData,
    @ConnectedSocket() client: SocketWithAuth,
  ) {
    if (
      data.type !== CALL_TYPE.RING &&
      data.type !== CALL_TYPE.INTERCOM &&
      data.type !== CALL_TYPE.CONVERTED_SHOUT
    ) {
      // override or shout
      const matches = this.socketService
        .getPositions()
        .filter((p) =>
          data.type === CALL_TYPE.SHOUT
            ? data.to.includes(p.facility.id)
            : data.to.includes(p.facility.id) &&
              data.to.includes(p.sector) &&
              p.configurations.some((c: PositionConfiguration) =>
                c.layouts.some(
                  (l: ConfigurationLayout) =>
                    l.button.type === ButtonType[data.type] &&
                    l.button.target === client.position,
                ),
              ),
        );
      // const match = getConfig().positions.some((p) =>
      //   data.type === CALL_TYPE.SHOUT
      //     ? data.to.includes(p.facility)
      //     : data.to.includes(p.facility) &&
      //       data.to.includes(p.sector) &&
      //       p.configurations.some((c: PositionConfiguration) =>
      //         c.buttons.some(
      //           (b) =>
      //             b.type === ButtonType[data.type] &&
      //             b.target === client.data.position,
      //         ),
      //       ),
      // );
      if (!matches) {
        this.logger.error('no matching button for', data.to);
        return {
          result: 'error',
          message: `no matching button for ${data.to}`,
        };
      }
    }
    const target = this.io.sockets.adapter.rooms.get(data.to);
    if (!target) {
      this.logger.error('no one connected for', data.to);
      return { result: 'error', message: `no one connected for ${data.to}` };
    }

    const uuid = randomUUID();
    const landline = new Landline(
      uuid,
      client.id,
      data.type,
      data.to,
      client.data.position,
    );
    this.activeLandlines.push(landline);

    client.join(uuid);
    this.io.in(data.to).socketsJoin(uuid);
    this.io.to(data.to).emit('incoming-landline', {
      signal: data.signalData,
      from: client.data.position,
      name: client.data.username,
      type: data.type,
      room: uuid,
      target: data.to,
    });

    switch (data.type) {
      case CALL_TYPE.SHOUT: {
        this.logger.log(
          `${client.data.username} (${landline.from}) initiated a SHOUT to ${data.to}`,
        );
        this.io.to(data.to).emit('join-landline', uuid);
        break;
      }
      case CALL_TYPE.OVERRIDE: {
        this.logger.log(
          `${client.data.username} (${landline.from}) initiated a OVERRIDE to ${data.to}`,
        );
        this.io.to(data.to).emit('join-landline', uuid);
        break;
      }
      case CALL_TYPE.INTERCOM: {
        this.logger.log(
          `${client.data.username} initiated a INTERCOM to ${data.to}`,
        );
        break;
      }
      default: {
        // RING
        this.logger.log(
          `${client.data.username} initiated a RING to ${data.to}`,
        );
        break;
      }
    }
    return { result: 'success', message: uuid };
  }

  @SubscribeMessage('answer-landline')
  async answerLandline(
    @MessageBody('id') id: string,
    @ConnectedSocket() client: SocketWithAuth,
  ) {
    client.join(id);
    const targets = [...this.io.sockets.adapter.rooms.get(id)!.values()];
    this.logger.debug(targets);
    this.logger.log(client.id, 'answered landline', id);
    client.emit('join-room', {
      id,
      users: [...targets],
    });
    this.io
      .to(id)
      .except(client.id)
      .emit('active-landline', {
        id,
        type: this.activeLandlines.find((l) => l.id === id),
      });
  }

  @SubscribeMessage('terminate-landline')
  async terminateLandline(
    @MessageBody('id') id: string,
    @ConnectedSocket() client: SocketWithAuth,
  ) {
    const landline = this.activeLandlines.findIndex((l) => l.id === id);
    if (landline !== -1) {
      this.logger.debug('terminate');
      this.logger.debug(this.io.sockets.adapter.rooms.get(id));
      this.logger.debug('--');
      this.logger.debug(client.rooms);
      this.io.emit('terminate-landline', id);
      this.io.socketsLeave(id);
      delete this.activeLandlines[landline];
      this.logger.log(`${client.id} terminated call from ${id}`);
    }
  }

  @SubscribeMessage('deny-landline')
  async denyLandline(
    @MessageBody() data: LandlineData,
    @ConnectedSocket() client: SocketWithAuth,
  ) {
    // evacuate room
    const landline = this.activeLandlines.findIndex(
      (l) => l.id === data.caller,
    );
    if (landline !== -1) {
      client.to(data.caller).emit('denied-landline');
      this.io.socketsLeave(data.caller);
      delete this.activeLandlines[landline];
      this.logger.log(
        `${client.data.username} denied landline call from ${data.caller}`,
      );
    }
  }

  @SubscribeMessage('join-landline')
  async joinLandline(
    @MessageBody() data: { target: string; initial: boolean },
    @ConnectedSocket() client: SocketWithAuth,
  ) {
    const landline = this.activeLandlines.find(
      (l: Landline) => l.id === data.target,
    );
    if (landline) {
      this.logger.debug(landline.type);
      if (landline.type === CALL_TYPE.SHOUT && !data.initial) {
        this.logger.log(
          client.id,
          'is turning shout into landline',
          landline.id,
        );
        this.io.to(landline.target).emit('left-landline');
        landline.type = CALL_TYPE.CONVERTED_SHOUT;
        landline.participants = landline.participants.filter(
          (p) => p === landline.initiator,
        );
        this.io.to(landline.id).emit('unmute', client.id);
        return;
      }
      client.join(landline.id);
      this.logger.log(client.id, 'joined landline', landline.id);
      client.emit('joined-landline', {
        id: landline.id,
        type: landline.type,
        users: [...landline.participants],
        from: landline.initiator,
        fromSector: landline.from,
        target: landline.target,
      });
      landline.participants.push(client.id);
      this.io
        .to([landline.target, landline.from])
        .emit('landline-activated', landline);
    }
  }

  @SubscribeMessage('leave-landline')
  async leaveLandline(
    @MessageBody() target: string,
    @ConnectedSocket() client: SocketWithAuth,
  ) {
    const landline = this.activeLandlines.find(
      (l: Landline) => l.id === target,
    );
    if (landline) {
      this.logger.log(client.id, 'is leaving', landline.id);
      this.io.to(landline.id).emit('left-landline', {
        id: landline.id,
        who: client.id,
      });
      client.leave(landline.id);
      landline.participants = landline.participants.filter(
        (p) => p !== client.id,
      );
      if (
        landline.participants.length < 3 ||
        landline.initiator === client.id
      ) {
        this.logger.log(
          'auto terminating landline',
          landline.id,
          '.',
          landline.participants.length,
          landline.participants.length < 2,
          landline.initiator === client.id,
        );
        // Essentially an empty landline apart from the participant
        // or the initiator ends the landline
        this.io.to(landline.id).emit('terminate-landline', landline.id);
        this.io.socketsLeave(landline.id);
        this.activeLandlines.splice(
          this.activeLandlines.findIndex((l) => l.id === landline.id),
          1,
        );
      }
    } else {
      this.logger.error(
        client.id,
        "tried to leave a landline that doesn't exist",
        target,
      );
    }
  }

  @SubscribeMessage('convert-shout')
  async convertShout(
    @MessageBody('id') target: string,
    @ConnectedSocket() client: SocketWithAuth,
  ) {
    this.logger.log(
      `${client.id} (${client.data.position}) is leaving a converted shout landline. Converting back to SHOUT`,
    );

    const landline = this.activeLandlines.find((l) => l.id === target);
    if (landline) {
      client.leave(landline.id);
      landline.participants = landline.participants.filter(
        (p) => p !== client.id,
      );
      if (landline.participants.length < 3) {
        // Landline is converted back into a shout
        const targets = [
          ...this.io.sockets.adapter.rooms.get(landline.target)!.values(),
        ];
        landline.type = CALL_TYPE.SHOUT;

        this.io.to(landline.target).emit('joined-landline', {
          id: target,
          users: [...targets, client.id],
          type: landline.type,
          from: landline.initiator,
          fromSector: landline.from,
          target: landline.target,
        });
        landline.participants.push(...targets);
      }
    }
  }

  @SubscribeMessage('add-audio')
  async addAudio(
    @MessageBody('id') target: string,
    @ConnectedSocket() client: SocketWithAuth,
  ) {
    client.to(target).emit('unmute', client.id);
  }

  @SubscribeMessage('remove-audio')
  async removeAudio(
    @MessageBody('id') target: string,
    @ConnectedSocket() client: SocketWithAuth,
  ) {
    client.to(target).emit('mute', client.id);
  }

  @SubscribeMessage('init-signal')
  async InitWebRTC(
    @MessageBody() data: SignalData,
    @ConnectedSocket() client: SocketWithAuth,
  ) {
    this.logger.log(client.id, 'emits initial signal to peer', data.to);
    const landline = this.activeLandlines.find((l) => l.id === data.room);
    if (!landline) {
      this.logger.warn(
        `Got signal data for landline that doesn't exist`,
        data.room,
      );
      return;
    }
    this.io.to(data.to).emit('user-joined', {
      signal: data.signal,
      caller: client.id,
      room: data.room,
      withAudio: data.audio,
      type: landline.type,
    });
  }

  @SubscribeMessage('return-signal')
  async returnWebRTC(
    @MessageBody() data: SignalData,
    @ConnectedSocket() client: SocketWithAuth,
  ) {
    this.logger.log(client.id, 'returned signal to', data.to);
    this.io.to(data.to).emit('user-signal', {
      signal: data.signal,
      id: client.id,
    });
  }
}
