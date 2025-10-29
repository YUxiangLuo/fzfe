import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ExperimentProvider, useExperiment } from './contexts/ExperimentContext';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import IndustrySelection from './pages/IndustrySelection';
import CompanySelection from './pages/CompanySelection';
import ProductSelection from './pages/ProductSelection';
import HistoricalData from './pages/HistoricalData';
import ModelBuilding from './pages/ModelBuilding';
import ResultEvaluation from './pages/ResultEvaluation';
import ProductionPlan from './pages/ProductionPlan';
import Introduction from './pages/Introduction';
import Profile from './pages/Profile';
import ModelQuiz from './pages/ModelQuiz';
import PlanQuiz from './pages/PlanQuiz';
import ExperimentReport from './pages/ExperimentReport';

// A component to protect routes based on experiment step completion
const ProtectedRoute = ({ step, children }: { step: number, children: React.ReactElement }) => {
  const { isStepUnlocked } = useExperiment();
  if (!isStepUnlocked(step)) {
    // Redirect to the first step if the required step is not unlocked
    return <Navigate to="/industry" replace />;
  }
  return children;
};

// The main layout with Header and Sidebar
const MainLayout = () => {
  const { loading } = useExperiment();

  if (loading) {
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
        <Sidebar />
        <main className="flex-1 overflow-auto" style={{ height: 'calc(100vh - 5rem)' }}>
          <Routes>
            <Route path="/industry" element={<IndustrySelection />} />
            <Route path="/company" element={<ProtectedRoute step={2}><CompanySelection /></ProtectedRoute>} />
            <Route path="/product" element={<ProtectedRoute step={3}><ProductSelection /></ProtectedRoute>} />
            <Route path="/data" element={<ProtectedRoute step={4}><HistoricalData /></ProtectedRoute>} />
            <Route path="/model/*" element={<ProtectedRoute step={5}><ModelBuilding /></ProtectedRoute>} />
            <Route path="/evaluation" element={<ProtectedRoute step={6}><ResultEvaluation /></ProtectedRoute>} />
            <Route path="/production/*" element={<ProtectedRoute step={7}><ProductionPlan /></ProtectedRoute>} />
          </Routes>
        </main>
      </div>
    </div>
  );
};

function App() {
  return (
    <ExperimentProvider>
      <Router basename="/shiyan">
        <Routes>
          <Route path="/" element={<Navigate to="/introduction" replace />} />
          <Route path="/introduction" element={<Introduction />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/quiz" element={<ModelQuiz />} />
          <Route path="/quiz-plan" element={<PlanQuiz />} />
          <Route path="/report" element={<ExperimentReport />} />
          {/* All main experiment routes are now under the MainLayout */}
          <Route path="/*" element={<MainLayout />} />
        </Routes>
      </Router>
    </ExperimentProvider>
  );
}

export default App;
