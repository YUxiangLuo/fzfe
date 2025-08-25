import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { SimulationStep } from '../data/simulationSteps';
import { User } from '../App';

// Import step components
import IntroductionStep from './steps/IntroductionStep';
import IndustrySelectionStep from './steps/IndustrySelectionStep';
import CompanySelectionStep from './steps/CompanySelectionStep';
import ProductSelectionStep from './steps/ProductSelectionStep';
import DataPreviewStep from './steps/DataPreviewStep';
import ForecastModelStep from './steps/ForecastModelStep';
import ResultEvaluationStep from './steps/ResultEvaluationStep';
import ProductionPlanningStep from './steps/ProductionPlanningStep';
import FinalReportStep from './steps/FinalReportStep';

interface MainContentProps {
  currentStep: number;
  steps: SimulationStep[];
  onStepChange: (stepIndex: number) => void;
  simulationData: any;
  onDataUpdate: (data: any) => void;
  user: User | null;
}

const MainContent: React.FC<MainContentProps> = ({
  currentStep,
  steps,
  onStepChange,
  simulationData,
  onDataUpdate,
  user
}) => {
  const currentStepData = steps[currentStep];
  const canGoBack = currentStep > 0;
  const canGoForward = currentStep < steps.length - 1;

  const renderStepContent = () => {
    const stepData = simulationData[currentStepData.id] || {};
    
    switch (currentStepData.id) {
      case 'introduction':
        return <IntroductionStep data={stepData} onUpdate={onDataUpdate} user={user} />;
      case 'industry-selection':
        return <IndustrySelectionStep data={stepData} onUpdate={onDataUpdate} />;
      case 'company-selection':
        return <CompanySelectionStep data={stepData} onUpdate={onDataUpdate} />;
      case 'product-selection':
        return <ProductSelectionStep data={stepData} onUpdate={onDataUpdate} />;
      case 'data-preview':
        return <DataPreviewStep data={stepData} onUpdate={onDataUpdate} />;
      case 'forecast-model':
        return <ForecastModelStep data={stepData} onUpdate={onDataUpdate} />;
      case 'result-evaluation':
        return <ResultEvaluationStep data={stepData} onUpdate={onDataUpdate} />;
      case 'production-planning':
        return <ProductionPlanningStep data={stepData} onUpdate={onDataUpdate} />;
      case 'final-report':
        return <FinalReportStep data={stepData} onUpdate={onDataUpdate} user={user} />;
      default:
        return <div>未找到步骤内容</div>;
    }
  };

  if (!user && currentStep > 0) {
    return (
      <div className="flex-1 p-8 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">🔒</div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">需要身份验证</h2>
          <p className="text-gray-600">请登录以访问仿真内容</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col">
      <div className="flex-1 p-8">
        <div className="max-w-4xl mx-auto">
          {/* Step Header */}
          <div className="mb-8">
            <div className="flex items-center space-x-2 text-sm text-gray-500 mb-2">
              <span>第 {currentStep + 1} 步，共 {steps.length} 步</span>
              <span>•</span>
              <span>{currentStepData.category}</span>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">{currentStepData.title}</h1>
            <p className="text-gray-600 text-lg">{currentStepData.description}</p>
          </div>

          {/* Progress Bar */}
          <div className="mb-8">
            <div className="flex justify-between text-xs text-gray-500 mb-2">
              <span>进度</span>
              <span>{Math.round(((currentStep + 1) / steps.length) * 100)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
              ></div>
            </div>
          </div>

          {/* Step Content */}
          <div className="mb-8">
            {renderStepContent()}
          </div>
        </div>
      </div>

      {/* Navigation Footer */}
      <div className="border-t border-gray-200 bg-white px-8 py-4">
        <div className="max-w-4xl mx-auto flex justify-between">
          <button
            onClick={() => onStepChange(currentStep - 1)}
            disabled={!canGoBack}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
              canGoBack
                ? 'text-gray-700 hover:bg-gray-100'
                : 'text-gray-400 cursor-not-allowed'
            }`}
          >
            <ChevronLeft className="h-4 w-4" />
            <span>上一步</span>
          </button>

          <button
            onClick={() => onStepChange(currentStep + 1)}
            disabled={!canGoForward || !user}
            className={`flex items-center space-x-2 px-6 py-2 rounded-lg transition-colors ${
              canGoForward && user
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            <span>下一步</span>
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default MainContent;