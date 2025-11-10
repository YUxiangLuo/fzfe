import React from 'react';

interface ReportCardProps {
  icon: React.ReactNode;
  title: string;
  analysisKey: string;
  children: React.ReactNode;
  getAnalysisValue: (key: string) => string;
  getAnalysisSetter: (key: string) => (value: string) => void;
  isSubmitting: boolean;
}

export const ReportCard: React.FC<ReportCardProps> = ({
  icon,
  title,
  analysisKey,
  children,
  getAnalysisValue,
  getAnalysisSetter,
  isSubmitting,
}) => (
  <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
    <div className="p-6 border-b border-gray-200 bg-gray-50/50">
      <h2 className="text-xl font-semibold text-gray-800 flex items-center">
        {icon}
        <span className="ml-3">{title}</span>
      </h2>
    </div>
    <div className="p-6 space-y-6">
      {children}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          结果分析<span className="text-red-500 ml-1">*</span>
        </label>
        <textarea
          value={getAnalysisValue(analysisKey)}
          onChange={(e) => getAnalysisSetter(analysisKey)(e.target.value)}
          placeholder="请根据上述实验结果展开具体分析..."
          className="w-full min-h-[120px] p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 resize-y text-sm"
          disabled={isSubmitting}
        />
      </div>
    </div>
  </div>
);
