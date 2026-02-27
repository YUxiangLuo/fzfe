import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  Building, 
  Factory, 
  Package, 
  BarChart3, 
  Brain, 
  TrendingUp, 
  Calendar,
  Check,
  Lock
} from 'lucide-react';
import { useExperiment } from '../contexts/ExperimentContext.zustand';
import { TRAINING_LOCK_MESSAGE } from '../constants/routes';

const steps = [
  { id: 1, title: '选择行业', path: '/industry', icon: Building },
  { id: 2, title: '选择企业', path: '/company', icon: Factory },
  { id: 3, title: '选择产品', path: '/product', icon: Package },
  { id: 4, title: '历史数据', path: '/data', icon: BarChart3 },
  { id: 5, title: '需求预测', path: '/model', icon: Brain },
  { id: 6, title: '结果评估', path: '/evaluation', icon: TrendingUp },
  { id: 7, title: '生产计划', path: '/production', icon: Calendar },
];

const Sidebar: React.FC = () => {
  const location = useLocation();
  const { state, isStepCompleted, isStepUnlocked, isTrainingLocked } = useExperiment();
  const { current_step } = state;

  const getStepStatus = (stepId: number) => {
    if (isStepCompleted(stepId)) return 'completed';
    if (stepId === current_step) return 'current';
    if (isStepUnlocked(stepId)) return 'available';
    return 'locked';
  };

  const getStepStyles = (stepId: number) => {
    const status = getStepStatus(stepId);
    const stepPath = steps.find(s => s.id === stepId)?.path || '---';
    const isActive = location.pathname === stepPath || location.pathname.startsWith(stepPath + '/');

    switch (status) {
      case 'completed':
        return `bg-green-50 text-green-700 hover:bg-green-100 border border-green-200 ${isActive ? 'ring-2 ring-green-400' : ''}`;
      case 'current':
        return `bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 ${isActive ? 'ring-2 ring-blue-400' : ''}`;
      case 'available':
        return `bg-gray-50 text-gray-700 hover:bg-gray-100 border border-gray-200 ${isActive ? 'ring-2 ring-gray-300' : ''}`;
      default:
        return 'bg-gray-25 text-gray-400 cursor-not-allowed border border-gray-100';
    }
  };

  const getStepIcon = (step: typeof steps[0], status: string) => {
    const IconComponent = step.icon;
    
    if (status === 'completed') {
      return <Check className="w-5 h-5" />;
    } else if (status === 'locked') {
      return <Lock className="w-5 h-5" />;
    }
    
    return <IconComponent className="w-5 h-5" />;
  };
  
  const completedCount = state.highest_completed_step;

  return (
    <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
      <nav className="flex-1 p-6 pt-8">
        <div className="space-y-4">
          <div className="text-gray-500 text-sm font-medium uppercase tracking-wider">
            实验步骤
          </div>
          
          <div className="space-y-2">
            {steps.map((step) => {
              const status = getStepStatus(step.id);
              const isLocked = !isStepUnlocked(step.id) || isTrainingLocked;
              
              const content = (
                <div className={`w-full flex items-center space-x-3 p-3 rounded-lg transition-all ${getStepStyles(step.id)}`}>
                  <div className="flex-shrink-0">
                    {getStepIcon(step, status)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-medium opacity-60">
                        步骤 {step.id}
                      </span>
                    </div>
                    <p className="font-medium truncate">{step.title}</p>
                  </div>
                  <div className="flex-shrink-0">
                    {status === 'completed' && (
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    )}
                    {status === 'current' && (
                      <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                    )}
                  </div>
                </div>
              );

              return (
                <div
                  key={step.id}
                  title={isTrainingLocked ? TRAINING_LOCK_MESSAGE : undefined}
                  className={isTrainingLocked ? 'opacity-70 cursor-not-allowed' : ''}
                >
                  {isLocked ? (
                    content
                  ) : (
                    <Link to={step.path}>
                      {content}
                    </Link>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="mt-8 pt-8 border-t border-gray-200">
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">进度</span>
              <span className="text-sm font-medium text-gray-900">{completedCount}/7</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-gradient-to-r from-blue-400 to-blue-600 h-2 rounded-full transition-all duration-500"
                style={{ width: `${(completedCount / 7) * 100}%` }}
              ></div>
            </div>
          </div>
        </div>
      </nav>
    </div>
  );
};

export default Sidebar;
