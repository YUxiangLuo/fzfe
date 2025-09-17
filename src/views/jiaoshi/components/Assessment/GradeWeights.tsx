import React, { useEffect, useMemo, useState } from 'react';
import { Save, RotateCcw } from 'lucide-react';
import type { GradeWeights as GradeWeightsApi } from '../../types';
import Button from '../Common/Button';
import Modal from '../Common/Modal';
import { apiClient } from '../../../../utils/apiClient';
import { decodeToken } from '../../../../utils/auth';

type FlowKey = keyof Pick<GradeWeightsApi,
  'exp_flow_demand_data_preparation' |
  'exp_flow_demand_descriptive_stats' |
  'exp_flow_demand_model_selection' |
  'exp_flow_demand_generate_results' |
  'exp_flow_production_inventory_calc' |
  'exp_flow_production_service_level' |
  'exp_flow_production_variable_calc' |
  'exp_flow_production_plan_creation' |
  'exp_flow_report_submission'>;

type TopLevelKey = keyof Pick<GradeWeightsApi, 'exp_flow' | 'knowledge_test' | 'model_quality' | 'report_quality'>;

interface FlowItem {
  key: FlowKey;
  label: string;
}

interface TopLevelItem {
  key: TopLevelKey;
  label: string;
  color: string;
}

const FLOW_ITEMS: FlowItem[] = [
  { key: 'exp_flow_demand_data_preparation', label: '需求预测 - 数据准备' },
  { key: 'exp_flow_demand_descriptive_stats', label: '需求预测 - 描述性统计' },
  { key: 'exp_flow_demand_model_selection', label: '需求预测 - 模型选择' },
  { key: 'exp_flow_demand_generate_results', label: '需求预测 - 生成预测结果' },
  { key: 'exp_flow_production_inventory_calc', label: '生产计划 - 库存变量计算' },
  { key: 'exp_flow_production_service_level', label: '生产计划 - 服务水平计算' },
  { key: 'exp_flow_production_variable_calc', label: '生产计划 - 生产变量计算' },
  { key: 'exp_flow_production_plan_creation', label: '生产计划 - 制定计划' },
  { key: 'exp_flow_report_submission', label: '提交实验报告' },
];

const TOP_LEVEL_ITEMS: TopLevelItem[] = [
  { key: 'exp_flow', label: '实验流程', color: 'bg-blue-500' },
  { key: 'knowledge_test', label: '知识点测试', color: 'bg-green-500' },
  { key: 'model_quality', label: '模型质量', color: 'bg-yellow-500' },
  { key: 'report_quality', label: '实验报告质量', color: 'bg-purple-500' },
];

const DEFAULT_WEIGHTS: GradeWeightsApi = {
  exp_flow: 40,
  exp_flow_demand_data_preparation: 12,
  exp_flow_demand_descriptive_stats: 10,
  exp_flow_demand_model_selection: 8,
  exp_flow_demand_generate_results: 10,
  exp_flow_production_inventory_calc: 10,
  exp_flow_production_service_level: 10,
  exp_flow_production_variable_calc: 10,
  exp_flow_production_plan_creation: 15,
  exp_flow_report_submission: 15,
  knowledge_test: 20,
  model_quality: 20,
  report_quality: 20,
};

const GradeWeights: React.FC = () => {
  const [weights, setWeights] = useState<GradeWeightsApi>(DEFAULT_WEIGHTS);
  const [tempWeights, setTempWeights] = useState<GradeWeightsApi>(DEFAULT_WEIGHTS);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [teacherId, setTeacherId] = useState<number | null>(null);
  const [hasExistingPlan, setHasExistingPlan] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      setError('未找到登录凭据，请重新登录。');
      setIsLoading(false);
      return;
    }
    const decoded = decodeToken(token);
    if (!decoded) {
      setError('登录信息已失效，请重新登录。');
      setIsLoading(false);
      return;
    }
    setTeacherId(decoded.sub);
  }, []);

  useEffect(() => {
    if (teacherId === null) return;
    const fetchWeights = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await apiClient.get('/grade-weights');
        if (response) {
          setWeights(response as GradeWeightsApi);
          setTempWeights(response as GradeWeightsApi);
          setHasExistingPlan(true);
        } else {
          setWeights(DEFAULT_WEIGHTS);
          setTempWeights(DEFAULT_WEIGHTS);
          setHasExistingPlan(false);
        }
      } catch (err: any) {
        setError(err.message || '获取成绩权重失败，将使用默认值');
        setWeights(DEFAULT_WEIGHTS);
        setTempWeights(DEFAULT_WEIGHTS);
        setHasExistingPlan(false);
      } finally {
        setIsLoading(false);
      }
    };

    fetchWeights();
  }, [teacherId]);

  const topLevelTotal = useMemo(() => tempWeights.exp_flow + tempWeights.knowledge_test + tempWeights.model_quality + tempWeights.report_quality, [tempWeights]);
  const flowTotal = useMemo(() => FLOW_ITEMS.reduce((sum, item) => sum + (tempWeights[item.key] ?? 0), 0), [tempWeights]);

  const handleTopLevelChange = (key: TopLevelKey, value: number) => {
    setTempWeights((prev) => ({ ...prev, [key]: value }));
  };

  const handleFlowChange = (key: FlowKey, value: number) => {
    setTempWeights((prev) => ({ ...prev, [key]: value }));
  };

  const resetToDefault = () => {
    setTempWeights(DEFAULT_WEIGHTS);
    alert('已恢复默认的成绩权重。');
  };

  const resetFlowDetails = () => {
    setTempWeights((prev) => ({
      ...prev,
      ...FLOW_ITEMS.reduce((acc, item) => {
        acc[item.key] = DEFAULT_WEIGHTS[item.key];
        return acc;
      }, {} as Record<FlowKey, number>),
    }));
    alert('实验流程子项已恢复默认。');
  };

  const saveWeights = async () => {
    if (topLevelTotal !== 100) {
      alert('一级权重总和必须为 100%。');
      return;
    }
    if (flowTotal !== 100) {
      alert('实验流程子项权重总和必须为 100%。');
      return;
    }

    try {
      setIsSaving(true);
      const payload: GradeWeightsApi = { ...tempWeights };
      const response = hasExistingPlan
        ? await apiClient.put('/grade-weights', payload)
        : await apiClient.post('/grade-weights', payload);
      setWeights(response as GradeWeightsApi);
      setTempWeights(response as GradeWeightsApi);
      setHasExistingPlan(true);
      alert('成绩权重已保存');
    } catch (err: any) {
      alert(err.message || '保存成绩权重失败');
    } finally {
      setIsSaving(false);
    }
  };

  const renderTopLevelControls = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {TOP_LEVEL_ITEMS.map((item) => (
        <div key={item.key} className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="font-medium text-gray-900">{item.label}</span>
            {item.key === 'exp_flow' && (
              <Button size="sm" variant="outline" onClick={() => setIsDetailModalOpen(true)}>
                细分调整
              </Button>
            )}
          </div>
          <div className="space-y-3">
            <div className="flex items-center space-x-3">
              <input
                type="range"
                min="0"
                max="100"
                value={tempWeights[item.key]}
                onChange={(event) => handleTopLevelChange(item.key, Number(event.target.value))}
                className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                disabled={isLoading}
              />
              <div className="flex items-center space-x-2">
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={tempWeights[item.key]}
                  onChange={(event) => handleTopLevelChange(item.key, Number(event.target.value) || 0)}
                  className="w-16 px-2 py-1 text-center border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  disabled={isLoading}
                />
                <span className="text-sm text-gray-600">%</span>
              </div>
            </div>

            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all duration-300 ${item.color}`}
                style={{ width: `${tempWeights[item.key]}%` }}
              ></div>
            </div>

            <div className="text-center">
              <span className="text-xl font-bold text-gray-800">{tempWeights[item.key]}%</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  const renderFlowControls = () => (
    <div className="space-y-4">
      {FLOW_ITEMS.map((item) => (
        <div key={item.key} className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">{item.label}</span>
            <div className="flex items-center space-x-2">
              <input
                type="number"
                min="0"
                max="100"
                value={tempWeights[item.key]}
                onChange={(event) => handleFlowChange(item.key, Number(event.target.value) || 0)}
                className="w-20 px-2 py-1 text-center border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                disabled={isLoading}
              />
              <span className="text-sm text-gray-500">%</span>
            </div>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            value={tempWeights[item.key]}
            onChange={(event) => handleFlowChange(item.key, Number(event.target.value))}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
            disabled={isLoading}
          />
        </div>
      ))}
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between md:space-x-4 space-y-3 md:space-y-0">
        <h1 className="text-2xl font-bold text-gray-900">成绩权重</h1>
        <div className="flex space-x-3">
          <Button onClick={resetToDefault} variant="outline">
            <RotateCcw size={16} className="mr-2" />
            使用默认值
          </Button>
          <Button onClick={saveWeights} disabled={isSaving || isLoading}>
            <Save size={16} className="mr-2" />
            {isSaving ? '保存中...' : '保存设置'}
          </Button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">一级权重设置</h2>
            <div
              className={`px-3 py-1 rounded-full text-sm font-medium ${topLevelTotal === 100 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}
            >
            总计 {topLevelTotal}%
          </div>
        </div>
        {renderTopLevelControls()}
      </div>

      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">权重分布图表</h3>
        <div className="space-y-4">
          <div className="w-full bg-gray-200 rounded-full h-8 overflow-hidden flex">
            {TOP_LEVEL_ITEMS.map((item) => (
              <div
                key={item.key}
                className={`${item.color} flex items-center justify-center text-white text-sm font-medium`}
                style={{ width: `${weights[item.key]}%` }}
              >
                {item.label} {weights[item.key]}%
              </div>
            ))}
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs text-gray-600">
            {TOP_LEVEL_ITEMS.map((item) => (
              <div key={item.key} className="flex items-center space-x-2">
                <span className={`inline-block w-3 h-3 rounded-full ${item.color}`}></span>
                <span>{item.label}</span>
                <span className="font-medium text-gray-900">{weights[item.key]}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <Modal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        title="实验流程权重细分"
        size="large"
      >
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-600">调整每个实验步骤在实验流程中的权重分布，必须合计 100%。</p>
            <div
              className={`px-3 py-1 rounded-full text-sm font-medium ${flowTotal === 100 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}
            >
              当前合计 {flowTotal}%
            </div>
          </div>

          {renderFlowControls()}

          <div className="flex justify-end space-x-3">
            <Button variant="outline" onClick={resetFlowDetails}>
              重置子项
            </Button>
            <Button onClick={() => {
              if (flowTotal !== 100) {
                alert('实验流程子项权重总和必须为 100%。');
                return;
              }
              setIsDetailModalOpen(false);
            }}>
              完成
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default GradeWeights;
