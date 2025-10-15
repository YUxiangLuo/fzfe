import React, { useEffect, useMemo, useRef, useState } from "react";
import { BrainCircuit, CheckCircle, Loader2, AlertTriangle } from "lucide-react";
import { useExperiment, type ModelMetrics } from "../../contexts/ExperimentContext";
import { apiClient } from "../../../../utils/apiClient";
const steps = [
  { id: 1, title: "方法简介", description: "了解 LSTM 神经网络的核心思想与应用价值。" },
  { id: 2, title: "选择归一化方式", description: "了解 Min-Max 与 Z-Score 的差异，并选择适合的归一化方法。" },
  { id: 3, title: "配置特征与预测列", description: "选择预测目标字段和输入特征，构建多维度预测模型。" },
  { id: 4, title: "训练并查看指标", description: "运行 LSTM 模型，查看 RMSE、MAE 与 R² 指标。" },
] as const;

const sanitizeFeatures = (features: string[], target: string | null): string[] =>
  target ? features.filter((field) => field !== target) : [...features];

const LSTMModel: React.FC = () => {
  const { state, updateState, productFieldOptions, isLoadingFields, productFieldsError } = useExperiment();
  const lstmState = {
    completed: state.lstm_completed,
    normalization: state.lstm_normalization,
    features: state.lstm_features,
    targetField: state.lstm_target_field,
    metrics: {
      rmse: state.lstm_metrics_rmse,
      mae: state.lstm_metrics_mae,
      r2: state.lstm_metrics_r2,
    } as ModelMetrics,
  };

  const baseModelsCompletedCount = [
    state.moving_average_completed,
    state.exponential_smoothing_completed,
    state.arima_completed,
    state.lstm_completed,
  ].filter(Boolean).length;

  const hasAnyEnsembleCompleted = [
    state.ensemble_weighted_completed,
    state.ensemble_boosting_completed,
    state.ensemble_stacking_completed,
  ].some(Boolean);

  const shouldShowFusionUnlockedNotice =
    baseModelsCompletedCount >= 2 && !hasAnyEnsembleCompleted;

  const derivedStep = useMemo(() => {
    if (lstmState.completed) return 4;
    if (lstmState.targetField || lstmState.features.length > 0) return 3;
    if (lstmState.normalization) return 2;
    return 1;
  }, [lstmState.completed, lstmState.features.length, lstmState.normalization, lstmState.targetField]);

  const [activeStep, setActiveStep] = useState(derivedStep);
  const [selectedNormalization, setSelectedNormalization] = useState<"minmax" | "zscore" | null>(
    lstmState.normalization ?? null,
  );
  const [selectedFeatures, setSelectedFeatures] = useState<string[]>(
    sanitizeFeatures(lstmState.features, lstmState.targetField ?? null),
  );
  const [selectedTarget, setSelectedTarget] = useState<string | null>(lstmState.targetField ?? null);
  const [featureValidationAttempted, setFeatureValidationAttempted] = useState(false);
  const [isTraining, setIsTraining] = useState(false);
  const [trainingError, setTrainingError] = useState<string | null>(null);
  const prevDerivedStepRef = useRef(derivedStep);

  const buildDownstreamReset = () => ({
    ensemble_weighted_completed: false,
    ensemble_weighted_base_models: [],
    ensemble_weighted_metrics_rmse: null,
    ensemble_weighted_metrics_mae: null,
    ensemble_weighted_metrics_r2: null,
    ensemble_boosting_completed: false,
    ensemble_boosting_base_models: [],
    ensemble_boosting_metrics_rmse: null,
    ensemble_boosting_metrics_mae: null,
    ensemble_boosting_metrics_r2: null,
    ensemble_stacking_completed: false,
    ensemble_stacking_base_models: [],
    ensemble_stacking_metrics_rmse: null,
    ensemble_stacking_metrics_mae: null,
    ensemble_stacking_metrics_r2: null,
    selected_best_model: null,
    quiz_about_model_completed: false,
    quiz_about_plan_completed: false,
    production_plan_completed: false,
    production_forecast_periods: null,
    production_initial_inventory: null,
    production_target_service_level: null,
    production_safety_stock_z_score: null,
    production_forecast_results: null,
    production_mps_table: [],
    highest_completed_step: Math.min(state.highest_completed_step ?? 0, 4),
    current_step: Math.min(state.current_step ?? 5, 5),
  });

  useEffect(() => {
    const prevDerived = prevDerivedStepRef.current;
    if (derivedStep > prevDerived && derivedStep > activeStep) {
      setActiveStep(derivedStep);
    }
    prevDerivedStepRef.current = derivedStep;
  }, [derivedStep, activeStep]);

  useEffect(() => {
    if (lstmState.normalization) {
      setSelectedNormalization(lstmState.normalization);
    }
    setSelectedFeatures(sanitizeFeatures(lstmState.features, lstmState.targetField ?? null));
    setSelectedTarget(lstmState.targetField ?? null);
  }, [lstmState.features, lstmState.normalization, lstmState.targetField]);

  const recommendedNormalization = useMemo(() => "minmax", []);

  const handleNormalizationSelect = async (value: "minmax" | "zscore") => {
    if (value === selectedNormalization) return;
    setSelectedNormalization(value);
    await updateState({
      lstm_normalization: value,
      lstm_completed: false,
      lstm_metrics_rmse: null,
      lstm_metrics_mae: null,
      lstm_metrics_r2: null,
      ...buildDownstreamReset(),
    });
  };

  const handleFeatureToggle = async (field: string) => {
    setFeatureValidationAttempted(false);
    const nextFeatures = selectedFeatures.includes(field)
      ? selectedFeatures.filter((id) => id !== field)
      : [...selectedFeatures, field];
    const sanitized = sanitizeFeatures(nextFeatures, selectedTarget);
    setSelectedFeatures(sanitized);

    await updateState({
      lstm_features: sanitized,
      lstm_completed: false,
      lstm_metrics_rmse: null,
      lstm_metrics_mae: null,
      lstm_metrics_r2: null,
      ...buildDownstreamReset(),
    });
  };

  const handleTargetSelect = async (value: string | null) => {
    setFeatureValidationAttempted(false);
    setSelectedTarget(value);
    await updateState({
      lstm_target_field: value,
      lstm_completed: false,
      lstm_metrics_rmse: null,
      lstm_metrics_mae: null,
      lstm_metrics_r2: null,
      ...buildDownstreamReset(),
    });
  };

  useEffect(() => {
    if (!selectedTarget) {
      return;
    }
    setSelectedFeatures((prev) => {
      if (!prev.includes(selectedTarget)) {
        return prev;
      }
      const sanitized = sanitizeFeatures(prev, selectedTarget);
      return sanitized;
    });
  }, [selectedTarget]);

  useEffect(() => {
    if (!productFieldOptions || productFieldOptions.length === 0) {
      return;
    }
    setSelectedFeatures((prev) => {
      const filtered = prev.filter((field) => productFieldOptions.includes(field));
      return filtered;
    });
    if (selectedTarget && !productFieldOptions.includes(selectedTarget)) {
      setSelectedTarget(null);
    }
  }, [productFieldOptions, selectedTarget]);


  const handleTrainModel = async () => {
    if (isTraining || lstmState.completed) return;

    setIsTraining(true);
    setTrainingError(null);

    try {
      if (!selectedNormalization) {
        throw new Error("请先选择归一化方式");
      }

      const featuresToSave = sanitizeFeatures(selectedFeatures, selectedTarget);
      setSelectedFeatures(featuresToSave);

      // Prepare request body
      const requestBody = {
        selected_industry: state.selected_industry,
        selected_company: state.selected_company,
        selected_product: state.selected_product,
        data_window_train_start_index: state.data_window_train_start_index,
        data_window_train_end_index: state.data_window_train_end_index,
        data_window_evaluate_start_index: state.data_window_evaluate_start_index,
        data_window_evaluate_end_index: state.data_window_evaluate_end_index,
        lstm_normalization: selectedNormalization,
        lstm_target_field: selectedTarget ?? '',
        lstm_features: featuresToSave,
      };

      const response = await apiClient.post<{
        status: string;
        results: {
          mode: string;
          norm: string;
          lookback: number;
          evaluated_points: number;
          auto_adjustments?: {
            batch_size?: {
              input: number;
              final: number;
              reason: string;
            };
          };
          metrics: {
            rmse: number;
            mae: number;
            mape: number;
            r2: number;
          };
          notes?: string[];
          saved_model?: string;
        };
        inferred_feature_types?: Record<string, string>;
      }>("/model/lstm/train", requestBody);

      if (response.status === "success") {
        const metrics = response.results?.metrics ?? { rmse: null, mae: null, r2: null };
        await updateState({
          lstm_normalization: selectedNormalization,
          lstm_features: featuresToSave,
          lstm_target_field: selectedTarget ?? null,
          lstm_completed: true,
          lstm_metrics_rmse: metrics.rmse ?? null,
          lstm_metrics_mae: metrics.mae ?? null,
          lstm_metrics_r2: metrics.r2 ?? null,
        });
      } else {
        throw new Error("模型训练返回失败状态");
      }
    } catch (err: any) {
      setTrainingError(err.message || "训练过程中发生未知错误");
    } finally {
      setIsTraining(false);
    }
  };

  const handleNext = async () => {
    if (activeStep === 1) {
      setActiveStep(2);
      return;
    }

    if (activeStep === 2) {
      if (!selectedNormalization) {
        return;
      }
      setActiveStep(3);
      return;
    }

    if (activeStep === 3) {
      setFeatureValidationAttempted(true);
      if (!selectedTarget || selectedFeatures.length === 0) {
        return;
      }
      setActiveStep(4);
      return;
    }

    if (activeStep === 4 && !lstmState.completed && !isTraining) {
      await handleTrainModel();
    }
  };

  const handleBack = () => {
    if (activeStep === 1) return;
    setActiveStep((prev) => Math.max(1, prev - 1));
  };

  const renderIntro = () => (
    <div className="space-y-6">
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <h3 className="text-xl font-semibold text-gray-900 mb-4">LSTM 模型概览</h3>
        <p className="text-sm text-gray-600 leading-relaxed">
          LSTM（Long Short-Term Memory）是处理时间序列的循环神经网络，能够捕捉长短期依赖关系，适合需求预测、库存预测等任务，尤其是在特征维度丰富的场景中表现优异。
        </p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="font-semibold text-blue-700 mb-2">适用场景</p>
          <p className="text-sm text-blue-700">需求波动复杂、存在多维影响因素的时间序列。</p>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="font-semibold text-blue-700 mb-2">优势</p>
          <p className="text-sm text-blue-700">能够自动提取非线性特征，捕捉长期依赖关系。</p>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="font-semibold text-blue-700 mb-2">注意事项</p>
          <p className="text-sm text-blue-700">需要合理的特征归一化与数据量支持，训练时间相对较长。</p>
        </div>
      </div>
    </div>
  );

  const renderNormalizationStep = () => (
    <div className="space-y-6">
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <h3 className="text-xl font-semibold text-gray-900 mb-4">归一化方式对比</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className={`rounded-xl border p-6 space-y-3 ${selectedNormalization === "minmax" ? "border-blue-500 bg-blue-50" : "border-gray-200"}`}>
            <h4 className="text-lg font-semibold text-blue-700">Min-Max 归一化</h4>
            <p className="text-sm text-blue-600">将特征缩放到 [0,1] 区间，对范围固定的数据集十分稳定。</p>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• 适用于边界明确的指标，例如销量、库存。</li>
              <li>• 对离群值敏感，容易受极端值影响。</li>
            </ul>
          </div>
          <div className={`rounded-xl border p-6 space-y-3 ${selectedNormalization === "zscore" ? "border-blue-500 bg-blue-50" : "border-gray-200"}`}>
            <h4 className="text-lg font-semibold text-blue-700">Z-Score 标准化</h4>
            <p className="text-sm text-blue-600">使特征均值为 0、方差为 1，便于梯度下降更快收敛。</p>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• 更适合存在明显波动或含离群值的特征。</li>
              <li>• 可保持不同尺度变量的相对关系。</li>
            </ul>
          </div>
        </div>
      </div>
      <div className="flex flex-wrap gap-4">
        <button
          onClick={() => handleNormalizationSelect("minmax")}
          className={`px-6 py-3 rounded-lg border-2 transition-all ${
            selectedNormalization === "minmax"
              ? "border-blue-500 bg-blue-50 text-blue-700"
              : "border-gray-200 text-gray-700 hover:border-blue-200"
          }`}
        >
          选择 Min-Max 归一化
        </button>
        <button
          onClick={() => handleNormalizationSelect("zscore")}
          className={`px-6 py-3 rounded-lg border-2 transition-all ${
            selectedNormalization === "zscore"
              ? "border-blue-500 bg-blue-50 text-blue-700"
              : "border-gray-200 text-gray-700 hover:border-blue-200"
          }`}
        >
          选择 Z-Score 标准化
        </button>
      </div>
      <p className="text-xs text-gray-500">
        推荐从 <span className="text-blue-600 font-medium">{recommendedNormalization === "minmax" ? "Min-Max" : "Z-Score"}</span> 开始，根据模型效果再进行调整。
      </p>
    </div>
  );

  const renderFeatureSelectionStep = () => {
    if (isLoadingFields) {
      return (
        <div className="bg-white border border-gray-200 rounded-xl p-6 flex flex-col items-center space-y-3">
          <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
          <p className="text-gray-600">正在加载字段列表...</p>
        </div>
      );
    }

    if (productFieldsError) {
      return (
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <h3 className="text-xl font-semibold text-red-600 mb-2">字段加载失败</h3>
          <p className="text-sm text-red-600">{productFieldsError}</p>
        </div>
      );
    }

    const rawFields = productFieldOptions ?? [];

    // 智能过滤：剔除不适合作为数值特征的字段
    const isNumericField = (fieldName: string): boolean => {
      const lowerField = fieldName.toLowerCase();

      // 排除规则：包含以下关键词的字段不适合作为特征
      const excludeKeywords = [
        // 标识符类
        '代码', 'code', 'id', '编码',
        '编号', 'number', 'no', 'num',

        // 文本类
        '名称', 'name',
        '地址', 'address',
        '描述', 'description', 'desc',
        '备注', 'remark', 'note', 'comment',

        // 分类类
        '类型', 'type', 'category',
        '状态', 'status', 'state',
        '单位', 'unit',

        // 时间类（通常已在数据中体现，不需要作为特征）
        '日期', 'date', 'time', 'datetime',
        '年份', 'year', '年',
        '月份', 'month', '月',
        '季度', 'quarter', '季',
        '日', 'day',

        // 媒体类
        '链接', 'url', 'link',
        '图片', 'image', 'img', 'picture', 'photo'
      ];

      // 如果字段名包含任何排除关键词，则过滤掉
      return !excludeKeywords.some(keyword => lowerField.includes(keyword));
    };

    const fields = rawFields.filter(isNumericField);
    const filteredCount = rawFields.length - fields.length;

    if (fields.length === 0) {
      return (
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <h3 className="text-xl font-semibold text-gray-900 mb-2">暂无可用字段</h3>
          <p className="text-sm text-gray-600">
            {rawFields.length > 0
              ? `检测到 ${rawFields.length} 个字段，但均为非数值类型（如代码、名称等），无法用于模型训练。`
              : '当前产品缺少字段信息，请联系管理员补充数据。'
            }
          </p>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        {filteredCount > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800">
              <span className="font-semibold">智能过滤</span>：已自动过滤 {filteredCount} 个非数值字段（如代码、名称等），仅显示适合建模的 {fields.length} 个数值字段。
            </p>
          </div>
        )}

        <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-3">
          <h3 className="text-xl font-semibold text-gray-900">选择预测目标字段</h3>
          <p className="text-sm text-gray-600">本实验的预测目标已固定为"销售数量"字段，该字段不会同时作为输入特征。</p>
          <select
            className="mt-2 w-full border border-gray-300 rounded-lg px-3 py-2"
            value={selectedTarget ?? ''}
            onChange={(event) => handleTargetSelect(event.target.value === '' ? null : event.target.value)}
          >
            <option value="">请选择目标字段</option>
            <option value="销售数量">销售数量</option>
          </select>
          {featureValidationAttempted && !selectedTarget && (
            <p className="text-sm text-red-600">请选择预测目标字段。</p>
          )}
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
          <h3 className="text-xl font-semibold text-gray-900">选择输入特征</h3>
          <p className="text-sm text-gray-600">勾选希望作为模型输入的历史字段，至少选择一个。已被设为预测目标的字段将自动排除在输入特征之外。</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {fields.map((field) => {
              const isTarget = selectedTarget === field;
              const isSelected = selectedFeatures.includes(field);
              return (
                <div
                  key={`feature-${field}`}
                  onClick={() => !isTarget && handleFeatureToggle(field)}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-blue-200'
                  } ${isTarget ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="text-gray-900 font-medium">{field}</div>
                    {isTarget ? (
                      <span className="text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded-full">预测目标</span>
                    ) : (
                      <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${isSelected ? 'border-blue-500 bg-blue-500' : 'border-gray-300'}`}>
                        {isSelected && <CheckCircle className="w-3 h-3 text-white" />}
                      </div>
                    )}
                  </div>
                  {isTarget && <p className="mt-2 text-xs text-blue-600">目标字段不可作为输入特征。</p>}
                </div>
              );
            })}
          </div>
          {featureValidationAttempted && selectedFeatures.length === 0 && (
            <p className="text-sm text-red-600">请至少选择一个输入特征。</p>
          )}
        </div>
      </div>
    );
  };

  const renderTrainingStep = () => (
    <div className="space-y-6">
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <h3 className="text-xl font-semibold text-gray-900 mb-4">运行模型并查看结果</h3>
        {!lstmState.completed && !isTraining && (
          <p className="text-sm text-gray-600">
            点击“开始训练并保存结果”后，模型将使用 {selectedNormalization === "minmax" ? "Min-Max" : "Z-Score"} 归一化和选定特征训练 LSTM。
          </p>
        )}

        {isTraining && (
          <div className="flex items-center space-x-3 text-blue-600 bg-blue-50 border border-blue-200 rounded-lg px-4 py-3">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>模型训练中，请稍候...</span>
          </div>
        )}

        {trainingError && !isTraining && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center space-x-3">
            <AlertTriangle className="w-5 h-5 text-red-600" />
            <div>
              <p className="text-red-800 font-semibold">训练失败</p>
              <p className="text-sm text-red-700">{trainingError}</p>
            </div>
          </div>
        )}

        {lstmState.completed && !isTraining && !trainingError && (
          <div className="space-y-4">
            <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center space-x-3">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <div>
                <p className="text-green-800 font-semibold">模型已训练完成并保存。</p>
                <p className="text-sm text-green-700">
                  归一化方式：{(lstmState.normalization ?? selectedNormalization) === "minmax" ? "Min-Max" : "Z-Score"}；预测字段：{lstmState.targetField ?? selectedTarget ?? "未设置"}；输入特征：{lstmState.features.join(', ') || "未选择"}
                </p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white border border-gray-200 rounded-lg p-4 text-center">
                <p className="text-xs text-gray-500 uppercase tracking-wide">RMSE</p>
                <p className="text-2xl font-semibold text-blue-700 mt-2">{lstmState.metrics.rmse ?? '—'}</p>
              </div>
              <div className="bg-white border border-gray-200 rounded-lg p-4 text-center">
                <p className="text-xs text-gray-500 uppercase tracking-wide">MAE</p>
                <p className="text-2xl font-semibold text-blue-700 mt-2">{lstmState.metrics.mae ?? '—'}</p>
              </div>
              <div className="bg-white border border-gray-200 rounded-lg p-4 text-center">
                <p className="text-xs text-gray-500 uppercase tracking-wide">R²</p>
                <p className="text-2xl font-semibold text-blue-700 mt-2">{lstmState.metrics.r2 ?? '—'}</p>
              </div>
            </div>
            {shouldShowFusionUnlockedNotice && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 text-sm text-blue-800">
                🎉 已完成至少两个基础模型，融合模型现已解锁！尝试组合不同算法，进一步提升预测表现。
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );

  const renderStepContent = () => {
    switch (activeStep) {
      case 1:
        return renderIntro();
      case 2:
        return renderNormalizationStep();
      case 3:
        return renderFeatureSelectionStep();
      case 4:
        return renderTrainingStep();
      default:
        return null;
    }
  };

  const nextButtonLabel = (() => {
    if (activeStep === 1) return "下一步：选择归一化";
    if (activeStep === 2) return "下一步：配置特征";
    if (activeStep === 3) return "下一步：训练模型";
    if (lstmState.completed) return "模型已保存";
    if (isTraining) return "模型训练中...";
    return "开始训练并保存结果";
  })();

  const isNextDisabled =
    (activeStep === 2 && !selectedNormalization) ||
    (activeStep === 3 && (!selectedTarget || selectedFeatures.length === 0)) ||
    (activeStep === 4 && (isTraining || Boolean(lstmState.completed)));

  return (
    <div className="bg-gray-50 rounded-xl border border-gray-200">
      <div className="border-b border-gray-200 bg-white rounded-t-xl p-6">
        <div className="flex items-center space-x-3 text-sm text-gray-500">
          <BrainCircuit className="w-5 h-5 text-blue-600" />
          <span>LSTM 模型分步指导</span>
        </div>
        <h2 className="mt-2 text-2xl font-semibold text-gray-900">LSTM 神经网络</h2>
        <p className="text-gray-600">按照向导依次完成方法了解、特征工程与模型训练。</p>
      </div>

      <div className="px-6 pt-6 pb-4 flex flex-col gap-6">
        <div className="relative">
          <div className="absolute inset-x-6 top-1/2 -translate-y-1/2 hidden md:block">
            <div className="h-1 rounded-full bg-gray-200">
              <div
                className="h-1 rounded-full bg-gradient-to-r from-blue-500 to-green-500 transition-all duration-500"
                style={{ width: `${((activeStep - 1) / (steps.length - 1)) * 100}%` }}
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {steps.map((step) => {
              const isActive = step.id === activeStep;
              const isCompleted = step.id < activeStep || (step.id === steps.length && lstmState.completed);
              return (
                <div
                  key={step.id}
                  className={`relative rounded-xl border p-5 transition-all shadow-sm text-center ${
                    isActive
                      ? "border-blue-500 bg-blue-50"
                      : isCompleted
                      ? "border-green-500 bg-green-50"
                      : "border-gray-200 bg-white"
                  }`}
                >
                  <div className="flex flex-col items-center gap-2 mb-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold leading-none ${isCompleted ? "bg-green-500 text-white" : isActive ? "bg-blue-500 text-white" : "bg-gray-200 text-gray-700"}`}>
                      {step.id}
                    </div>
                    {isCompleted && <CheckCircle className="w-4 h-4 text-green-600" />}
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">{step.title}</h3>
                  <p className="text-sm text-gray-600 leading-relaxed">{step.description}</p>
                </div>
              );
            })}
          </div>
        </div>

        {renderStepContent()}
      </div>

      <div className="bg-white border-t border-gray-200 rounded-b-xl px-6 py-4 flex justify-between items-center">
        <button
          onClick={handleBack}
          disabled={activeStep === 1}
          className="px-5 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50"
        >
          上一步
        </button>
        <button
          onClick={handleNext}
          disabled={isNextDisabled}
          className={`px-6 py-2 rounded-lg text-white whitespace-nowrap ${
            isNextDisabled
              ? "bg-gray-400 cursor-not-allowed"
              : activeStep === 4
              ? "bg-green-600 hover:bg-green-700"
              : "bg-blue-600 hover:bg-blue-700"
          }`}
        >
          {nextButtonLabel}
        </button>
      </div>
    </div>
  );
};

export default LSTMModel;
