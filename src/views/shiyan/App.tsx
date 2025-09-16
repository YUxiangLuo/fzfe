import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
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
import MovingAverageModel from './pages/models/MovingAverageModel';
import LSTMModel from './pages/models/LSTMModel';
import ARIMAModel from './pages/models/ARIMAModel';

export interface AppState {
  currentStep: number;
  completedSteps: number[];
  selectedIndustry: string | null;
  selectedCompany: string | null;
  selectedProduct: string | null;
}

function App() {
  const [appState, setAppState] = useState<AppState>({
    currentStep: 1,
    completedSteps: [],
    selectedIndustry: null,
    selectedCompany: null,
    selectedProduct: null,
  });

  const updateAppState = (updates: Partial<AppState>) => {
    setAppState(prev => ({ ...prev, ...updates }));
  };

  const completeStep = (step: number) => {
    setAppState(prev => ({
      ...prev,
      completedSteps: [...prev.completedSteps.filter(s => s !== step), step],
      currentStep: Math.min(step + 1, 7)
    }));
  };

  return (
    <Router basename="/shiyan">
      <Routes>
        <Route path="/" element={<Navigate to="/introduction" replace />} />
        <Route path="/introduction" element={<Introduction />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/*" element={
          <div className="min-h-screen bg-gray-50">
            <Header />
            <div className="flex pt-20">
              <Sidebar currentStep={appState.currentStep} completedSteps={appState.completedSteps} />
              <main className="flex-1 overflow-auto">
                <Routes>
                  <Route path="/industry" element={
                    <IndustrySelection 
                      appState={appState} 
                      updateAppState={updateAppState}
                      completeStep={completeStep}
                    />
                  } />
                  <Route path="/company" element={
                    appState.completedSteps.includes(1) ? (
                      <CompanySelection 
                        appState={appState} 
                        updateAppState={updateAppState}
                        completeStep={completeStep}
                      />
                    ) : <Navigate to="/industry" replace />
                  } />
                  <Route path="/product" element={
                    appState.completedSteps.includes(2) ? (
                      <ProductSelection 
                        appState={appState} 
                        updateAppState={updateAppState}
                        completeStep={completeStep}
                      />
                    ) : <Navigate to="/industry" replace />
                  } />
                  <Route path="/data" element={
                    appState.completedSteps.includes(3) ? (
                      <HistoricalData 
                        appState={appState} 
                        updateAppState={updateAppState}
                        completeStep={completeStep}
                      />
                    ) : <Navigate to="/industry" replace />
                  } />
                  <Route path="/model" element={
                    appState.completedSteps.includes(4) ? (
                      <ModelBuilding 
                        appState={appState} 
                        updateAppState={updateAppState}
                        completeStep={completeStep}
                      />
                    ) : <Navigate to="/industry" replace />
                  } />
                  <Route path="/model/*" element={
                    appState.completedSteps.includes(4) ? (
                      <ModelBuilding 
                        appState={appState} 
                        updateAppState={updateAppState}
                        completeStep={completeStep}
                      />
                    ) : <Navigate to="/industry" replace />
                  } />
                  <Route path="/evaluation" element={
                    appState.completedSteps.includes(4) ? (
                      <ResultEvaluation 
                        appState={appState} 
                        updateAppState={updateAppState}
                        completeStep={completeStep}
                      />
                    ) : <Navigate to="/industry" replace />
                  } />
                  <Route path="/production" element={
                    appState.completedSteps.includes(6) ? (
                      <ProductionPlan 
                        appState={appState} 
                        updateAppState={updateAppState}
                        completeStep={completeStep}
                      />
                    ) : <Navigate to="/industry" replace />
                  } />
                </Routes>
              </main>
            </div>
          </div>
        } />
      </Routes>
    </Router>
  );
}

export default App;