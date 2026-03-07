import React, { lazy, Suspense } from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useExperiment } from './contexts/ExperimentContext.zustand';
import { ExperimentStoreProvider } from './contexts/ExperimentStoreProvider';
import { ConfirmProvider } from './shared/contexts/ConfirmContext';
import { ROUTES, getStepPath } from './constants/routes';
import { STEPS } from './constants/steps';
import {
  canAccessModelQuiz,
  canAccessPlanQuiz,
  canAccessReport,
  getModelQuizFallbackPath,
  getPlanQuizFallbackPath,
  getReportFallbackPath,
} from './utils/routeGuards';
import { TrainingNavigationGuard } from './routing/TrainingNavigationGuard';
import { MainLayout } from './routing/MainLayout';
const Introduction = lazy(() => import('./pages/Introduction'));
const Profile = lazy(() => import('./pages/Profile'));
const ModelQuiz = lazy(() => import('./pages/ModelQuiz'));
const PlanQuiz = lazy(() => import('./pages/PlanQuiz'));
const ExperimentReport = lazy(() => import('./pages/ExperimentReport'));
const ReportStatusCheck = lazy(() => import('./pages/ReportStatusCheck'));

const GuardedModelQuizRoute: React.FC = () => {
  const { ui, state, isStepUnlocked } = useExperiment();

  if (ui.loading) return <RouteLoading />;

  if (!canAccessModelQuiz(isStepUnlocked)) {
    return <Navigate to={getModelQuizFallbackPath(state)} replace />;
  }

  return <ModelQuiz />;
};

const GuardedPlanQuizRoute: React.FC = () => {
  const { ui, state, isStepCompleted } = useExperiment();

  if (ui.loading) return <RouteLoading />;

  if (!canAccessPlanQuiz(state, isStepCompleted)) {
    return <Navigate to={getPlanQuizFallbackPath(state)} replace />;
  }

  return <PlanQuiz />;
};

const GuardedReportRoute: React.FC = () => {
  const { ui, state, isStepCompleted } = useExperiment();

  if (ui.loading) return <RouteLoading />;

  if (!canAccessReport(state)) {
    return <Navigate to={getReportFallbackPath(state, isStepCompleted)} replace />;
  }

  return <ExperimentReport />;
};

import { ToastProvider } from './shared/contexts/ToastContext';

const RouteLoading: React.FC = () => (
  <div className="min-h-screen bg-gray-50 flex items-center justify-center">
    <div className="text-xl font-medium text-gray-600">页面加载中...</div>
  </div>
);

function App() {
  return (
    <ConfirmProvider>
      <ToastProvider>
        <ExperimentStoreProvider>
          <Router>
            <TrainingNavigationGuard>
              <Suspense fallback={<RouteLoading />}>
                <Routes>
                  <Route path="/" element={<ReportStatusCheck />} />
                  <Route path="/introduction" element={<Introduction />} />
                  <Route path="/profile" element={<Profile />} />
                  <Route path="/quiz" element={<GuardedModelQuizRoute />} />
                  <Route path="/quiz-plan" element={<GuardedPlanQuizRoute />} />
                  <Route path="/report" element={<GuardedReportRoute />} />
                  {/* All main experiment routes are now under the MainLayout */}
                  <Route path="/*" element={<MainLayout />} />
                </Routes>
              </Suspense>
            </TrainingNavigationGuard>
          </Router>
        </ExperimentStoreProvider>
      </ToastProvider>
    </ConfirmProvider>
  );
}

export default App;
