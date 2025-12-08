import React from 'react';
import { Loader2, AlertTriangle } from 'lucide-react';

export interface BuildProps {
  features: string[];
  setFeatures: (features: string[]) => void;
  target: string | null;
  error: string | null;
  isLoading: boolean;
  fieldOptions: string[];
  onShowLSTMMethodInfo: () => void;
}

const Build: React.FC<BuildProps> = ({ features, setFeatures, target, error, isLoading, fieldOptions, onShowLSTMMethodInfo }) => {
  const handleFeatureToggle = (field: string) => {
    const newFeatures = features.includes(field)
      ? features.filter(f => f !== field)
      : [...features, field];
    setFeatures(newFeatures);
  };

  // Intelligent filtering logic from the old component
  const isNumericField = (fieldName: string): boolean => {
    const lowerField = fieldName.toLowerCase();
    const excludeKeywords = [
      '代码', 'code', 'id', '编码', '编号', 'number', 'no', 'num',
      '名称', 'name', '地址', 'address', '描述', 'description', 'desc',
      '备注', 'remark', 'note', 'comment', '类型', 'type', 'category',
      '状态', 'status', 'state', '单位', 'unit',
      '链接', 'url', 'link', '图片', 'image', 'img',
    ];
    return !excludeKeywords.some(keyword => lowerField.includes(keyword));
  };

  const filteredFields = fieldOptions.filter(isNumericField);

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
            <div className="p-6 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg border border-blue-200 shadow-sm">
              <label className="block text-lg font-semibold text-gray-800 mb-4">
                请选择需求预测时所使用的特征:
              </label>
              <div className="space-y-3">
                {filteredFields.map(field => {
                  const isDisabled = field === target;
                  return (
                    <label
                      key={field}
                      htmlFor={`feature-${field}`}
                      className="flex items-center p-3 bg-white rounded-lg border-2 border-gray-200 hover:border-blue-300 transition-colors cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        id={`feature-${field}`}
                        className="h-5 w-5 rounded text-blue-600 focus:ring-blue-500 disabled:bg-gray-200 cursor-pointer"
                        checked={features.includes(field) && !isDisabled}
                        onChange={() => handleFeatureToggle(field)}
                        disabled={isDisabled}
                      />
                      <span
                        className={`ml-4 text-base flex-1 cursor-pointer ${isDisabled ? 'text-gray-400' : 'text-gray-800'}`}
                      >
                        {field}
                        {isDisabled && <span className="ml-2 text-xs text-gray-500">(目标字段)</span>}
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
