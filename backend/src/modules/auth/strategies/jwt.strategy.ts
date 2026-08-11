import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AuthenticatedUser } from '../../../common/decorators/current-user.decorator';
import { RoleName } from '../../../common/constants/roles';

export interface AccessTokenPayload {
  sub: string; // userId
  institutionId: string;
  roles: RoleName[];
  traineeId?: string;
  trainerId?: string;
}

// Validates the short-lived access token on every protected request (architecture.md §4).
// Deliberately stateless — no DB hit per request — because both the Institution Edge Node and
// Central Cloud need to authenticate quickly, including on constrained hardware.
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get<string>('JWT_ACCESS_SECRET')!,
    });
  }

  validate(payload: AccessTokenPayload): AuthenticatedUser {
    return {
      userId: payload.sub,
      institutionId: payload.institutionId,
      roles: payload.roles,
      traineeId: payload.traineeId,
      trainerId: payload.trainerId,
    };
  }
}
