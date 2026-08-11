// Matches the fixed 4-role set from database-design.md §1 (roles.name CHECK constraint)
// and PRD §4. Kept as a plain const object (not a TS enum) so it lines up with the
// CHECK-constraint-over-native-enum decision documented in the Prisma schema.
export const ROLE = {
  TRAINEE: 'trainee',
  TRAINER: 'trainer',
  ADMIN: 'admin',
  EXAM_CONTROLLER: 'exam_controller',
} as const;

export type RoleName = (typeof ROLE)[keyof typeof ROLE];

export const ALL_ROLES: RoleName[] = Object.values(ROLE);
