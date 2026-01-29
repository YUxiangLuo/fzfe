import React from 'react';
import { Table, Tag } from 'antd';
import type { StudentGradeOverview } from '../../types';
import { getProgressStatus } from '../../utils/gradeStatus';

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

    // Top level breakdown columns
    const topLevelColumns = [
        {
            title: '考核项',
            dataIndex: 'label',
            key: 'label',
        },
        {
            title: '原始分',
            dataIndex: 'score',
            key: 'score',
            align: 'right' as const,
            render: (_: any, record: any) => renderValue(record.data?.score),
        },
        {
            title: '权重',
            dataIndex: 'weight',
            key: 'weight',
            align: 'right' as const,
            render: (_: any, record: any) => renderWeight(record.data?.weight),
        },
        {
            title: '加权得分',
            dataIndex: 'weighted_score',
            key: 'weighted_score',
            align: 'right' as const,
            render: (_: any, record: any) => (
                <strong>{renderValue(record.data?.weighted_score)}</strong>
            ),
        },
    ];

    // Exp flow details columns
    const expFlowColumns = [
        {
            title: '步骤',
            dataIndex: 'field',
            key: 'field',
            render: (field: string) => EXP_FLOW_FIELD_LABELS[field] ?? field,
        },
        {
            title: '原始分',
            dataIndex: 'score',
            key: 'score',
            align: 'right' as const,
            render: (value: number | null) => renderValue(value),
        },
        {
            title: '权重',
            dataIndex: 'weight',
            key: 'weight',
            align: 'right' as const,
            render: (value: number) => renderWeight(value),
        },
        {
            title: '加权得分',
            dataIndex: 'weighted_score',
            key: 'weighted_score',
            align: 'right' as const,
            render: (value: number | null) => <strong>{renderValue(value)}</strong>,
        },
    ];

    if (!hasTopLevelData && !hasExpFlowDetails) {
        return <p style={{ color: '#999' }}>暂无成绩构成数据。</p>;
    }

    return (
        <div style={{ padding: '16px 0' }}>
            {hasTopLevelData && (
                <div style={{ marginBottom: 24 }}>
                    <h4 style={{ marginBottom: 12, fontWeight: 600 }}>最终得分构成</h4>
                    <Table
                        dataSource={entries}
                        columns={topLevelColumns}
                        rowKey="key"
                        pagination={false}
                        size="small"
                        bordered
                    />
                </div>
            )}

            {hasExpFlowDetails && (
                <div>
                    <h4 style={{ marginBottom: 12, fontWeight: 600 }}>实验流程细分</h4>
                    <Table
                        dataSource={expFlowDetails}
                        columns={expFlowColumns}
                        rowKey="field"
                        pagination={false}
                        size="small"
                        bordered
                    />
                </div>
            )}
        </div>
    );
};

export default React.memo(FinalBreakdown);
