import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

// Thin wrapper around Passport's JWT strategy (see modules/auth/strategies/jwt.strategy.ts).
// architecture.md §4: access tokens are short-lived and validated on every request.
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
