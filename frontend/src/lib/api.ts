import { apiClient } from './apiClient';
import type {
  AiSuggestion,
  Assessment,
  Assignment,
  Class,
  EradicationRequest,
  Institution,
  ModuleSummary,
  NotificationRecipient,
  Resource,
  Result,
  SafeUser,
  Submission,
  SyncConflict,
  TokenPair,
  Trade,
} from './types';

// Thin, typed wrapper around every backend endpoint (see backend/src/modules/**/*.controller.ts).
// One object per domain so call sites read as `api.submissions.submit(...)` etc.

export const authApi = {
  login: (loginId: string, password: string) =>
    apiClient.post<TokenPair>('/auth/login', { loginId, password }).then((r) => r.data),
};

export const usersApi = {
  me: () => apiClient.get<SafeUser>('/users/me').then((r) => r.data),
  updateMe: (data: { email?: string; contactNumber?: string; profilePhotoUrl?: string }) =>
    apiClient.patch('/users/me', data).then((r) => r.data),
  list: (institutionId?: string) =>
    apiClient.get<SafeUser[]>('/users', { params: { institutionId } }).then((r) => r.data),
  createTrainee: (data: {
    institutionId: string;
    loginId: string;
    email?: string;
    fullName: string;
    citizenshipId: string;
    contactNumber?: string;
    tradeId?: string;
    enrollmentDate: string;
    profilePhotoUrl?: string;
  }) => apiClient.post<{ user: SafeUser; tempPassword: string }>('/users/trainees', data).then((r) => r.data),
  createTrainer: (data: {
    institutionId: string;
    loginId: string;
    email?: string;
    fullName: string;
    staffId: string;
    specialization?: string;
    contactNumber?: string;
  }) => apiClient.post<{ user: SafeUser; tempPassword: string }>('/users/trainers', data).then((r) => r.data),
  createStaff: (data: { institutionId: string; loginId: string; email?: string; role: 'admin' | 'exam_controller' }) =>
    apiClient.post<{ user: SafeUser; tempPassword: string }>('/users/staff', data).then((r) => r.data),
  adminUpdateTrainee: (
    traineeId: string,
    data: Partial<{
      fullName: string;
      citizenshipId: string;
      contactNumber: string;
      profilePhotoUrl: string;
      tradeId: string;
      enrollmentDate: string;
      status: 'active' | 'completed' | 'withdrawn';
    }>,
  ) => apiClient.patch(`/users/trainees/${traineeId}`, data).then((r) => r.data),
  requestEradication: (traineeId: string, reason?: string) =>
    apiClient
      .post<EradicationRequest>(`/users/trainees/${traineeId}/eradicate/request`, { reason })
      .then((r) => r.data),
  confirmEradication: (requestId: string) =>
    apiClient.post(`/users/trainees/eradicate/${requestId}/confirm`).then((r) => r.data),
};

export const institutionsApi = {
  list: () => apiClient.get<Institution[]>('/institutions').then((r) => r.data),
  create: (data: { name: string; type: 'TTI' | 'IZC'; code: string; address?: string; contactNumber?: string }) =>
    apiClient.post<Institution>('/institutions', data).then((r) => r.data),
};

export const tradesApi = {
  list: () => apiClient.get<Trade[]>('/trades').then((r) => r.data),
  create: (data: { code: string; nameEn: string; nameDz?: string; descriptionEn?: string; descriptionDz?: string }) =>
    apiClient.post<Trade>('/trades', data).then((r) => r.data),
};

export const modulesApi = {
  list: (tradeId?: string) => apiClient.get<ModuleSummary[]>('/modules', { params: { tradeId } }).then((r) => r.data),
  get: (id: string) => apiClient.get<ModuleSummary>(`/modules/${id}`).then((r) => r.data),
  create: (data: {
    code: string;
    nameEn: string;
    nameDz?: string;
    ncsCode?: string;
    tradeId: string;
    durationWeeks: number;
    learningOutcome?: string;
    startDate: string;
    endDate: string;
    moduleTutorId?: string;
  }) => apiClient.post<ModuleSummary>('/modules', data).then((r) => r.data),
  enrollTrainee: (moduleId: string, traineeId: string) =>
    apiClient.post(`/modules/${moduleId}/trainees`, { traineeId }).then((r) => r.data),
  assignTrainer: (moduleId: string, trainerId: string, roleLabel?: 'tutor' | 'assistant') =>
    apiClient.post(`/modules/${moduleId}/trainers`, { trainerId, roleLabel }).then((r) => r.data),
};

export const classesApi = {
  list: (institutionId?: string) => apiClient.get<Class[]>('/classes', { params: { institutionId } }).then((r) => r.data),
  get: (id: string) => apiClient.get<Class>(`/classes/${id}`).then((r) => r.data),
  create: (data: { institutionId: string; tradeId: string; name: string; intakeYear: number; startDate: string; endDate?: string }) =>
    apiClient.post<Class>('/classes', data).then((r) => r.data),
  enroll: (classId: string, traineeId: string) =>
    apiClient.post(`/classes/${classId}/enrollments`, { traineeId }).then((r) => r.data),
};

export const assessmentsApi = {
  list: (moduleId?: string) => apiClient.get<Assessment[]>('/assessments', { params: { moduleId } }).then((r) => r.data),
  get: (id: string) => apiClient.get<Assessment>(`/assessments/${id}`).then((r) => r.data),
  create: (data: {
    moduleId: string;
    tier: string;
    subtype: string;
    title: string;
    maxScore: number;
    weightPercent?: number;
    scheduledDate?: string;
  }) => apiClient.post<Assessment>('/assessments', data).then((r) => r.data),
  approve: (id: string) => apiClient.patch<Assessment>(`/assessments/${id}/approve`).then((r) => r.data),
  getAssignment: (id: string) => apiClient.get<Assignment>(`/assignments/${id}`).then((r) => r.data),
  createAssignment: (data: { assessmentId: string; title: string; description?: string; allowedFileTypes: string[]; dueDate: string }) =>
    apiClient.post<Assignment>('/assignments', data).then((r) => r.data),
};

export const submissionsApi = {
  submit: (data: {
    id?: string;
    assignmentId: string;
    files: { filename: string; fileHash: string; fileUrl?: string; fileSizeBytes?: number }[];
  }) => apiClient.post<Submission>('/submissions', data).then((r) => r.data),
  mine: () => apiClient.get<Submission[]>('/submissions/mine').then((r) => r.data),
  queue: (status?: string) => apiClient.get<Submission[]>('/submissions/queue', { params: { status } }).then((r) => r.data),
  get: (id: string) => apiClient.get<Submission>(`/submissions/${id}`).then((r) => r.data),
  addComment: (id: string, data: { commentText?: string; voiceNoteUrl?: string; parentCommentId?: string }) =>
    apiClient.post(`/submissions/${id}/comments`, data).then((r) => r.data),
};

export const gradingApi = {
  autoGrade: (submissionId: string, data: { score: number; engineVersion: string; rawResult: Record<string, unknown> }) =>
    apiClient.post(`/submissions/${submissionId}/grade/auto`, data).then((r) => r.data),
  manualGrade: (submissionId: string, data: { score: number; expectedVersion?: number }) =>
    apiClient.patch(`/submissions/${submissionId}/grade/manual`, data).then((r) => r.data),
  review: (submissionId: string, data: { gradingStatus: 'reviewed' | 'disputed'; notes?: string }) =>
    apiClient.patch(`/submissions/${submissionId}/grade/review`, data).then((r) => r.data),
};

export const resultsApi = {
  compute: (traineeId: string, moduleId: string) =>
    apiClient.post<Result>('/results/compute', { traineeId, moduleId }).then((r) => r.data),
  pendingApproval: () => apiClient.get<Result[]>('/results/pending-approval').then((r) => r.data),
  mine: () => apiClient.get<Result[]>('/results/mine').then((r) => r.data),
  approve: (id: string) => apiClient.post<Result>(`/results/${id}/approve`).then((r) => r.data),
  dispute: (id: string, reason: string) => apiClient.post<Result>(`/results/${id}/dispute`, { reason }).then((r) => r.data),
};

export const resourcesApi = {
  search: (q?: string, moduleId?: string) => apiClient.get<Resource[]>('/resources', { params: { q, moduleId } }).then((r) => r.data),
  get: (id: string) => apiClient.get<Resource>(`/resources/${id}`).then((r) => r.data),
  download: (id: string) => apiClient.post<{ fileUrl: string; fileHash: string }>(`/resources/${id}/download`).then((r) => r.data),
  create: (data: {
    titleEn: string;
    titleDz?: string;
    moduleId?: string;
    ncsCode?: string;
    format: string;
    language?: string;
    fileUrl: string;
    fileHash: string;
    tags?: string[];
    permissionLevel?: string;
  }) => apiClient.post<Resource>('/resources', data).then((r) => r.data),
  review: (id: string, notes?: string) => apiClient.post(`/resources/${id}/review`, { notes }).then((r) => r.data),
};

export const notificationsApi = {
  list: (unreadOnly?: boolean) =>
    apiClient.get<NotificationRecipient[]>('/notifications', { params: { unreadOnly: unreadOnly ? 'true' : undefined } }).then((r) => r.data),
  markRead: (notificationId: string) => apiClient.patch(`/notifications/${notificationId}/read`).then((r) => r.data),
};

export const syncApi = {
  status: () => apiClient.get<{ devices: unknown[]; openConflicts: number }>('/sync/status').then((r) => r.data),
  conflicts: () => apiClient.get<SyncConflict[]>('/sync/conflicts').then((r) => r.data),
  resolveConflict: (id: string, resolution: 'keep_server' | 'keep_client', notes?: string) =>
    apiClient.patch<SyncConflict>(`/sync/conflicts/${id}/resolve`, { resolution, notes }).then((r) => r.data),
};

export const aiApi = {
  listPending: (traineeId?: string) => apiClient.get<AiSuggestion[]>('/ai/suggestions', { params: { traineeId } }).then((r) => r.data),
  decide: (id: string, decision: 'accepted' | 'rejected') =>
    apiClient.patch(`/ai/suggestions/${id}/decide`, { decision }).then((r) => r.data),
};
