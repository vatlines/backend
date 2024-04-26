import { Injectable } from '@nestjs/common';
import { PassportSerializer } from '@nestjs/passport';
import { AuthService } from './auth.service';

@Injectable()
export class VatsimSerializer extends PassportSerializer {
  constructor(private readonly authService: AuthService) {
    super();
  }

  serializeUser(user: any, done: CallableFunction) {
    done(null, user);
  }

  deserializeUser(payload: any, done: CallableFunction) {
    done(null, payload);
  }
}
