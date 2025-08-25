import React from 'react';
import { ChevronRight, Lock } from 'lucide-react';
import { SimulationStep } from '../data/simulationSteps';

interface SidebarProps {
  steps: SimulationStep[];
  currentStep: number;
  onStepChange: (stepIndex: number) => void;
  isAuthenticated: boolean;
}

const Sidebar: React.FC<SidebarProps> = ({ steps, currentStep, onStepChange, isAuthenticated }) => {
  const canAccessStep = (stepIndex: number) => {
    if (stepIndex === 0) return true; // Introduction is always accessible
    return isAuthenticated && stepIndex <= currentStep + 1;
  };

  return (
    <div className="w-80 bg-white shadow-sm border-r border-gray-200 min-h-screen">
      <div className="p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">仿真步骤</h2>
        <div className="space-y-2">
          {steps.map((step, index) => {
            const isActive = index === currentStep;
            const isCompleted = index < currentStep;
            const isAccessible = canAccessStep(index);
            
            return (
              <div key={step.id} className="relative">
                <button
                  onClick={() => isAccessible && onStepChange(index)}
                  disabled={!isAccessible}
                  className={`w-full text-left p-3 rounded-lg transition-all duration-200 flex items-center justify-between group ${
                    isActive 
                      ? 'bg-blue-50 border-2 border-blue-200 text-blue-900' 
                      : isCompleted
                      ? 'bg-green-50 text-green-900 hover:bg-green-100'
                      : isAccessible
                      ? 'text-gray-700 hover:bg-gray-50'
                      : 'text-gray-400 cursor-not-allowed'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <div className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                      isActive
                        ? 'bg-blue-600 text-white'
                        : isCompleted
                        ? 'bg-green-600 text-white'
                        : isAccessible
                        ? 'bg-gray-200 text-gray-600'
                        : 'bg-gray-100 text-gray-400'
                    }`}>
                      {isCompleted ? '✓' : index + 1}
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <step.icon className="h-4 w-4" />
                        <span className="font-medium text-sm">{step.title}</span>
                      </div>
                      {step.subtitle && (
                        <p className="text-xs text-gray-500 mt-1">{step.subtitle}</p>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    {!isAccessible && <Lock className="h-4 w-4" />}
                    {isAccessible && (
                      <ChevronRight className={`h-4 w-4 transition-transform ${
                        isActive ? 'transform rotate-90' : 'group-hover:transform group-hover:translate-x-1'
                      }`} />
                    )}
                  </div>
                </button>

                {/* Sub-steps for Forecast Model Selection */}
                {step.id === 'forecast-model' && isActive && (
                  <div className="ml-8 mt-2 space-y-1">
                    {[
                      '移动平均',
                      '指数平滑', 
                      'ARIMA',
                      'LSTM',
                      '集成方法'
                    ].map((subStep, subIndex) => (
                      <div key={subIndex} className="text-sm text-gray-600 py-2 px-3 rounded bg-gray-50">
                        {subStep}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {!isAuthenticated && (
          <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <div className="flex items-center space-x-2">
              <Lock className="h-4 w-4 text-amber-600" />
              <span className="text-sm font-medium text-amber-800">需要身份验证</span>
            </div>
            <p className="text-xs text-amber-700 mt-1">
              请登录以访问仿真步骤
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Sidebar;