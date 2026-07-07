import { X } from 'lucide-react';

interface BlankDataDialogProps {
  blankMonths: string[];
  onClose: () => void;
}

export function BlankDataDialog({ blankMonths, onClose }: BlankDataDialogProps) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 overflow-hidden">
        <div className="bg-gradient-to-r from-yellow-500 to-orange-600 px-6 py-5 flex items-center justify-between">
          <h3 className="text-2xl font-bold text-white">检测到空白数据</h3>
          <button
            onClick={onClose}
            className="text-white hover:bg-white/20 rounded-lg p-1 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
        <div className="p-6">
          <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-yellow-800 font-medium mb-2">⚠️ 重要提示</p>
            <p className="text-yellow-700 text-sm">
              系统检测到数据中存在 <strong>{blankMonths.length}</strong> 个月份的空白值（缺失数据）。
            </p>
          </div>

          <div className="mb-4 p-4 bg-gray-50 border border-gray-200 rounded-lg max-h-40 overflow-y-auto">
            <h4 className="font-semibold text-gray-900 mb-2">空白月份：</h4>
            <div className="flex flex-wrap gap-2">
              {blankMonths.map((month, index) => (
                <span
                  key={index}
                  className="inline-block px-3 py-1 bg-red-100 text-red-700 rounded-md text-sm font-medium"
                >
                  {month}
                </span>
              ))}
            </div>
          </div>

          <div className="space-y-3 mb-6">
            <h4 className="font-semibold text-gray-900">空白数据说明：</h4>
            <ul className="space-y-2 text-sm text-gray-700">
              <li className="flex items-start">
                <span className="mr-2">•</span>
                <span>空白数据可以正常导入和查看</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">•</span>
                <span>空白数据<strong>不能用于需求预测</strong></span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">•</span>
                <span>建议先进行数据清洗或填补缺失值后再进行预测分析</span>
              </li>
            </ul>
          </div>

          <button
            onClick={onClose}
            className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors"
          >
            我已了解
          </button>
        </div>
      </div>
    </div>
  );
}
