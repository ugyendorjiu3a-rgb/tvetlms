import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { RoleName } from '../constants/roles';

export interface AuthenticatedUser {
  userId: string;
  institutionId: string;
  roles: RoleName[];
  traineeId?: string; // present when the user has a trainee_profiles row (== userId, kept explicit for readability)
  trainerId?: string; // present when the user has a trainer_profiles row (== userId)
}

// Usage: @CurrentUser() user: AuthenticatedUser in a controller method — reads the JWT payload
// that JwtStrategy.validate() attached to the request, so feature code never re-parses tokens.
export const CurrentUser = createParamDecorator((_data: unknown, ctx: ExecutionContext): AuthenticatedUser => {
  const request = ctx.switchToHttp().getRequest();
  return request.user;
});
