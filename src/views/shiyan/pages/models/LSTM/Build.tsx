import React from 'react';
import { CheckCircle, Loader2, AlertTriangle } from 'lucide-react';

export interface BuildProps {
  features: string[];
  setFeatures: (features: string[]) => void;
  target: string | null;
  setTarget: (target: string | null) => void;
  error: string | null;
  isLoading: boolean;
  fieldOptions: string[];
}

const Build: React.FC<BuildProps> = ({ features, setFeatures, target, setTarget, error, isLoading, fieldOptions }) => {
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
      '状态', 'status', 'state', '单位', 'unit', '日期', 'date', 'time',
      '年份', 'year', '年', '月份', 'month', '月', '季度', 'quarter',
      '日', 'day', '链接', 'url', 'link', '图片', 'image', 'img',
    ];
    return !excludeKeywords.some(keyword => lowerField.includes(keyword));
  };

  const filteredFields = fieldOptions.filter(isNumericField);

  return (
    <div>
      <h3 className="text-lg font-semibold mb-4">LSTM - 构建模型</h3>
      <p className="mb-4">
        请选择需求预测时所使用的特征，并配置模型参数。
      </p>
      
      {isLoading ? (
        <div className="flex items-center justify-center h-full p-8">
          <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
          <p className="ml-4 text-gray-600">正在训练模型，请稍候...</p>
        </div>
      ) : (
        <div className="space-y-4">
          <div>
            <h4 className="font-semibold text-gray-800">目标字段选择</h4>
            <select
              value={target ?? ''}
              onChange={(e) => setTarget(e.target.value || null)}
              className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm"
            >
              <option value="">-- 请选择预测目标 --</option>
              {filteredFields.map(opt => <option key={opt} value={opt}>{opt}</option>)}
            </select>
          </div>

          <div>
            <h4 className="font-semibold text-gray-800">特征选择</h4>
            <div className="mt-2 space-y-1">
              {filteredFields.map(field => {
                const isDisabled = field === target;
                return (
                  <div key={field} className="flex items-center">
                    <input 
                      type="checkbox" 
                      id={`feature-${field}`}
                      className="h-4 w-4 rounded disabled:bg-gray-200" 
                      checked={features.includes(field) && !isDisabled}
                      onChange={() => handleFeatureToggle(field)}
                      disabled={isDisabled}
                    />
                    <label htmlFor={`feature-${field}`} className={`ml-2 ${isDisabled ? 'text-gray-400' : ''}`}>{field}</label>
                  </div>
                );
              })}
            </div>
          </div>

          <div>
            <h4 className="font-semibold text-gray-800">模型参数配置</h4>
            <p className="text-xs text-gray-500">（为简化操作，此处参数已预设为推荐值）</p>
            <ul className="mt-2 text-sm text-gray-600 list-disc list-inside">
              <li>LSTM 层数: 3</li>
              <li>每层隐藏单元数: 288</li>
              <li>最大训练轮数: 20</li>
            </ul>
          </div>
        </div>
      )}

      {error && (
        <div className="mt-4 flex items-center gap-2 text-sm text-red-600 bg-red-50 p-3 rounded-md">
          <AlertTriangle className="w-5 h-5" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
};

export default Build;
