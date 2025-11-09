import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Header from '@/shared/components/common/TeacherLayout/Header';
import Sidebar from '@/shared/components/Layout/Sidebar';
import { ErrorBoundaryWrapper } from '@/shared/components/common/ErrorBoundary';
import { getLogoutRedirectPath } from './constants/routes';
import { RoleProvider, useRole } from '@/shared/contexts/RoleContext';
import { getRoleById } from '@/config/roles';

// Import all the page components
import PersonalInfo from '@/shared/components/Account/PersonalInfo';
import AssistantManagement from './components/Account/AssistantManagement';
import ClassManagement from '@/shared/components/Class/ClassManagement';
import StudentManagement from '@/shared/components/Student/StudentManagement';
import ExperimentProgress from '@/shared/components/Experiment/ExperimentProgress';
import ExperimentReports from '@/shared/components/Experiment/ExperimentReports';
import ExperimentLogs from '@/shared/components/Experiment/ExperimentLogs';
import QuestionBank from '@/shared/components/Assessment/QuestionBank';
import GradeWeights from '@/shared/components/Assessment/GradeWeights';
import GradesOverview from '@/shared/components/Assessment/GradesOverview';

function AppContent() {
  const { setRole } = useRole();

  useEffect(() => {
    const storedRole = localStorage.getItem('userRole');
    if (storedRole) {
      const roleObject = getRoleById(storedRole);
      if (roleObject) {
        setRole(roleObject);
      }
    }
  }, [setRole]);

  return (
    <ErrorBoundaryWrapper>
      <div className="min-h-screen bg-gray-50">
        <Header getLogoutRedirectPath={getLogoutRedirectPath} />
        <div className="flex pt-16">
          <Sidebar />
          <main className="flex-1 overflow-auto bg-gray-50" style={{ height: 'calc(100vh - 5rem)' }}>
            <div className="p-6">
              <Routes>
                <Route path="/" element={<Navigate to="/experiment-progress" replace />} />
                <Route path="/account-personal" element={<PersonalInfo />} />
                <Route path="/account-assistant" element={<AssistantManagement />} />
                <Route path="/class-management" element={<ClassManagement />} />
                <Route path="/student-management" element={<StudentManagement />} />
                <Route path="/experiment-progress" element={<ExperimentProgress />} />
                <Route path="/experiment-reports" element={<ExperimentReports />} />
                <Route path="/experiment-logs" element={<ExperimentLogs />} />
                <Route path="/assessment-questions" element={<QuestionBank />} />
                <Route path="/assessment-weights" element={<GradeWeights />} />
                <Route path="/assessment-grades" element={<GradesOverview />} />
              </Routes>
            </div>
          </main>
        </div>
      </div>
    </ErrorBoundaryWrapper>
  );
}

function App() {
  return (
    <RoleProvider>
      <BrowserRouter basename="/teacher">
        <AppContent />
      </BrowserRouter>
    </RoleProvider>
  );
}

export default App;