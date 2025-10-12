import React, { useEffect, useMemo, useRef, useState } from "react";
import { BrainCircuit, CheckCircle, Loader2 } from "lucide-react";
import { useExperiment, type ModelMetrics } from "../../contexts/ExperimentContext";

const MOCK_METRICS = { rmse: 3.2, mae: 1.6, r2: 0.95 };
const AVAILABLE_FEATURES = [
  { id: "sales_quantity", name: "销售数量", description: "历史月度销量数据（必选）", required: true },
  { id: "price", name: "价格", description: "产品历史平均售价" },
  { id: "promotion", name: "促销活动", description: "促销强度或二元促销标识" },
  { id: "inventory", name: "库存水平", description: "期末库存量" },
  { id: "weather", name: "天气指数", description: "气候相关变量" },
];

const steps = [
  { id: 1, title: "方法简介", description: "了解 LSTM 神经网络的核心思想与应用价值。" },
  { id: 2, title: "选择归一化方式", description: "了解 Min-Max 与 Z-Score 的差异，并选择适合的归一化方法。" },
  { id: 3, title: "配置输入特征", description: "勾选用于训练的输入特征，至少保留销售数量。" },
  { id: 4, title: "训练并查看指标", description: "运行 LSTM 模型，查看 RMSE、MAE 与 R² 指标。" },
] as const;

const LSTMModel: React.FC = () => {
  const { state, updateState } = useExperiment();
  const lstmState = {
    completed: state.lstm_completed,
    normalization: state.lstm_normalization,
    features: state.lstm_features,
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
    if (lstmState.features.length > 0) return 3;
    if (lstmState.normalization) return 2;
    return 1;
  }, [lstmState.completed, lstmState.features.length, lstmState.normalization]);

  const [activeStep, setActiveStep] = useState(derivedStep);
  const [selectedNormalization, setSelectedNormalization] = useState<"minmax" | "zscore">(
    lstmState.normalization ?? "minmax",
  );
  const [selectedFeatures, setSelectedFeatures] = useState<string[]>(
    lstmState.features.length > 0 ? lstmState.features : ["sales_quantity"],
  );
  const [isTraining, setIsTraining] = useState(false);
  const normalizationUpdateTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const featuresUpdateTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

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
    highest_completed_step: Math.min(state.highest_completed_step ?? 0, 4),
    current_step: Math.min(state.current_step ?? 5, 5),
  });

  useEffect(() => {
    setActiveStep(derivedStep);
  }, [derivedStep]);

  useEffect(() => {
    if (lstmState.normalization) {
      setSelectedNormalization(lstmState.normalization);
    }
    if (lstmState.features.length > 0) {
      setSelectedFeatures(lstmState.features);
    }
  }, [lstmState.features, lstmState.normalization]);

  useEffect(() => {
    return () => {
      if (normalizationUpdateTimer.current) {
        clearTimeout(normalizationUpdateTimer.current);
      }
      if (featuresUpdateTimer.current) {
        clearTimeout(featuresUpdateTimer.current);
      }
    };
  }, []);

  const recommendedNormalization = useMemo(() => "minmax", []);

  const arraysEqual = (a: string[], b: string[]): boolean => {
    if (a.length !== b.length) return false;
    const sortedA = [...a].sort();
    const sortedB = [...b].sort();
    return sortedA.every((value, index) => value === sortedB[index]);
  };

  const commitNormalizationUpdate = async (value: "minmax" | "zscore") => {
    const storedNormalization = state.lstm_normalization;
    if (storedNormalization === value) {
      return;
    }
    await updateState({
      lstm_normalization: value,
      lstm_completed: false,
      lstm_metrics_rmse: null,
      lstm_metrics_mae: null,
      lstm_metrics_r2: null,
      ...buildDownstreamReset(),
    });
  };

  const commitFeaturesUpdate = async (features: string[]) => {
    const normalized = ensureSalesFeature(features);
    const storedFeatures = ensureSalesFeature(state.lstm_features ?? []);

    if (arraysEqual(normalized, storedFeatures)) {
      return;
    }

    await updateState({
      lstm_features: normalized,
      lstm_completed: false,
      lstm_metrics_rmse: null,
      lstm_metrics_mae: null,
      lstm_metrics_r2: null,
      ...buildDownstreamReset(),
    });
  };

  const scheduleNormalizationUpdate = (value: "minmax" | "zscore") => {
    if (normalizationUpdateTimer.current) {
      clearTimeout(normalizationUpdateTimer.current);
    }
    normalizationUpdateTimer.current = setTimeout(() => {
      normalizationUpdateTimer.current = null;
      void commitNormalizationUpdate(value);
    }, 300);
  };

  const scheduleFeaturesUpdate = (features: string[]) => {
    if (featuresUpdateTimer.current) {
      clearTimeout(featuresUpdateTimer.current);
    }
    featuresUpdateTimer.current = setTimeout(() => {
      featuresUpdateTimer.current = null;
      void commitFeaturesUpdate(features);
    }, 300);
  };

  const handleNormalizationSelect = (value: "minmax" | "zscore") => {
    if (value === selectedNormalization) return;
    setSelectedNormalization(value);
    scheduleNormalizationUpdate(value);
  };

  const handleFeatureToggle = (featureId: string) => {
    const target = AVAILABLE_FEATURES.find((f) => f.id === featureId);
    if (target?.required) return;
    setSelectedFeatures((prev) => {
      const next = prev.includes(featureId)
        ? prev.filter((id) => id !== featureId)
        : [...prev, featureId];
      const ensured = ensureSalesFeature(next);
      scheduleFeaturesUpdate(ensured);
      return ensured;
    });
  };

  const ensureSalesFeature = (features: string[]): string[] =>
    features.includes("sales_quantity") ? features : ["sales_quantity", ...features];

  const handleNext = async () => {
    if (activeStep === 1) {
      setActiveStep(2);
      return;
    }

    if (activeStep === 2) {
      if (normalizationUpdateTimer.current) {
        clearTimeout(normalizationUpdateTimer.current);
        normalizationUpdateTimer.current = null;
        await commitNormalizationUpdate(selectedNormalization);
      } else {
        await commitNormalizationUpdate(selectedNormalization);
      }
      setActiveStep(3);
      return;
    }

    if (activeStep === 3) {
      const featuresToSave = ensureSalesFeature(selectedFeatures);
      setSelectedFeatures(featuresToSave);
      if (featuresUpdateTimer.current) {
        clearTimeout(featuresUpdateTimer.current);
        featuresUpdateTimer.current = null;
        await commitFeaturesUpdate(featuresToSave);
      } else {
        await commitFeaturesUpdate(featuresToSave);
      }
      setActiveStep(4);
      return;
    }

    if (activeStep === 4 && !lstmState.completed && !isTraining) {
      if (normalizationUpdateTimer.current) {
        clearTimeout(normalizationUpdateTimer.current);
        normalizationUpdateTimer.current = null;
        await commitNormalizationUpdate(selectedNormalization);
      }
      const featuresToSave = ensureSalesFeature(selectedFeatures);
      setSelectedFeatures(featuresToSave);
      if (featuresUpdateTimer.current) {
        clearTimeout(featuresUpdateTimer.current);
        featuresUpdateTimer.current = null;
        await commitFeaturesUpdate(featuresToSave);
      } else {
        await commitFeaturesUpdate(featuresToSave);
      }

      setIsTraining(true);
      setTimeout(async () => {
        await updateState({
          lstm_normalization: selectedNormalization,
          lstm_features: featuresToSave,
          lstm_completed: true,
          lstm_metrics_rmse: MOCK_METRICS.rmse,
          lstm_metrics_mae: MOCK_METRICS.mae,
          lstm_metrics_r2: MOCK_METRICS.r2,
        });
        setIsTraining(false);
      }, 1500);
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

  const renderFeatureSelectionStep = () => (
    <div className="space-y-6">
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <h3 className="text-xl font-semibold text-gray-900 mb-4">选择输入特征</h3>
        <p className="text-sm text-gray-600 mb-6">
          至少包含 <span className="font-medium text-gray-800">销售数量</span> 作为主要输入，可结合价格、促销等外生变量提升模型表现。
        </p>
        <div className="space-y-4">
          {AVAILABLE_FEATURES.map((feature) => {
            const isSelected = selectedFeatures.includes(feature.id);
            return (
              <div
                key={feature.id}
                onClick={() => handleFeatureToggle(feature.id)}
                className={`p-4 rounded-lg border-2 transition-all ${
                  isSelected ? "border-blue-500 bg-blue-50" : "border-gray-200 hover:border-blue-200"
                } ${feature.required ? "cursor-default" : "cursor-pointer"}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${isSelected ? "border-blue-500 bg-blue-500" : "border-gray-300"}`}>
                      {isSelected && <CheckCircle className="w-3 h-3 text-white" />}
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900">{feature.name}</h4>
                      <p className="text-sm text-gray-600">{feature.description}</p>
                    </div>
                  </div>
                  {feature.required && <span className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded-full">必选</span>}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );

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
            <span>模型训练中，大约需要 1-2 秒...</span>
          </div>
        )}

        {lstmState.completed && !isTraining && (
          <div className="space-y-4">
            <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center space-x-3">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <div>
                <p className="text-green-800 font-semibold">模型已训练完成并保存。</p>
                <p className="text-sm text-green-700">
                  归一化方式：{(lstmState.normalization ?? selectedNormalization) === "minmax" ? "Min-Max" : "Z-Score"}；输入特征：{lstmState.features.join(', ')}
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
    (activeStep === 3 && selectedFeatures.length === 0) ||
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
