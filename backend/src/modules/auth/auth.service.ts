import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as argon2 from 'argon2';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { RoleName } from '../../common/constants/roles';
import { AccessTokenPayload } from './strategies/jwt.strategy';

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: string;
}

// architecture.md §4: credentials hashed with argon2id, short-lived access token + longer-lived
// refresh token, every login attempt audit-logged. This service intentionally has no
// "register"/"sign up" method — accounts are Admin-provisioned only (see modules/users), matching
// PRD §5.1 (no self-registration).
@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly audit: AuditService,
  ) {}

  async login(loginId: string, password: string, ipAddress?: string): Promise<TokenPair> {
    const user = await this.prisma.user.findUnique({
      where: { loginId },
      include: {
        userRoles: { include: { role: true } },
        traineeProfile: { select: { userId: true } },
        trainerProfile: { select: { userId: true } },
      },
    });

    const passwordValid = user ? await argon2.verify(user.passwordHash, password).catch(() => false) : false;

    if (!user || !passwordValid) {
      await this.audit.log({
        action: 'login.failure',
        entityType: 'user',
        entityId: user?.id ?? null,
        ipAddress,
        afterValue: { attemptedLoginId: loginId },
      });
      throw new UnauthorizedException('Invalid login ID or password');
    }

    if (user.status !== 'active') {
      await this.audit.log({
        actorId: user.id,
        action: 'login.failure',
        entityType: 'user',
        entityId: user.id,
        ipAddress,
        afterValue: { reason: `account status is '${user.status}'` },
      });
      throw new UnauthorizedException('This account is not active. Contact your Admin.');
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    await this.audit.log({
      actorId: user.id,
      action: 'login.success',
      entityType: 'user',
      entityId: user.id,
      institutionId: user.institutionId,
      ipAddress,
    });

    const roles = user.userRoles.map((ur) => ur.role.name as RoleName);
    return this.issueTokenPair({
      sub: user.id,
      institutionId: user.institutionId,
      roles,
      traineeId: user.traineeProfile?.userId,
      trainerId: user.trainerProfile?.userId,
    });
  }

  async refresh(refreshToken: string): Promise<TokenPair> {
    let payload: AccessTokenPayload;
    try {
      payload = await this.jwt.verifyAsync<AccessTokenPayload>(refreshToken, {
        secret: this.config.get<string>('JWT_REFRESH_SECRET'),
      });
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      include: {
        userRoles: { include: { role: true } },
        traineeProfile: { select: { userId: true } },
        trainerProfile: { select: { userId: true } },
      },
    });

    if (!user || user.status !== 'active') {
      throw new UnauthorizedException('Account no longer active');
    }

    const roles = user.userRoles.map((ur) => ur.role.name as RoleName);
    return this.issueTokenPair({
      sub: user.id,
      institutionId: user.institutionId,
      roles,
      traineeId: user.traineeProfile?.userId,
      trainerId: user.trainerProfile?.userId,
    });
  }

  private async issueTokenPair(payload: AccessTokenPayload): Promise<TokenPair> {
    const accessTtl = this.config.get<string>('JWT_ACCESS_TTL', '15m');
    const refreshTtl = this.config.get<string>('JWT_REFRESH_TTL', '30d');

    const [accessToken, refreshToken] = await Promise.all([
      this.jwt.signAsync(payload, {
        secret: this.config.get<string>('JWT_ACCESS_SECRET'),
        expiresIn: accessTtl,
      }),
      this.jwt.signAsync(payload, {
        secret: this.config.get<string>('JWT_REFRESH_SECRET'),
        expiresIn: refreshTtl,
      }),
    ]);

    return { accessToken, refreshToken, expiresIn: accessTtl };
  }

  static async hashPassword(plain: string): Promise<string> {
    return argon2.hash(plain, { type: argon2.argon2id });
  }
}
