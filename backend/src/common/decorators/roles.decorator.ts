import { SetMetadata } from '@nestjs/common';
import { RoleName } from '../constants/roles';

export const ROLES_KEY = 'roles';

// Usage: @Roles(ROLE.ADMIN, ROLE.EXAM_CONTROLLER) on a controller method.
// Enforced by RolesGuard, which runs after JwtAuthGuard has attached req.user.
export const Roles = (...roles: RoleName[]) => SetMetadata(ROLES_KEY, roles);
