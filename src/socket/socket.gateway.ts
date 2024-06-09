import { Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
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
import { randomUUID, UUID } from 'crypto';
import { Server } from 'socket.io';
import { VatsimDataService } from 'src/vatsim-data/vatsim-data.service';
import { SocketWithAuth } from '../socket-io-adapter';
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
  private sockets: SocketWithAuth[] = [];

  constructor(private readonly vatsimDataService: VatsimDataService) {}

  @WebSocketServer() io: Server;

  afterInit() {
    this.logger.log(`Websocket gateway initialized.`);
  }

  async handleConnection(client: SocketWithAuth) {
    this.logger.log(
      `new connection ${client.cid} signed in to ${client.sector} from ${client.id}. Network callsign ${client.callsign}`,
    );

    client.join([client.position.facility.facilityId, `${client.sector}`]);

    this.io.emit(
      'rooms',
      Array.from(this.io.sockets.adapter.rooms.keys()).filter(
        (s) => !s.includes(s) && s.length < 10,
      ),
    );

    this.sockets.push(client);

    client.on('disconnecting', () => {
      this.io.emit('disconnected', client.id);
      this.activeLandlines
        .filter((l) => l.initiator === client.id)
        .forEach((l) => {
          this.logger.log(`disconnect terminating ${l.id}`);
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
    this.logger.log(
      `${client.cid} on ${client.sector} has disconnected (${client.id})`,
    );
    if (this.sockets.findIndex((c) => client.id === c.id) !== -1) {
      this.sockets.splice(
        this.sockets.findIndex((c) => c.id === client.id),
        1,
      );
    }
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async checkConnections() {
    const data = this.vatsimDataService.getVatsimData();
    this.sockets.forEach((socket) => {
      const match = data.find(
        (c) =>
          Number(c.cid) === Number(socket.cid) &&
          c.callsign === socket.callsign,
      );
      if (match) {
        socket.lastUpdated = new Date(match.last_updated);
      } else if (Date.now() - socket.lastUpdated.getTime() > 2.5 * 60 * 1000) {
        this.logger.log(
          `${socket.cid} (${socket.id}) is no longer connected to the network. Dropping.`,
        );
        socket.disconnect();
      }
    });
  }

  @SubscribeMessage('initiate-landline')
  async initiateLandline(
    @MessageBody() data: InitiateLandlineData,
    @ConnectedSocket() client: SocketWithAuth,
  ) {
    if (data.to === client.sector || data.to === client.facility) {
      this.logger.warn(
        `${client.cid} (${client.id}) tried to call their own position (${data.to}) [${client.sector}]. Automatically rejecting landline.`,
      );
      return {
        result: 'error',
        message: `You cannot call your own position (${data.to}).`,
      };
    }

    const target = this.io.sockets.adapter.rooms.get(data.to);
    if (!target) {
      this.logger.warn(`no one connected for ${data.to}`);
      return { result: 'error', message: `No one connected for ${data.to}.` };
    }

    const uuid = randomUUID();
    const landline = new Landline(
      uuid,
      client.id,
      data.type,
      data.to,
      client.sector,
    );
    this.activeLandlines.push(landline);

    client.join(uuid);
    this.io.in(data.to).socketsJoin(uuid);
    this.io.to(data.to).emit('incoming-landline', {
      signal: data.signalData,
      from: client.sector,
      name: client.cid,
      type: data.type,
      room: uuid,
      target: data.to,
    });

    switch (data.type) {
      case CALL_TYPE.SHOUT: {
        this.logger.log(
          `${client.cid} (${landline.from}) initiated a SHOUT to ${data.to}`,
        );
        this.io.to(data.to).emit('join-landline', uuid);
        break;
      }
      case CALL_TYPE.OVERRIDE: {
        this.logger.log(
          `${client.cid} (${landline.from}) initiated a OVERRIDE to ${data.to}`,
        );
        this.io.to(data.to).emit('join-landline', uuid);
        break;
      }
      default: {
        // RING
        this.logger.log(`${client.cid} initiated a RING to ${data.to}`);
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
    this.logger.log(`${client.id} answered landline ${id}`);
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
      this.logger.log(`${client.cid} denied landline call from ${data.caller}`);
    }
  }

  @SubscribeMessage('join-landline')
  async joinLandline(
    @MessageBody() data: { target: UUID; initial: boolean },
    @ConnectedSocket() client: SocketWithAuth,
  ) {
    const landline = this.activeLandlines.find(
      (l: Landline) => l.id === data.target,
    );
    if (landline) {
      if (landline.type === CALL_TYPE.SHOUT && !data.initial) {
        this.logger.log(
          `${client.id} is turning shout into landline ${landline.id}`,
        );
        this.io.to(landline.target).emit('left-landline', {
          id: landline.id,
          who: client.id,
        });
        landline.type = CALL_TYPE.CONVERTED_SHOUT;
        landline.participants = landline.participants.filter(
          (p) => p === landline.initiator,
        );
        this.io.to(landline.id).emit('unmute', client.id);
        return;
      }
      client.join(landline.id);
      this.logger.log(`${client.id} joined landline: ${landline.id}`);
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
      this.logger.log(`${client.id} is leaving ${landline.id}`);
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
          `auto terminating landline ${landline.id}. Participants: ${landline.participants.length}, by initiator: ${landline.initiator === client.id}`,
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
        `${client.id} tried to leave a landline that doesn't exist ${target}`,
      );
    }
  }

  @SubscribeMessage('convert-shout')
  async convertShout(
    @MessageBody('id') target: string,
    @ConnectedSocket() client: SocketWithAuth,
  ) {
    this.logger.log(
      `${client.id} (${client.sector}) is leaving a converted shout landline. Converting back to SHOUT`,
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
    this.logger.log(`${client.id} emits initial signal to peer ${data.to}`);
    const landline = this.activeLandlines.find((l) => l.id === data.room);
    if (!landline) {
      this.logger.warn(
        `Got signal data for landline that doesn't exist ${data.room}`,
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
    this.logger.log(`${client.id} returned signal to ${data.to}`);
    this.io.to(data.to).emit('user-signal', {
      signal: data.signal,
      id: client.id,
    });
  }
}
