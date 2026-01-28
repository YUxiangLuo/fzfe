import React from 'react';
import type { StudentGradeOverview } from '@/views/teacher/types';
import { getProgressStatus } from '@/views/teacher/utils/gradeStatus';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

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
    if (isRejected) return '—';
    if (value === null || value === undefined) return '—';
    if (!Number.isFinite(value)) return '—';
    return `${value}%`;
  };

  const hasTopLevelData = entries.some((entry) => entry.data);
  const hasExpFlowDetails = expFlowDetails.length > 0;

  if (!hasTopLevelData && !hasExpFlowDetails) {
    return <p className="text-sm text-muted-foreground">暂无成绩构成数据。</p>;
  }

  return (
    <div className="space-y-4">
      {hasTopLevelData && (
        <div>
          <h4 className="text-sm font-semibold text-foreground mb-2">最终得分构成</h4>
          <div className="overflow-x-auto">
            <Table className="min-w-full text-sm">
              <TableHeader className="bg-muted text-muted-foreground uppercase tracking-wider text-xs">
                <TableRow>
                  <TableHead className="px-4 py-2 text-left">考核项</TableHead>
                  <TableHead className="px-4 py-2 text-right">原始分</TableHead>
                  <TableHead className="px-4 py-2 text-right">权重</TableHead>
                  <TableHead className="px-4 py-2 text-right">加权得分</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="bg-card">
                {entries.map(({ key, label, data }) => (
                  <TableRow key={key}>
                    <TableCell className="px-4 py-2 text-foreground">{label}</TableCell>
                    <TableCell className="px-4 py-2 text-right text-foreground">{renderValue(data?.score)}</TableCell>
                    <TableCell className="px-4 py-2 text-right text-foreground">{renderWeight(data?.weight)}</TableCell>
                    <TableCell className="px-4 py-2 text-right text-foreground font-medium">
                      {renderValue(data?.weighted_score)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {hasExpFlowDetails && (
        <div>
          <h4 className="text-sm font-semibold text-foreground mb-2">实验流程细分</h4>
          <div className="overflow-x-auto">
            <Table className="min-w-full text-sm">
              <TableHeader className="bg-muted text-muted-foreground uppercase tracking-wider text-xs">
                <TableRow>
                  <TableHead className="px-4 py-2 text-left">步骤</TableHead>
                  <TableHead className="px-4 py-2 text-right">原始分</TableHead>
                  <TableHead className="px-4 py-2 text-right">权重</TableHead>
                  <TableHead className="px-4 py-2 text-right">加权得分</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="bg-card">
                {expFlowDetails.map((item) => (
                  <TableRow key={item.field}>
                    <TableCell className="px-4 py-2 text-foreground">{EXP_FLOW_FIELD_LABELS[item.field] ?? item.field}</TableCell>
                    <TableCell className="px-4 py-2 text-right text-foreground">{renderValue(item.score)}</TableCell>
                    <TableCell className="px-4 py-2 text-right text-foreground">{renderWeight(item.weight)}</TableCell>
                    <TableCell className="px-4 py-2 text-right text-foreground font-medium">
                      {renderValue(item.weighted_score)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
    </div>
  );
};

export default React.memo(FinalBreakdown);
