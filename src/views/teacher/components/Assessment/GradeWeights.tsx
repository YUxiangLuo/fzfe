import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { Save, RotateCcw } from 'lucide-react';
import type { GradeWeights as GradeWeightsApi } from '@/views/teacher/types';
import Button from '@/views/teacher/components/shadcn/TeacherButton';
import Modal from '@/views/teacher/components/shadcn/TeacherModal';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { apiClient } from '@/utils/apiClient';
import { decodeToken } from '@/utils/auth';
import { validatePercentage } from '@/views/teacher/utils/validation';
import { useToast } from '@/views/teacher/hooks/useToast';

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

type TopLevelKey = keyof Pick<GradeWeightsApi, 'exp_flow_weight' | 'knowledge_test_weight' | 'model_quality_weight' | 'report_quality_weight'>;

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
  { key: 'exp_flow_weight', label: '实验流程', color: 'bg-primary' },
  { key: 'knowledge_test_weight', label: '知识点测试', color: 'bg-success' },
  { key: 'model_quality_weight', label: '模型选择', color: 'bg-warning' },
  { key: 'report_quality_weight', label: '实验报告', color: 'bg-accent' },
];

const DEFAULT_WEIGHTS: GradeWeightsApi = {
  exp_flow_weight: 40,
  exp_flow_demand_data_preparation: 5,
  exp_flow_demand_descriptive_stats: 5,
  exp_flow_demand_model_selection: 10,
  exp_flow_demand_generate_results: 10,
  exp_flow_production_inventory_calc: 10,
  exp_flow_production_service_level: 5,
  exp_flow_production_variable_calc: 5,
  exp_flow_production_plan_creation: 15,
  exp_flow_report_submission: 35,
  knowledge_test_weight: 20,
  model_quality_weight: 20,
  report_quality_weight: 20,
};

const GradeWeights: React.FC = () => {
  const { showToast } = useToast();
  const [weights, setWeights] = useState<GradeWeightsApi>(DEFAULT_WEIGHTS);
  const [tempWeights, setTempWeights] = useState<GradeWeightsApi>(DEFAULT_WEIGHTS);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [classes, setClasses] = useState<any[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [isLoadingClasses, setIsLoadingClasses] = useState(true);

  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  const handleCloseDetailModal = useCallback(() => {
    setIsDetailModalOpen(false);
  }, []);
  const [teacherId, setTeacherId] = useState<number | null>(null);
  const [hasExistingPlan, setHasExistingPlan] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      setError('未找到登录凭据，请重新登录。');
      setIsLoading(false);
      setIsLoadingClasses(false);
      return;
    }
    const decoded = decodeToken(token);
    if (!decoded || !decoded.sub) {
      setError('登录信息已失效，请重新登录。');
      setIsLoading(false);
      setIsLoadingClasses(false);
      return;
    }
    setTeacherId(decoded.sub);
  }, []);

  useEffect(() => {
    if (teacherId === null) return;

    const fetchClasses = async () => {
      setIsLoadingClasses(true);
      setError(null);
      try {
        const response = await apiClient.get(`/teachers/${teacherId}/classes`);
        const classList = Array.isArray(response) ? (response as any[]) : [];
        setClasses(classList);
        if (classList.length > 0) {
          setSelectedClassId(String(classList[0].class_id));
        } else {
          setIsLoading(false); // No classes, so no weights to load
        }
      } catch (err: any) {
        setError(err.message || "获取班级列表失败");
        setIsLoading(false);
      } finally {
        setIsLoadingClasses(false);
      }
    };

    fetchClasses();
  }, [teacherId]);

  useEffect(() => {
    if (!selectedClassId) {
      setWeights(DEFAULT_WEIGHTS);
      setTempWeights(DEFAULT_WEIGHTS);
      setHasExistingPlan(false);
      setIsLoading(false);
      return;
    }

    const fetchWeights = async () => {
      setIsLoading(true);
      setError(null);
      setInfoMessage(null);
      try {
        const response = await apiClient.get<GradeWeightsApi>(`/classes/${selectedClassId}/grading-policy`);
        setWeights(response);
        setTempWeights(response);
        setHasExistingPlan(true);
      } catch (err: any) {
        if (err.message && err.message.toLowerCase().includes('not found')) {
          setWeights(DEFAULT_WEIGHTS);
          setTempWeights(DEFAULT_WEIGHTS);
          setHasExistingPlan(false);
          setInfoMessage('当前班级未设置权重，已加载默认模板。保存后将为该班级创建新的权重方案。');
        } else {
          setError(err.message || '获取成绩权重失败，请稍后重试');
          setWeights(DEFAULT_WEIGHTS);
          setTempWeights(DEFAULT_WEIGHTS);
          setHasExistingPlan(false);
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchWeights();
  }, [selectedClassId]);

  const topLevelTotal = useMemo(() => tempWeights.exp_flow_weight + tempWeights.knowledge_test_weight + tempWeights.model_quality_weight + tempWeights.report_quality_weight, [tempWeights]);
  const flowTotal = useMemo(() => FLOW_ITEMS.reduce((sum, item) => sum + (tempWeights[item.key] ?? 0), 0), [tempWeights]);

  const handleTopLevelChange = (key: TopLevelKey, value: number) => {
    // 验证百分比范围
    const validation = validatePercentage(value, '权重');
    if (!validation.valid) {
      return; // 不更新无效值
    }
    setTempWeights((prev) => ({ ...prev, [key]: value }));
  };

  const handleFlowChange = (key: FlowKey, value: number) => {
    // 验证百分比范围
    const validation = validatePercentage(value, '权重');
    if (!validation.valid) {
      return; // 不更新无效值
    }
    setTempWeights((prev) => ({ ...prev, [key]: value }));
  };

  const resetToDefault = () => {
    setTempWeights(DEFAULT_WEIGHTS);
    showToast('已恢复默认的成绩权重。', 'success');
  };

  const resetFlowDetails = () => {
    setTempWeights((prev) => ({
      ...prev,
      ...FLOW_ITEMS.reduce((acc, item) => {
        acc[item.key] = DEFAULT_WEIGHTS[item.key];
        return acc;
      }, {} as Record<FlowKey, number>),
    }));
    showToast('实验流程子项已恢复默认。', 'success');
  };

  const saveWeights = async () => {
    if (!selectedClassId) {
      showToast('请先选择一个班级。', 'error');
      return;
    }

    // 验证所有权重值的范围
    const allWeights: [string, number][] = [
      ['实验流程', tempWeights.exp_flow_weight],
      ['知识点测试', tempWeights.knowledge_test_weight],
      ['模型选择', tempWeights.model_quality_weight],
      ['实验报告', tempWeights.report_quality_weight],
    ];

    for (const [name, value] of allWeights) {
      const validation = validatePercentage(value, name);
      if (!validation.valid) {
        showToast(`${name}：${validation.error}`, 'error');
        return;
      }
    }

    if (topLevelTotal !== 100) {
      showToast(`一级权重总和必须为 100%，当前总和为 ${topLevelTotal}%。`, 'error');
      return;
    }
    if (flowTotal !== 100) {
      showToast(`实验流程子项权重总和必须为 100%，当前总和为 ${flowTotal}%。`, 'error');
      return;
    }

    try {
      setIsSaving(true);
      const payload: GradeWeightsApi = { ...tempWeights };
      const endpoint = `/classes/${selectedClassId}/grading-policy`;
      const response = hasExistingPlan
        ? await apiClient.put(endpoint, payload)
        : await apiClient.post(endpoint, payload);
      
      setWeights(response as GradeWeightsApi);
      setTempWeights(response as GradeWeightsApi);
      setHasExistingPlan(true);
      setInfoMessage(null); // Clear info message on successful save
      showToast('成绩权重已保存', 'success');
    } catch (err: any) {
      showToast(err.message || '保存成绩权重失败', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const renderTopLevelControls = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {TOP_LEVEL_ITEMS.map((item) => (
        <div key={item.key} className="bg-muted rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="font-medium text-foreground">{item.label}</span>
            {item.key === 'exp_flow_weight' && (
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
                step="1"
                value={tempWeights[item.key]}
                onChange={(event) => handleTopLevelChange(item.key, Number(event.target.value))}
                className="flex-1 h-2 bg-muted rounded-lg appearance-none cursor-pointer"
                disabled={isLoading}
                aria-label={`${item.label}权重滑块`}
              />
              <div className="flex items-center space-x-2">
              <Input
                type="number"
                min="0"
                max="100"
                step="1"
                value={tempWeights[item.key]}
                onChange={(event) => handleTopLevelChange(item.key, Number(event.target.value) || 0)}
                className="w-16 text-center"
                disabled={isLoading}
                aria-label={`${item.label}权重输入`}
              />
                <span className="text-sm text-muted-foreground">%</span>
              </div>
            </div>

            <div className="w-full bg-muted rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all duration-300 ${item.color}`}
                style={{ width: `${tempWeights[item.key]}%` }}
              ></div>
            </div>

            <div className="text-center">
              <span className="text-xl font-bold text-foreground">{tempWeights[item.key]}%</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  const renderFlowControls = () => (
    <div className="space-y-4">
      {FLOW_ITEMS.map((item) => (
        <div key={item.key} className="bg-muted rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-foreground">{item.label}</span>
            <div className="flex items-center space-x-2">
              <Input
                type="number"
                min="0"
                max="100"
                step="1"
                value={tempWeights[item.key]}
                onChange={(event) => handleFlowChange(item.key, Number(event.target.value) || 0)}
                className="w-20 text-center"
                disabled={isLoading}
                aria-label={`${item.label}权重输入`}
              />
              <span className="text-sm text-muted-foreground">%</span>
            </div>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            step="1"
            value={tempWeights[item.key]}
            onChange={(event) => handleFlowChange(item.key, Number(event.target.value))}
            className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer"
            disabled={isLoading}
            aria-label={`${item.label}权重滑块`}
          />
        </div>
      ))}
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between md:space-x-4 space-y-3 md:space-y-0">
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-foreground">成绩权重</h1>
          <p className="text-sm text-muted-foreground mt-1">设置不同考核项在最终成绩中的占比。此设置将应用于指定班级。</p>
        </div>
        <div className="flex items-center space-x-3">
          <Button onClick={resetToDefault} variant="outline" disabled={!selectedClassId || isLoading}>
            <RotateCcw size={16} className="mr-2" />
            恢复默认
          </Button>
          <Button onClick={saveWeights} disabled={!selectedClassId || isSaving || isLoading}>
            <Save size={16} className="mr-2" />
            {isSaving ? '保存中...' : '保存设置'}
          </Button>
        </div>
      </div>

      <div className="bg-card rounded-lg shadow-md p-6">
        <div className="w-full md:max-w-xs">
          <Label className="text-foreground mb-2">选择班级</Label>
          <Select
            value={selectedClassId}
            onValueChange={setSelectedClassId}
            disabled={isLoadingClasses || classes.length === 0}
          >
            <SelectTrigger className="w-full" aria-label="选择班级">
              <SelectValue
                placeholder={
                  isLoadingClasses
                    ? '正在加载班级...'
                    : classes.length === 0
                      ? '暂无班级'
                      : '请选择班级'
                }
              />
            </SelectTrigger>
            <SelectContent>
              {classes.length === 0 ? (
                <SelectItem value="__empty__" disabled>
                  {isLoadingClasses ? '正在加载班级...' : '暂无班级'}
                </SelectItem>
              ) : (
                classes.map((cls) => (
                  <SelectItem key={cls.class_id} value={String(cls.class_id)}>
                    {cls.class_name}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        </div>
      </div>

      {error && (
        <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      {infoMessage && !error && (
        <div className="bg-primary/10 border border-primary/20 text-primary px-4 py-3 rounded-lg text-sm">
          {infoMessage}
        </div>
      )}

      {!selectedClassId && !isLoadingClasses && (
        <div className="text-center py-12 bg-muted rounded-lg">
          <p className="text-muted-foreground">
            {classes.length > 0 ? '请选择一个班级以设置其成绩权重。' : '您当前没有管理的班级，请先创建或关联一个班级。'}
          </p>
        </div>
      )}

      <fieldset disabled={!selectedClassId || isLoading} className="space-y-6">
        <div className="bg-card rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-foreground">一级权重设置</h2>
              <div
                className={`px-3 py-1 rounded-full text-sm font-medium ${topLevelTotal === 100 ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'}`}
              >
              总计 {topLevelTotal}%
            </div>
          </div>
          {renderTopLevelControls()}
        </div>

        <div className="bg-card rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4">权重分布图表</h3>
          <div className="space-y-4">
            <div className="w-full bg-muted rounded-full h-8 overflow-hidden flex">
              {TOP_LEVEL_ITEMS.map((item) => (
                <div
                  key={item.key}
                  className={`${item.color} flex items-center justify-center text-primary-foreground text-sm font-medium`}
                  style={{ width: `${tempWeights[item.key]}%` }}
                >
                  {item.label} {tempWeights[item.key]}%
                </div>
              ))}
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs text-muted-foreground">
              {TOP_LEVEL_ITEMS.map((item) => (
                <div key={item.key} className="flex items-center space-x-2">
                  <span className={`inline-block w-3 h-3 rounded-full ${item.color}`}></span>
                  <span>{item.label}</span>
                  <span className="font-medium text-foreground">{tempWeights[item.key]}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </fieldset>

      <Modal
        isOpen={isDetailModalOpen}
        onClose={handleCloseDetailModal}
        title="实验流程权重细分"
        size="large"
      >
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">调整每个实验步骤在实验流程中的权重分布，必须合计 100%。</p>
            <div
              className={`px-3 py-1 rounded-full text-sm font-medium ${flowTotal === 100 ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'}`}
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
                showToast('实验流程子项权重总和必须为 100%。', 'error');
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
