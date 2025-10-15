import React, { useEffect, useRef } from 'react';
import { Routes, Route, Link, useLocation, useNavigate } from 'react-router-dom';
import { useExperiment } from '../contexts/ExperimentContext';
import { CheckCircle, ArrowRight, Calculator, Target, TrendingUp, Package, FileText, BarChart3 } from 'lucide-react';
import PlanIntro from './production/PlanIntro';
import Overview from './production/Overview';
import Variables from './production/Variables';
import ServiceLevel from './production/ServiceLevel';
import Forecast from './production/Forecast';
import Input from './production/Input';
import FinalPlan from './production/FinalPlan';

const ProductionPlan: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { state, recordStepEvent } = useExperiment();
  const hasRecordedStartRef = useRef(false);
  const prevHighestStepRef = useRef(state.highest_completed_step);

  // Record STARTED event only when entering a new step (step > highest_completed_step)
  // Reset ref when state is rolled back (highest_completed_step decreases)
  useEffect(() => {
    if (state.highest_completed_step < prevHighestStepRef.current) {
      hasRecordedStartRef.current = false;
    }
    prevHighestStepRef.current = state.highest_completed_step;

    if (7 > state.highest_completed_step && !hasRecordedStartRef.current) {
      recordStepEvent(7, 'STARTED');
      hasRecordedStartRef.current = true;
    }
  }, [state.highest_completed_step, recordStepEvent]);

  const subSteps = [
    { id: 1, title: '生产计划制定总概述', icon: FileText, path: 'overview' },
    { id: 2, title: '计算生产变量', icon: Calculator, path: 'variables' },
    { id: 3, title: '计算服务水平', icon: Target, path: 'service-level' },
    { id: 4, title: '计算预测量', icon: TrendingUp, path: 'forecast' },
    { id: 5, title: '计算投入量', icon: Package, path: 'input' },
    { id: 6, title: '完整计划表生成', icon: BarChart3, path: 'final-plan' },
  ];

  const currentPath = location.pathname.split('/').pop() || '';
  const currentStepIndex = subSteps.findIndex(step => step.path === currentPath);

  const getSubStepStyles = (path: string) => {
    const isActive = currentPath === path;
    if (isActive) {
      return 'bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 ring-2 ring-blue-400';
    }
    return 'bg-gray-50 text-gray-700 hover:bg-gray-100 border border-gray-200';
  };

  const DefaultContent = () => (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
      <h2 className="text-2xl font-semibold text-gray-900 mb-2">生产计划制定中心</h2>
      <p className="text-gray-600 mb-6">
        欢迎来到生产计划制定模块。请从左侧菜单选择一个步骤开始学习和实践。
      </p>
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-blue-800 mb-3">🎯 您的学习路径</h3>
        <div className="text-blue-700 space-y-2">
          <p>• <strong>理解MPS概念</strong>：学习主生产计划的核心思想</p>
          <p>• <strong>掌握计算方法</strong>：逐步学习各项指标的计算公式</p>
          <p>• <strong>生成完整计划</strong>：综合应用所学知识制定生产计划</p>
        </div>
      </div>
    </div>
  );

  // Check if we're on the intro page
  if (location.pathname === '/production' || location.pathname === '/production/') {
    return (
      <div className="p-8">
        <div className="w-full">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">步骤 7: 制定生产计划</h1>
            <p className="text-lg text-gray-600">
              进入生产计划制定之前，请先了解您在企业中的角色定位与任务背景。
            </p>
          </div>
          <PlanIntro />
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="w-full">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">步骤 7: 制定生产计划</h1>
          <p className="text-lg text-gray-600">
            基于需求预测结果，制定合理的生产计划。考虑生产能力、库存成本、交货期等因素，优化生产排程和资源配置。
          </p>
        </div>

        <div className="flex gap-8">
          {/* 左侧导航 */}
          <div className="w-80 bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-6">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">生产计划步骤</h2>
              <nav className="space-y-2">
                {subSteps.map((step) => {
                  const Icon = step.icon;
                  const isActive = currentPath === step.path;

                  return (
                    <Link
                      key={step.id}
                      to={`/production/${step.path}`}
                      className={`flex items-center space-x-3 p-3 rounded-lg transition-all ${getSubStepStyles(step.path)}`}
                    >
                      <div className="flex-shrink-0">
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2">
                          <span className="text-xs font-medium opacity-60">
                            步骤 {step.id}
                          </span>
                        </div>
                        <p className="font-medium truncate">{step.title}</p>
                      </div>
                      {isActive && <ArrowRight className="w-4 h-4" />}
                    </Link>
                  );
                })}
              </nav>
            </div>
          </div>

          {/* 右侧内容区域 */}
          <div className="flex-1 min-h-0">
            <Routes>
              <Route index element={<DefaultContent />} />
              <Route path="overview" element={<Overview />} />
              <Route path="variables" element={<Variables />} />
              <Route path="service-level" element={<ServiceLevel />} />
              <Route path="forecast" element={<Forecast />} />
              <Route path="input" element={<Input />} />
              <Route path="final-plan" element={<FinalPlan />} />
            </Routes>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductionPlan;