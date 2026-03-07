import React, { lazy, Suspense } from 'react';
import { HashRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useExperiment } from './contexts/ExperimentContext.zustand';
import { ExperimentStoreProvider } from './contexts/ExperimentStoreProvider';
import { ConfirmProvider } from './shared/contexts/ConfirmContext';
import { ROUTES, getStepPath } from './constants/routes';
import { STEPS } from './constants/steps';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
const IndustrySelection = lazy(() => import('./pages/IndustrySelection'));
const CompanySelection = lazy(() => import('./pages/CompanySelection'));
const ProductSelection = lazy(() => import('./pages/ProductSelection'));
const HistoricalData = lazy(() => import('./pages/HistoricalData'));
const ModelBuilding = lazy(() => import('./pages/ModelBuilding'));
const ResultEvaluation = lazy(() => import('./pages/ResultEvaluation'));
const ProductionPlan = lazy(() => import('./pages/production/ProductionPlanPageV2'));
const Introduction = lazy(() => import('./pages/Introduction'));
const Profile = lazy(() => import('./pages/Profile'));
const ModelQuiz = lazy(() => import('./pages/ModelQuiz'));
const PlanQuiz = lazy(() => import('./pages/PlanQuiz'));
const ExperimentReport = lazy(() => import('./pages/ExperimentReport'));
const ReportStatusCheck = lazy(() => import('./pages/ReportStatusCheck'));

// A component to protect routes based on experiment step completion
const ProtectedRoute = ({ step, children }: { step: number, children: React.ReactElement }) => {
  const { isStepUnlocked } = useExperiment();
  if (!isStepUnlocked(step)) {
    // Redirect to the first step if the required step is not unlocked
    return <Navigate to="/industry" replace />;
  }
  return children;
};

const GuardedModelQuizRoute: React.FC = () => {
  const { ui, state, isStepUnlocked } = useExperiment();

  if (ui.loading) return <RouteLoading />;

  if (!isStepUnlocked(STEPS.PRODUCTION)) {
    return <Navigate to={getStepPath(state.current_step)} replace />;
  }

  return <ModelQuiz />;
};

const GuardedPlanQuizRoute: React.FC = () => {
  const { ui, state, isStepCompleted } = useExperiment();

  if (ui.loading) return <RouteLoading />;

  const canAccessPlanQuiz =
    isStepCompleted(STEPS.PRODUCTION) ||
    state.quiz_about_plan_completed ||
    state.current_step >= STEPS.RESULT ||
    state.status === 'Completed';

  if (!canAccessPlanQuiz) {
    return <Navigate to={getStepPath(state.current_step)} replace />;
  }

  return <PlanQuiz />;
};

const GuardedReportRoute: React.FC = () => {
  const { ui, state, isStepCompleted } = useExperiment();

  if (ui.loading) return <RouteLoading />;

  const canAccessReport =
    state.quiz_about_plan_completed ||
    state.current_step >= STEPS.RESULT ||
    state.status === 'Completed';

  if (!canAccessReport) {
    const fallback = isStepCompleted(STEPS.PRODUCTION)
      ? ROUTES.QUIZ_PLAN
      : getStepPath(state.current_step);
    return <Navigate to={fallback} replace />;
  }

  return <ExperimentReport />;
};

// The main layout with Header and Sidebar
const MainLayout = () => {
  const { ui } = useExperiment();
  const location = useLocation();

  // Hide sidebar on production plan page
  const hideSidebar = location.pathname.startsWith('/production');

  if (ui.loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-xl font-medium text-gray-600">正在加载实验数据...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="flex pt-20">
        {!hideSidebar && <Sidebar />}
        <main className="flex-1 overflow-auto" style={{ height: 'calc(100vh - 5rem)' }}>
          <Suspense fallback={<RouteLoading />}>
            <Routes>
              <Route path="/industry" element={<IndustrySelection />} />
              <Route path="/company" element={<ProtectedRoute step={2}><CompanySelection /></ProtectedRoute>} />
              <Route path="/product" element={<ProtectedRoute step={3}><ProductSelection /></ProtectedRoute>} />
              <Route path="/data" element={<ProtectedRoute step={4}><HistoricalData /></ProtectedRoute>} />
              <Route path="/model/*" element={<ProtectedRoute step={5}><ModelBuilding /></ProtectedRoute>} />
              <Route path="/evaluation" element={<ProtectedRoute step={6}><ResultEvaluation /></ProtectedRoute>} />
              <Route path="/production/*" element={<ProtectedRoute step={7}><ProductionPlan /></ProtectedRoute>} />
            </Routes>
          </Suspense>
        </main>
      </div>
    </div>
  );
};

import { ToastProvider } from './shared/contexts/ToastContext';

const RouteLoading: React.FC = () => (
  <div className="min-h-screen bg-gray-50 flex items-center justify-center">
    <div className="text-xl font-medium text-gray-600">页面加载中...</div>
  </div>
);

const stripTrailingSlash = (p: string) =>
  p.length > 1 && p.endsWith('/') ? p.slice(0, -1) : p;

const TrainingNavigationGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { ui } = useExperiment();
  const location = useLocation();

  React.useEffect(() => {
    if (!ui.isTrainingLocked) return;
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [ui.isTrainingLocked]);

  if (
    ui.isTrainingLocked &&
    ui.trainingLockPath &&
    stripTrailingSlash(location.pathname) !== stripTrailingSlash(ui.trainingLockPath)
  ) {
    return <Navigate to={ui.trainingLockPath} replace />;
  }

  return <>{children}</>;
};

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
