import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './auth.controller';
import { AuthGuard } from './auth.guard';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { JwtStrategy } from './vatsim-jwt.strategy';
import { VatsimStrategy } from './vatsim-oauth.strategy';
import { VatsimSerializer } from './vatsim.serializer';

@Module({
  imports: [ConfigModule, PassportModule, JwtModule],
  providers: [
    AuthService,
    AuthGuard,
    VatsimStrategy,
    JwtStrategy,
    JwtAuthGuard,
    VatsimSerializer,
  ],
  controllers: [AuthController],
})
export class AuthModule {}
