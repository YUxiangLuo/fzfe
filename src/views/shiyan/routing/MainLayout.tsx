import React, { lazy, Suspense } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { useExperiment } from '../contexts/ExperimentContext.zustand';
import { STEPS } from '../constants/steps';
import { hasCompletedAllSelectedEnsembleModels } from '../utils/ensembleProgress';
import { getProtectedRouteRedirectPath, shouldHideSidebar } from '../utils/routeGuards';
import Header from '../components/Header';
import Sidebar from '../components/Sidebar';

const IndustrySelection = lazy(() => import('../pages/IndustrySelection'));
const CompanySelection = lazy(() => import('../pages/CompanySelection'));
const ProductSelection = lazy(() => import('../pages/ProductSelection'));
const HistoricalData = lazy(() => import('../pages/HistoricalData'));
const ModelBuilding = lazy(() => import('../pages/ModelBuilding'));
const ResultEvaluation = lazy(() => import('../pages/ResultEvaluation'));
const ProductionPlan = lazy(() => import('../pages/production/ProductionPlanPageV2'));

const RouteLoading: React.FC = () => (
  <div className="min-h-screen bg-gray-50 flex items-center justify-center">
    <div className="text-xl font-medium text-gray-600">页面加载中...</div>
  </div>
);

const ProtectedRoute = ({ step, children }: { step: number; children: React.ReactElement }) => {
  const { isStepUnlocked } = useExperiment();
  const redirectPath = getProtectedRouteRedirectPath(step, isStepUnlocked);

  if (redirectPath) {
    return <Navigate to={redirectPath} replace />;
  }

  return children;
};

const GuardedEvaluationRoute: React.FC = () => {
  const { state, isStepUnlocked } = useExperiment();
  const redirectPath = getProtectedRouteRedirectPath(STEPS.EVALUATION, isStepUnlocked);

  if (redirectPath) {
    return <Navigate to={redirectPath} replace />;
  }

  if (!hasCompletedAllSelectedEnsembleModels(state)) {
    return <Navigate to="/model/ensemble-select" replace />;
  }

  return <ResultEvaluation />;
};

export const MainLayout: React.FC = () => {
  const { ui } = useExperiment();
  const location = useLocation();
  const hideSidebar = shouldHideSidebar(location.pathname);

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
              <Route path="/evaluation" element={<GuardedEvaluationRoute />} />
              <Route path="/production/*" element={<ProtectedRoute step={7}><ProductionPlan /></ProtectedRoute>} />
            </Routes>
          </Suspense>
        </main>
      </div>
    </div>
  );
};
