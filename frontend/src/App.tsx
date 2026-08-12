import { Routes, Route } from 'react-router-dom';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Layout } from './components/Layout';
import { RoleHomeRedirect } from './components/RoleHomeRedirect';
import { LoginPage } from './pages/LoginPage';
import { NotFoundPage, UnauthorizedPage } from './pages/NotFoundPage';
import { ProfilePage } from './pages/shared/ProfilePage';

import { TraineeDashboard } from './pages/trainee/TraineeDashboard';
import { ModulesBrowse } from './pages/trainee/ModulesBrowse';
import { ModuleDetail } from './pages/trainee/ModuleDetail';
import { AssignmentDetail } from './pages/trainee/AssignmentDetail';
import { SubmissionDetail } from './pages/trainee/SubmissionDetail';
import { ResultsPage } from './pages/trainee/ResultsPage';

import { TrainerDashboard } from './pages/trainer/TrainerDashboard';
import { GradingQueue } from './pages/trainer/GradingQueue';
import { SubmissionReview } from './pages/trainer/SubmissionReview';
import { TrainerModules } from './pages/trainer/TrainerModules';
import { TrainerModuleDetail } from './pages/trainer/TrainerModuleDetail';
import { TrainerResources } from './pages/trainer/TrainerResources';

import { ExamControllerDashboard } from './pages/examController/ExamControllerDashboard';
import { AssessmentApprovals } from './pages/examController/AssessmentApprovals';
import { CertificationQueue } from './pages/examController/CertificationQueue';
import { SyncConflictQueue } from './pages/examController/SyncConflictQueue';

import { AdminDashboard } from './pages/admin/AdminDashboard';
import { UserManagement } from './pages/admin/UserManagement';
import { TraineeRecords } from './pages/admin/TraineeRecords';
import { InstitutionsTrades } from './pages/admin/InstitutionsTrades';
import { ModulesClasses } from './pages/admin/ModulesClasses';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/unauthorized" element={<UnauthorizedPage />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<Layout />}>
          <Route index element={<RoleHomeRedirect />} />
          <Route path="profile" element={<ProfilePage />} />

          <Route element={<ProtectedRoute allowedRoles={['trainee']} />}>
            <Route path="trainee" element={<TraineeDashboard />} />
            <Route path="trainee/modules" element={<ModulesBrowse />} />
            <Route path="trainee/modules/:moduleId" element={<ModuleDetail />} />
            <Route path="trainee/assignments/:assignmentId" element={<AssignmentDetail />} />
            <Route path="trainee/submissions/:submissionId" element={<SubmissionDetail />} />
            <Route path="trainee/results" element={<ResultsPage />} />
          </Route>

          <Route element={<ProtectedRoute allowedRoles={['trainer']} />}>
            <Route path="trainer" element={<TrainerDashboard />} />
            <Route path="trainer/queue" element={<GradingQueue />} />
            <Route path="trainer/submissions/:submissionId" element={<SubmissionReview />} />
            <Route path="trainer/modules" element={<TrainerModules />} />
            <Route path="trainer/modules/:moduleId" element={<TrainerModuleDetail />} />
            <Route path="trainer/resources" element={<TrainerResources />} />
          </Route>

          <Route element={<ProtectedRoute allowedRoles={['exam_controller']} />}>
            <Route path="exam-controller" element={<ExamControllerDashboard />} />
            <Route path="exam-controller/assessments" element={<AssessmentApprovals />} />
            <Route path="exam-controller/certification" element={<CertificationQueue />} />
            <Route path="exam-controller/conflicts" element={<SyncConflictQueue />} />
          </Route>

          <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
            <Route path="admin" element={<AdminDashboard />} />
            <Route path="admin/users" element={<UserManagement />} />
            <Route path="admin/trainees" element={<TraineeRecords />} />
            <Route path="admin/institutions" element={<InstitutionsTrades />} />
            <Route path="admin/modules" element={<ModulesClasses />} />
          </Route>
        </Route>
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
