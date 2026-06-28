import React, { useMemo } from 'react';
import { Loader2, AlertTriangle } from 'lucide-react';
import { analyzeLstmFields } from './lstmFieldAnalysis';

export interface BuildProps {
  features: string[];
  setFeatures: (features: string[]) => void;
  target: string | null;
  setTarget: (target: string | null) => void;
  error: string | null;
  isLoading: boolean;
  fieldOptions: string[];
  csvData?: string[][];
  onShowLSTMMethodInfo: () => void;
}

const typeBadgeClasses: Record<string, string> = {
  数值: 'bg-green-100 text-green-700 border-green-200',
  类别: 'bg-slate-100 text-slate-700 border-slate-200',
  疑似数值: 'bg-amber-100 text-amber-700 border-amber-200',
  高基数类别: 'bg-purple-100 text-purple-700 border-purple-200',
  空字段: 'bg-red-100 text-red-700 border-red-200',
  字段: 'bg-gray-100 text-gray-600 border-gray-200',
};

const Build: React.FC<BuildProps> = ({ features, setFeatures, target, setTarget, error, isLoading, fieldOptions, csvData, onShowLSTMMethodInfo }) => {
  const handleFeatureToggle = (field: string) => {
    const newFeatures = features.includes(field)
      ? features.filter(f => f !== field)
      : [...features, field];
    setFeatures(newFeatures);
  };

  const filteredFields = useMemo(() => fieldOptions
    .map(field => field.trim())
    .filter((field, index, fields) => field.length > 0 && fields.indexOf(field) === index), [fieldOptions]);

  const fieldProfiles = useMemo(() => analyzeLstmFields(csvData, filteredFields), [csvData, filteredFields]);

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 space-y-6">
        <div>
          <h3 className="text-2xl font-bold text-gray-800 mb-4">LSTM 法 - 构建LSTM模型</h3>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center h-full p-8">
            <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
            <p className="ml-4 text-gray-600">正在训练模型，请稍候...</p>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <h4 className="font-semibold text-amber-900 mb-2">💡 特征选择技巧</h4>
                  <ul className="space-y-1 text-sm text-amber-800 leading-relaxed">
                    <li>• 优先选择与销量有业务关系、且在预测时可提前规划或预估的字段，如月份、促销强度、广告投放金额、线上搜索指数、节假日类型、天气类型。</li>
                    <li>• 字段不是越多越好。本实验样本量较小，建议先选择 5-8 个核心特征，避免噪声过多导致模型不稳定。</li>
                    <li>• 单产品实验中，行业名称、公司名称、产品名称、数量单位等字段通常几乎不变，提供的信息有限，一般不建议优先选择。</li>
                    <li>• 谨慎选择库存水平、缺货天数、退货率、客户满意度等可能在销售发生后才知道的字段，真实业务中这类字段容易造成“数据泄漏”或伪相关。</li>
                    <li>• 目标字段“销售数量”由系统固定为预测对象，不需要作为输入特征重复选择。</li>
                  </ul>
                </div>
                <div className="shrink-0 rounded-full bg-white px-3 py-1 text-xs font-medium text-amber-700 border border-amber-200">
                  当前已选 {features.length} 个特征
                </div>
              </div>
              {features.length > 8 && (
                <div className="mt-3 rounded-md bg-white border border-amber-200 px-3 py-2 text-xs text-amber-700">
                  已选择的特征较多。若训练结果波动大或预测不稳定，建议减少到少量关键特征后再对比效果。
                </div>
              )}
            </div>

            <div className="p-6 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg border border-blue-200 shadow-sm">
              <label className="block text-lg font-semibold text-gray-800 mb-4">
                请选择需求预测时所使用的特征:
              </label>
              <div className="space-y-3">
                {filteredFields.map(field => {
                  const isDisabled = field === target;
                  const profile = fieldProfiles[field];
                  const badgeClassName = typeBadgeClasses[profile?.typeLabel ?? '字段'] ?? typeBadgeClasses['字段'];
                  return (
                    <label
                      key={field}
                      htmlFor={`feature-${field}`}
                      className="flex items-start p-3 bg-white rounded-lg border-2 border-gray-200 hover:border-blue-300 transition-colors cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        id={`feature-${field}`}
                        aria-label={isDisabled ? `${field}(目标字段)` : field}
                        className="mt-1 h-5 w-5 rounded text-blue-600 focus:ring-blue-500 disabled:bg-gray-200 cursor-pointer"
                        checked={features.includes(field) && !isDisabled}
                        onChange={() => handleFeatureToggle(field)}
                        disabled={isDisabled}
                      />
                      <span
                        className={`ml-4 text-base flex-1 cursor-pointer ${isDisabled ? 'text-gray-400' : 'text-gray-800'}`}
                      >
                        <span className="flex flex-wrap items-center gap-2">
                          <span>{field}</span>
                          {isDisabled && <span className="text-xs text-gray-500">(目标字段)</span>}
                          {profile && (
                            <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${badgeClassName}`}>
                              {profile.typeLabel}
                            </span>
                          )}
                        </span>
                        {profile?.warnings.map(warning => (
                          <span key={warning} className="mt-2 flex items-start gap-1 text-xs leading-5 text-amber-700">
                            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
                            <span>{warning}</span>
                          </span>
                        ))}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 p-4 rounded-lg border border-red-200">
            <AlertTriangle className="w-5 h-5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}
      </div>

      <div>
        <button
          onClick={onShowLSTMMethodInfo}
          className="px-5 py-2 bg-gray-200 text-gray-700 font-medium rounded-md hover:bg-gray-300 transition-colors text-sm"
        >
          构建LSTM方法
        </button>
      </div>
    </div>
  );
};

export default Build;
