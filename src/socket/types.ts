import { UUID } from 'crypto';

export enum CALL_TYPE {
  SHOUT = 'SHOUT',
  OVERRIDE = 'OVERRIDE',
  RING = 'RING',
  CONVERTED_SHOUT = 'CONVERTED_SHOUT',
}

export interface LandlineData {
  caller: string;
}

export interface InitiateLandlineData {
  to: string;
  signalData: unknown;
  type: CALL_TYPE;
}

export interface SignalData {
  to: string;
  room: string;
  signal: unknown;
  audio: boolean;
}

export class Landline {
  type: CALL_TYPE;
  id: UUID;
  initiator: string; // socket.id
  participants: string[]; //socket.id[]
  target: string;
  from: string;

  constructor(
    uuid: UUID,
    initiator: string,
    type: CALL_TYPE,
    target: string,
    from: string,
  ) {
    this.id = uuid;
    this.initiator = initiator;
    this.participants = [from, initiator];
    this.type = type;
    this.target = target;
    this.from = from;
  }
}
