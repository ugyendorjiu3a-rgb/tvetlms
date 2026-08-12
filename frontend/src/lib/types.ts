// Types mirroring the backend's actual response shapes (see backend/src/modules/**).
// Kept intentionally loose (optional fields, `unknown` for opaque JSON) rather than
// regenerated from Prisma, since the frontend only needs to read what each endpoint returns.

export type RoleName = 'trainee' | 'trainer' | 'admin' | 'exam_controller';

export interface AccessTokenPayload {
  sub: string;
  institutionId: string;
  roles: RoleName[];
  traineeId?: string;
  trainerId?: string;
  exp: number;
  iat: number;
}

export interface CurrentUser {
  userId: string;
  institutionId: string;
  roles: RoleName[];
  traineeId?: string;
  trainerId?: string;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: string;
}

export interface ApiErrorBody {
  statusCode: number;
  message: string | string[];
  timestamp: string;
}

export interface Institution {
  id: string;
  name: string;
  type: 'TTI' | 'IZC';
  code: string;
  address?: string | null;
  contactNumber?: string | null;
  isActive: boolean;
}

export interface Trade {
  id: string;
  code: string;
  nameEn: string;
  nameDz?: string | null;
  descriptionEn?: string | null;
  descriptionDz?: string | null;
}

export interface TraineeProfile {
  userId: string;
  fullName: string;
  citizenshipId: string;
  profilePhotoUrl?: string | null;
  contactNumber?: string | null;
  tradeId?: string | null;
  enrollmentDate: string;
  status: 'active' | 'completed' | 'eradicated' | 'withdrawn';
}

export interface TrainerProfile {
  userId: string;
  fullName: string;
  staffId: string;
  specialization?: string | null;
  contactNumber?: string | null;
}

export interface UserRoleLink {
  roleId: string;
  role?: { name: RoleName };
}

export interface SafeUser {
  id: string;
  institutionId: string;
  loginId: string;
  email?: string | null;
  status: 'active' | 'suspended' | 'deactivated';
  localePreference: string;
  lastLoginAt?: string | null;
  userRoles?: UserRoleLink[];
  traineeProfile?: TraineeProfile | null;
  trainerProfile?: TrainerProfile | null;
  institution?: Institution;
}

export interface ModuleSummary {
  id: string;
  code: string;
  nameEn: string;
  nameDz?: string | null;
  ncsCode?: string | null;
  tradeId: string;
  durationWeeks: number;
  learningOutcome?: string | null;
  startDate: string;
  endDate: string;
  moduleTutorId?: string | null;
  trade?: Trade;
  moduleTutor?: TrainerProfile | null;
  moduleTrainees?: { moduleId: string; traineeId: string; status: string }[];
  moduleTrainers?: { moduleId: string; trainerId: string; roleLabel: string }[];
}

export type AssessmentTier = 'formative' | 'diagnostic' | 'summative';
export type AssessmentSubtype =
  | 'continuous_assessment'
  | 'project_based'
  | 'class_test'
  | 'problem_based'
  | 'module_assessment'
  | 'institutional_assessment';
export type AssessmentStatus = 'draft' | 'scheduled' | 'approved' | 'completed' | 'cancelled';

export interface Assessment {
  id: string;
  moduleId: string;
  tier: AssessmentTier;
  subtype: AssessmentSubtype;
  title: string;
  maxScore: number;
  weightPercent?: number | null;
  scheduledDate?: string | null;
  status: AssessmentStatus;
  createdBy: string;
  approvedBy?: string | null;
  approvedAt?: string | null;
  module?: ModuleSummary;
  assignments?: Assignment[];
}

export interface Assignment {
  id: string;
  assessmentId: string;
  title: string;
  description?: string | null;
  allowedFileTypes: string[];
  dueDate: string;
  createdBy: string;
  assessment?: Assessment;
}

export type SubmissionStatus = 'draft' | 'queued' | 'submitted' | 'late' | 'graded';

export interface SubmissionFile {
  id: string;
  submissionId: string;
  filename: string;
  fileUrl?: string | null;
  fileHash: string;
  fileSizeBytes?: number | null;
}

export type GradingStatus = 'pending' | 'auto_graded' | 'manually_graded' | 'reviewed' | 'disputed';

export interface Grade {
  id: string;
  submissionId: string;
  graderId?: string | null;
  score: number;
  isAutoGraded: boolean;
  gradingStatus: GradingStatus;
  gradedAt?: string | null;
  version: number;
  autoGradeLog?: { rawResult: unknown } | null;
}

export interface FeedbackComment {
  id: string;
  submissionId: string;
  parentCommentId?: string | null;
  authorId: string;
  commentText?: string | null;
  voiceNoteUrl?: string | null;
  readStatus: boolean;
  createdAt: string;
}

export interface Submission {
  id: string;
  assignmentId: string;
  traineeId: string;
  submittedAt?: string | null;
  status: SubmissionStatus;
  files: SubmissionFile[];
  grade?: Grade | null;
  comments?: FeedbackComment[];
  assignment?: Assignment;
  trainee?: TraineeProfile;
}

export type ResultOutcome = 'certified' | 'repeat_module';
export type ResultStatus = 'pending_approval' | 'approved' | 'disputed';

export interface Certificate {
  id: string;
  resultId: string;
  certificateNumber: string;
  status: 'draft' | 'approved' | 'revoked';
  issuedAt?: string | null;
}

export interface Result {
  id: string;
  traineeId: string;
  moduleId: string;
  totalScore: number;
  mark: 'A' | 'B' | 'C' | 'D' | 'E';
  gpa: number;
  performanceDescription: string;
  outcome: ResultOutcome;
  status: ResultStatus;
  computedAt: string;
  module?: ModuleSummary;
  trainee?: TraineeProfile;
  certificate?: Certificate | null;
}

export interface Resource {
  id: string;
  titleEn: string;
  titleDz?: string | null;
  moduleId?: string | null;
  ncsCode?: string | null;
  format: string;
  language: 'en' | 'dz' | 'both';
  fileUrl: string;
  fileHash: string;
  dateAdded: string;
  lastReviewedDate?: string | null;
  uploadedBy: string;
  permissionLevel: 'public' | 'institution' | 'module_only' | 'trainer_only';
  tags: string[];
}

export type NotificationType =
  | 'submission_deadline'
  | 'grading_complete'
  | 'new_resource'
  | 'result_declaration'
  | 'assessment_schedule'
  | 'general';

export interface NotificationRecipient {
  notificationId: string;
  userId: string;
  deliveredAt?: string | null;
  readAt?: string | null;
  notification: {
    id: string;
    type: NotificationType;
    title: string;
    body?: string | null;
    relatedEntityType?: string | null;
    relatedEntityId?: string | null;
    priority: 'normal' | 'high' | 'critical';
    createdAt: string;
  };
}

export interface SyncConflict {
  id: string;
  syncQueueId: string;
  entityType: string;
  entityId: string;
  serverVersionSnapshot: unknown;
  clientVersionSnapshot: unknown;
  status: 'open' | 'resolved';
  resolvedBy?: string | null;
  resolvedAt?: string | null;
  resolutionNotes?: string | null;
  createdAt: string;
}

export interface AiSuggestion {
  id: string;
  traineeId?: string | null;
  recommendationType: 'personalization' | 'at_risk_flag' | 'intervention_suggestion' | 'content_adaptation';
  inputDataRef?: unknown;
  suggestion: unknown;
  modelVersion: string;
  generatedAt: string;
  status: 'pending' | 'accepted' | 'rejected';
}

export interface Class {
  id: string;
  institutionId: string;
  tradeId: string;
  name: string;
  intakeYear: number;
  startDate: string;
  endDate?: string | null;
  trade?: Trade;
  enrollments?: { classId: string; traineeId: string; status: string; trainee?: TraineeProfile }[];
}

export interface EradicationRequest {
  id: string;
  traineeId: string;
  requestedBy: string;
  requestedAt: string;
  reason?: string | null;
  status: 'pending_confirmation' | 'confirmed' | 'cancelled';
}
