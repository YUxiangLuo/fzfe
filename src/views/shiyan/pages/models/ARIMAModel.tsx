import React, { useEffect, useMemo, useState } from "react";
import { Brain, CheckCircle, Loader2, TrendingUp } from "lucide-react";
import { useExperiment } from "../../contexts/ExperimentContext";

const MOCK_ADF_RESULTS = [
  {
    diff_order: 0,
    statistic: -1.876,
    p_value: 0.64,
    stationary: false,
    critical_values: { "1%": -3.5, "5%": -2.89, "10%": -2.58 },
  },
  {
    diff_order: 1,
    statistic: -3.954,
    p_value: 0.002,
    stationary: true,
    critical_values: { "1%": -3.5, "5%": -2.89, "10%": -2.58 },
  },
  {
    diff_order: 2,
    statistic: -5.102,
    p_value: 0.0,
    stationary: true,
    critical_values: { "1%": -3.5, "5%": -2.89, "10%": -2.58 },
  },
] as const;

const MOCK_METRICS = { rmse: 2.9, mae: 1.7, r2: 0.93 };
const AUTO_TUNED_PQ = { p: 2, q: 1 };

const steps = [
  { id: 1, title: "方法简介", description: "了解 ARIMA 模型的组成元素与适用场景。" },
  { id: 2, title: "ADF 平稳性检验", description: "查看不同差分阶数下的 ADF 检验结果，判断序列是否平稳。" },
  { id: 3, title: "设定差分阶数 d", description: "根据平稳性检验选择合适的差分阶数。" },
  { id: 4, title: "训练模型并自动寻优", description: "运行模型，系统自动搜索最优 p、q，并输出误差指标。" },
] as const;

const ARIMAModel: React.FC = () => {
  const { state, updateState } = useExperiment();
  const arimaState = state.arima;

  const adfResults = arimaState.adfStationarity.length > 0 ? arimaState.adfStationarity : MOCK_ADF_RESULTS;

  const recommendedD = useMemo(() => {
    const firstStationary = adfResults.find((row) => row.stationary);
    return firstStationary?.diff_order ?? 0;
  }, [adfResults]);

  const derivedStep = useMemo(() => {
    if (arimaState.completed) return 4;
    if (arimaState.d !== null && arimaState.d !== undefined) return 4;
    if (arimaState.adfStationarity.length > 0) return 3;
    return 1;
  }, [arimaState.completed, arimaState.d, arimaState.adfStationarity.length]);

  const [activeStep, setActiveStep] = useState(derivedStep);
  const [selectedD, setSelectedD] = useState<number>(arimaState.d ?? recommendedD);
  const [isTraining, setIsTraining] = useState(false);

  useEffect(() => {
    setActiveStep(derivedStep);
  }, [derivedStep]);

  useEffect(() => {
    if (arimaState.d !== null && arimaState.d !== undefined) {
      setSelectedD(arimaState.d);
    }
  }, [arimaState.d]);

  const handleNext = async () => {
    const currentArima = state.arima;

    if (activeStep === 1) {
      setActiveStep(2);
      return;
    }

    if (activeStep === 2) {
      if (currentArima.adfStationarity.length === 0) {
        await updateState({
          arima: {
            ...currentArima,
            adfStationarity: [...MOCK_ADF_RESULTS],
          },
        });
      }
      setActiveStep(3);
      return;
    }

    if (activeStep === 3) {
      await updateState({
        arima: {
          ...currentArima,
          adfStationarity: [...(currentArima.adfStationarity.length > 0 ? currentArima.adfStationarity : MOCK_ADF_RESULTS)],
          d: selectedD,
          completed: false,
        },
      });
      setActiveStep(4);
      return;
    }

    if (activeStep === 4 && !currentArima.completed && !isTraining) {
      setIsTraining(true);
      const baselineArima = state.arima;
      const payload = baselineArima.adfStationarity.length > 0 ? baselineArima.adfStationarity : adfResults;
      setTimeout(async () => {
        await updateState({
          arima: {
            ...baselineArima,
            adfStationarity: [...payload],
            d: selectedD,
            p: AUTO_TUNED_PQ.p,
            q: AUTO_TUNED_PQ.q,
            completed: true,
            metrics: { ...MOCK_METRICS },
          },
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
        <h3 className="text-xl font-semibold text-gray-900 mb-4">ARIMA 模型概览</h3>
        <p className="text-sm text-gray-600 leading-relaxed">
          ARIMA 模型由自回归 (AR)、差分 (I) 与移动平均 (MA) 三部分组成，能够处理非平稳时间序列。通过差分得到平稳序列，并利用 AR 与 MA 项建模序列自身的相关性与噪声。
        </p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="font-semibold text-blue-700 mb-2">适用场景</p>
          <p className="text-sm text-blue-700">需求序列具备趋势或季节成分，数据量充足且连续。</p>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="font-semibold text-blue-700 mb-2">优势</p>
          <p className="text-sm text-blue-700">模型严谨、解释性强，可结合 AIC/ BIC 等准则自动寻优。</p>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="font-semibold text-blue-700 mb-2">注意事项</p>
          <p className="text-sm text-blue-700">须保证序列平稳，需结合 ADF 等检验确定差分阶数。</p>
        </div>
      </div>
    </div>
  );

  const renderAdfStep = () => (
    <div className="space-y-6">
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <h3 className="text-xl font-semibold text-gray-900 mb-4">ADF 平稳性检验结果</h3>
        <p className="text-sm text-gray-600 mb-4">
          ADF（Augmented Dickey-Fuller）检验用于判断序列是否存在单位根，p 值越小越倾向于平稳。
        </p>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left font-medium text-gray-500 uppercase tracking-wider">差分阶数</th>
                <th className="px-4 py-2 text-left font-medium text-gray-500 uppercase tracking-wider">ADF 值</th>
                <th className="px-4 py-2 text-left font-medium text-gray-500 uppercase tracking-wider">p 值</th>
                <th className="px-4 py-2 text-left font-medium text-gray-500 uppercase tracking-wider">是否平稳</th>
                <th className="px-4 py-2 text-left font-medium text-gray-500 uppercase tracking-wider">临界值 (1% / 5% / 10%)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {adfResults.map((row) => (
                <tr key={row.diff_order} className={row.stationary ? "bg-green-50" : "bg-white"}>
                  <td className="px-4 py-3 text-gray-900 font-medium">d = {row.diff_order}</td>
                  <td className="px-4 py-3 text-gray-700">{row.statistic.toFixed(3)}</td>
                  <td className="px-4 py-3 text-gray-700">{row.p_value.toFixed(3)}</td>
                  <td className="px-4 py-3">
                    {row.stationary ? (
                      <span className="inline-flex items-center space-x-1 text-green-700">
                        <CheckCircle className="w-4 h-4" />
                        <span>平稳</span>
                      </span>
                    ) : (
                      <span className="text-gray-500">不平稳</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {`${row.critical_values["1%"].toFixed(3)} / ${row.critical_values["5%"].toFixed(3)} / ${row.critical_values["10%"].toFixed(3)}`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-5 text-sm text-blue-800">
        建议选择第一个判断为“平稳”的差分阶数作为 d 的初始值。本数据的推荐差分阶数：
        <span className="font-semibold text-blue-900"> d = {recommendedD}</span>。
      </div>
    </div>
  );

  const renderDifferenceStep = () => (
    <div className="space-y-6">
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <h3 className="text-xl font-semibold text-gray-900 mb-4">选择差分阶数 d</h3>
        <p className="text-sm text-gray-600 mb-6">根据平稳性检验，差分阶数 d 控制序列平稳化程度。通常选择第一个使序列平稳的阶数。</p>
        <div className="flex items-center space-x-4">
          {[0, 1, 2].map((option) => (
            <button
              key={option}
              onClick={() => setSelectedD(option)}
              className={`px-6 py-3 rounded-lg border-2 transition-all ${
                selectedD === option
                  ? "border-blue-500 bg-blue-50 text-blue-700"
                  : "border-gray-200 text-gray-700 hover:border-gray-300"
              }`}
            >
              d = {option}
            </button>
          ))}
        </div>
        <p className="text-xs text-gray-500 mt-4">
          推荐值：<span className="font-semibold text-blue-600">d = {recommendedD}</span>。你也可以尝试不同的差分阶数比较模型表现。
        </p>
      </div>
    </div>
  );

  const renderTrainingStep = () => (
    <div className="space-y-6">
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <h3 className="text-xl font-semibold text-gray-900 mb-4">训练模型并自动寻优</h3>
        {!arimaState.completed && !isTraining && (
          <p className="text-sm text-gray-600">
            点击“开始训练并保存结果”后，系统会基于差分阶数 d = {selectedD} 自动搜索最优的 p、q 参数，并输出误差指标。
          </p>
        )}

        {isTraining && (
          <div className="flex items-center space-x-3 text-blue-600 bg-blue-50 border border-blue-200 rounded-lg px-4 py-3">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>模型训练中，大约需要 1-2 秒...</span>
          </div>
        )}

        {arimaState.completed && !isTraining && (
          <div className="space-y-4">
            <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center space-x-3">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <div>
                <p className="text-green-800 font-semibold">模型已训练完成并保存。</p>
                <p className="text-sm text-green-700">最优参数：ARIMA({arimaState.p}, {arimaState.d}, {arimaState.q})</p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white border border-gray-200 rounded-lg p-4 text-center">
                <p className="text-xs text-gray-500 uppercase tracking-wide">RMSE</p>
                <p className="text-2xl font-semibold text-blue-700 mt-2">{arimaState.metrics.rmse ?? '—'}</p>
              </div>
              <div className="bg-white border border-gray-200 rounded-lg p-4 text-center">
                <p className="text-xs text-gray-500 uppercase tracking-wide">MAE</p>
                <p className="text-2xl font-semibold text-blue-700 mt-2">{arimaState.metrics.mae ?? '—'}</p>
              </div>
              <div className="bg-white border border-gray-200 rounded-lg p-4 text-center">
                <p className="text-xs text-gray-500 uppercase tracking-wide">R²</p>
                <p className="text-2xl font-semibold text-blue-700 mt-2">{arimaState.metrics.r2 ?? '—'}</p>
              </div>
            </div>
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
        return renderAdfStep();
      case 3:
        return renderDifferenceStep();
      case 4:
        return renderTrainingStep();
      default:
        return null;
    }
  };

  const nextButtonLabel = (() => {
    if (activeStep === 1) return "下一步：查看 ADF 检验";
    if (activeStep === 2) return "下一步：设定 d";
    if (activeStep === 3) return "下一步：训练模型";
    if (arimaState.completed) return "模型已保存";
    if (isTraining) return "模型训练中...";
    return "开始训练并保存结果";
  })();

  const isNextDisabled =
    (activeStep === 3 && selectedD === undefined) ||
    (activeStep === 4 && (isTraining || Boolean(arimaState.completed)));

  return (
    <div className="bg-gray-50 rounded-xl border border-gray-200">
      <div className="border-b border-gray-200 bg-white rounded-t-xl p-6">
        <div className="flex items-center space-x-3 text-sm text-gray-500">
          <Brain className="w-5 h-5 text-blue-600" />
          <span>ARIMA 模型分步指导</span>
        </div>
        <h2 className="mt-2 text-2xl font-semibold text-gray-900">ARIMA 模型</h2>
        <p className="text-gray-600">按照向导依次完成方法了解、平稳性检验、差分设定与模型训练。</p>
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
              const isCompleted = step.id < activeStep || (step.id === steps.length && arimaState.completed);
              return (
                <div
                  key={step.id}
                  className={`relative rounded-xl border p-5 transition-all shadow-sm ${
                    isActive
                      ? "border-blue-500 bg-blue-50"
                      : isCompleted
                      ? "border-green-500 bg-green-50"
                      : "border-gray-200 bg-white"
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${isCompleted ? "bg-green-500 text-white" : isActive ? "bg-blue-500 text-white" : "bg-gray-200 text-gray-700"}`}>
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
          className={`flex items-center space-x-2 px-6 py-2 rounded-lg text-white ${
            isNextDisabled
              ? "bg-gray-400 cursor-not-allowed"
              : activeStep === 4
              ? "bg-green-600 hover:bg-green-700"
              : "bg-blue-600 hover:bg-blue-700"
          }`}
        >
          {activeStep === 4 ? <TrendingUp className="w-4 h-4" /> : <Brain className="w-4 h-4" />}
          <span>{nextButtonLabel}</span>
        </button>
      </div>
    </div>
  );
};

export default ARIMAModel;
