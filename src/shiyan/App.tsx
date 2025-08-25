import React, { useState } from "react";
import Header from "./components/Header";
import Sidebar from "./components/Sidebar";
import MainContent from "./components/MainContent";
import LoginModal from "./components/LoginModal";
import { simulationSteps } from "./data/simulationSteps";

export interface User {
  id: string;
  name: string;
  email: string;
  role: "student" | "teacher" | "admin";
}

function App() {
  const [currentStep, setCurrentStep] = useState(0);
  const [user, setUser] = useState<User | null>(null);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [simulationData, setSimulationData] = useState<any>({});

  const handleLogin = (userData: User) => {
    setUser(userData);
    setShowLoginModal(false);
  };

  const handleLogout = () => {
    setUser(null);
    setCurrentStep(0);
    setSimulationData({});
  };

  const updateSimulationData = (stepData: any) => {
    setSimulationData((prev) => ({
      ...prev,
      [simulationSteps[currentStep].id]: stepData,
    }));
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header
        user={user}
        onLogin={() => setShowLoginModal(true)}
        onLogout={handleLogout}
      />

      <div className="flex">
        <Sidebar
          steps={simulationSteps}
          currentStep={currentStep}
          onStepChange={setCurrentStep}
          isAuthenticated={!!user}
        />

        <MainContent
          currentStep={currentStep}
          steps={simulationSteps}
          onStepChange={setCurrentStep}
          simulationData={simulationData}
          onDataUpdate={updateSimulationData}
          user={user}
        />
      </div>

      {showLoginModal && (
        <LoginModal
          onClose={() => setShowLoginModal(false)}
          onLogin={handleLogin}
        />
      )}
    </div>
  );
}

export default App;
