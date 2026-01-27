import React from 'react';
import type { StudentGradeOverview } from '@/views/teacher/types';
import { getProgressStatus } from '@/views/teacher/utils/gradeStatus';

const FINAL_BREAKDOWN_LABELS: Record<'exp_flow' | 'knowledge_test' | 'model_quality' | 'report_quality', string> = {
  exp_flow: '实验流程',
  knowledge_test: '知识点测试',
  model_quality: '模型选择',
  report_quality: '实验报告',
};

const EXP_FLOW_FIELD_LABELS: Record<string, string> = {
  exp_flow_demand_data_preparation: '需求预测 - 数据准备',
  exp_flow_demand_descriptive_stats: '需求预测 - 描述性统计',
  exp_flow_demand_model_selection: '需求预测 - 模型选择',
  exp_flow_demand_generate_results: '需求预测 - 生成预测结果',
  exp_flow_production_inventory_calc: '生产计划 - 库存变量计算',
  exp_flow_production_service_level: '生产计划 - 服务水平计算',
  exp_flow_production_variable_calc: '生产计划 - 生产变量计算',
  exp_flow_production_plan_creation: '生产计划 - 制定计划',
  exp_flow_report_submission: '提交实验报告',
};

interface FinalBreakdownProps {
  grade: StudentGradeOverview;
}

const FinalBreakdown: React.FC<FinalBreakdownProps> = ({ grade }) => {
  const breakdown = grade.final_score_breakdown;
  const entries = Object.entries(FINAL_BREAKDOWN_LABELS).map(([key, label]) => {
    const data = breakdown?.[key as keyof typeof breakdown];
    return { key, label, data };
  });

  const expFlowDetails = grade.exp_flow_breakdown ?? [];
  const status = getProgressStatus(grade);
  const isRejected = status === 'rejected';

  const renderValue = (value: number | null | undefined) => {
    if (isRejected) return '—';
    if (value === null || value === undefined) return '—';
    return Number.isFinite(value) ? value.toFixed(2) : '—';
  };

  const renderWeight = (value: number | null | undefined) => {
    if (value === null || value === undefined) return '—';
    return `${value}%`;
  };

  const hasTopLevelData = entries.some((entry) => entry.data);
  const hasExpFlowDetails = expFlowDetails.length > 0;

  if (!hasTopLevelData && !hasExpFlowDetails) {
    return <p className="text-sm text-gray-500">暂无成绩构成数据。</p>;
  }

  return (
    <div className="space-y-4">
      {hasTopLevelData && (
        <div>
          <h4 className="text-sm font-semibold text-gray-900 mb-2">最终得分构成</h4>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-100 text-gray-600 uppercase tracking-wider text-xs">
                <tr>
                  <th className="px-4 py-2 text-left">考核项</th>
                  <th className="px-4 py-2 text-right">原始分</th>
                  <th className="px-4 py-2 text-right">权重</th>
                  <th className="px-4 py-2 text-right">加权得分</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {entries.map(({ key, label, data }) => (
                  <tr key={key}>
                    <td className="px-4 py-2 text-gray-800">{label}</td>
                    <td className="px-4 py-2 text-right text-gray-700">{renderValue(data?.score)}</td>
                    <td className="px-4 py-2 text-right text-gray-700">{renderWeight(data?.weight)}</td>
                    <td className="px-4 py-2 text-right text-gray-900 font-medium">
                      {renderValue(data?.weighted_score)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {hasExpFlowDetails && (
        <div>
          <h4 className="text-sm font-semibold text-gray-900 mb-2">实验流程细分</h4>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-100 text-gray-600 uppercase tracking-wider text-xs">
                <tr>
                  <th className="px-4 py-2 text-left">步骤</th>
                  <th className="px-4 py-2 text-right">原始分</th>
                  <th className="px-4 py-2 text-right">权重</th>
                  <th className="px-4 py-2 text-right">加权得分</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {expFlowDetails.map((item) => (
                  <tr key={item.field}>
                    <td className="px-4 py-2 text-gray-800">{EXP_FLOW_FIELD_LABELS[item.field] ?? item.field}</td>
                    <td className="px-4 py-2 text-right text-gray-700">{renderValue(item.score)}</td>
                    <td className="px-4 py-2 text-right text-gray-700">{renderWeight(item.weight)}</td>
                    <td className="px-4 py-2 text-right text-gray-900 font-medium">
                      {renderValue(item.weighted_score)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default React.memo(FinalBreakdown);
