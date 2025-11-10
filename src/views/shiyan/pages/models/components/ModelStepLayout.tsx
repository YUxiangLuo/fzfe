import React from 'react';
import { ChevronLeft, ChevronRight, RotateCcw, Loader2 } from 'lucide-react';

interface Step {
  id: string;
  name: string;
}

interface ModelStepLayoutProps {
  title: string;
  steps: Step[];
  currentStepId: string;
  onNext: () => void;
  onPrevious: () => void;
  isNextDisabled?: boolean;
  isPreviousDisabled?: boolean;
  children: React.ReactNode;
  nextButtonText?: string;
  onReset?: () => void;
  isResetting?: boolean;
}

const ModelStepLayout: React.FC<ModelStepLayoutProps> = ({
  title,
  steps,
  currentStepId,
  onNext,
  onPrevious,
  isNextDisabled = false,
  isPreviousDisabled = false,
  children,
  nextButtonText = '下一步',
  onReset,
  isResetting = false,
}) => {
  const currentStepIndex = steps.findIndex(step => step.id === currentStepId);

  return (
    <div className="h-full flex flex-col bg-white rounded-xl shadow-sm border border-gray-200">
      {/* Header with Title and Progress Bar */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-800">{title}</h2>
          {onReset && (
            <button
              onClick={onReset}
              disabled={isResetting}
              className="flex items-center gap-2 px-3 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              title="重置模型"
            >
              {isResetting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <RotateCcw className="w-4 h-4" />
              )}
              重置
            </button>
          )}
        </div>
        <div className="flex items-center justify-between">
          {steps.map((step, index) => {
            const isActive = index === currentStepIndex;
            const isCompleted = index < currentStepIndex;

            return (
              <React.Fragment key={step.id}>
                <div className="flex items-center gap-2">
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold ${
                      isActive
                        ? 'bg-blue-600 text-white'
                        : isCompleted
                        ? 'bg-green-500 text-white'
                        : 'bg-gray-200 text-gray-500'
                    }`}
                  >
                    {index + 1}
                  </div>
                  <span
                    className={`font-medium ${
                      isActive
                        ? 'text-blue-600'
                        : isCompleted
                        ? 'text-gray-700'
                        : 'text-gray-400'
                    }`}
                  >
                    {step.name}
                  </span>
                </div>
                {index < steps.length - 1 && (
                  <div className="flex-1 h-px bg-gray-200 mx-4"></div>
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 p-6 overflow-y-auto">
        {children}
      </div>

      {/* Footer Navigation */}
      <div className="p-4 bg-gray-50 border-t border-gray-200 rounded-b-xl">
        <div className="flex justify-between items-center">
          <button
            onClick={onPrevious}
            disabled={isPreviousDisabled}
            className="flex items-center gap-2 px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors font-medium disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="w-5 h-5" />
            上一步
          </button>

          <button
            onClick={onNext}
            disabled={isNextDisabled}
            className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            {nextButtonText}
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ModelStepLayout;
