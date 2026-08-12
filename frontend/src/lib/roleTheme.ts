import type { RoleName } from './types';

// ui-ux-flow.md §0.4 color/theme separation.
export const ROLE_THEME: Record<RoleName, { label: string; color: string; bg: string; text: string; ring: string }> = {
  trainee: { label: 'Trainee', color: 'trainee', bg: 'bg-trainee', text: 'text-trainee', ring: 'ring-trainee' },
  trainer: { label: 'Trainer', color: 'trainer', bg: 'bg-trainer', text: 'text-trainer', ring: 'ring-trainer' },
  exam_controller: { label: 'Exam Controller', color: 'examctrl', bg: 'bg-examctrl', text: 'text-examctrl', ring: 'ring-examctrl' },
  admin: { label: 'Admin', color: 'admin', bg: 'bg-admin', text: 'text-admin', ring: 'ring-admin' },
};

export const ROLE_HOME: Record<RoleName, string> = {
  trainee: '/trainee',
  trainer: '/trainer',
  exam_controller: '/exam-controller',
  admin: '/admin',
};
