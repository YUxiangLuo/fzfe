import React, { useEffect, useMemo, useState } from 'react';
import {
    Card,
    Form,
    InputNumber,
    Button,
    Space,
    Select,
    message,
    Spin,
    Alert,
    Typography,
    Progress,
    Row,
    Col,
    Divider,
    Tooltip
} from 'antd';
import {
    SaveOutlined,
    ReloadOutlined,
    InfoCircleOutlined
} from '@ant-design/icons';
import { apiClient } from '../../../../utils/apiClient';
import type { Class, GradeWeights as GradeWeightsApi } from '../../types';
import { isAbortError, getErrorMessage } from '../../utils/error';
import { listManagedClasses } from '../../utils/portalApi';
import { useAcademicTerm } from '../../contexts/AcademicTermContext';

const { Title, Text } = Typography;

type FlowKey =
    | 'exp_flow_demand_data_preparation'
    | 'exp_flow_demand_descriptive_stats'
    | 'exp_flow_demand_model_selection'
    | 'exp_flow_demand_generate_results'
    | 'exp_flow_production_inventory_calc'
    | 'exp_flow_production_service_level'
    | 'exp_flow_production_variable_calc'
    | 'exp_flow_production_plan_creation'
    | 'exp_flow_report_submission';

type TopLevelKey = 'exp_flow_weight' | 'knowledge_test_weight' | 'model_quality_weight' | 'report_quality_weight';

interface FlowItem {
    key: FlowKey;
    label: string;
}

interface TopLevelItem {
    key: TopLevelKey;
    label: string;
    color: string;
}

const FLOW_ITEMS: FlowItem[] = [
    { key: 'exp_flow_demand_data_preparation', label: '需求预测 - 数据准备' },
    { key: 'exp_flow_demand_descriptive_stats', label: '需求预测 - 描述性统计' },
    { key: 'exp_flow_demand_model_selection', label: '需求预测 - 模型选择' },
    { key: 'exp_flow_demand_generate_results', label: '需求预测 - 结果生成' },
    { key: 'exp_flow_production_inventory_calc', label: '生产计划 - 库存计算' },
    { key: 'exp_flow_production_service_level', label: '生产计划 - 服务水平' },
    { key: 'exp_flow_production_variable_calc', label: '生产计划 - 变量计算' },
    { key: 'exp_flow_production_plan_creation', label: '生产计划 - 计划创建' },
    { key: 'exp_flow_report_submission', label: '报告提交' },
];

const TOP_LEVEL_ITEMS: TopLevelItem[] = [
    { key: 'exp_flow_weight', label: '实验流程', color: '#1890ff' },
    { key: 'knowledge_test_weight', label: '知识点测试', color: '#52c41a' },
    { key: 'model_quality_weight', label: '模型选择', color: '#faad14' },
    { key: 'report_quality_weight', label: '实验报告', color: '#eb2f96' },
];

const DEFAULT_WEIGHTS: GradeWeightsApi = {
    exp_flow_weight: 40,
    exp_flow_demand_data_preparation: 5,
    exp_flow_demand_descriptive_stats: 5,
    exp_flow_demand_model_selection: 10,
    exp_flow_demand_generate_results: 10,
    exp_flow_production_inventory_calc: 10,
    exp_flow_production_service_level: 5,
    exp_flow_production_variable_calc: 5,
    exp_flow_production_plan_creation: 15,
    exp_flow_report_submission: 35,
    knowledge_test_weight: 20,
    model_quality_weight: 20,
    report_quality_weight: 20,
};

const GradeWeights: React.FC = () => {
    const { selectedTerm, isLoadingTerms } = useAcademicTerm();
    const [classes, setClasses] = useState<Class[]>([]);
    const [selectedClassId, setSelectedClassId] = useState<string>('');
    const [weights, setWeights] = useState<GradeWeightsApi>(DEFAULT_WEIGHTS);
    const [isLoadingClasses, setIsLoadingClasses] = useState(true);
    const [isLoadingWeights, setIsLoadingWeights] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Fetch classes
    useEffect(() => {
        if (isLoadingTerms) return;
        const controller = new AbortController();

        const fetchClasses = async () => {
            setIsLoadingClasses(true);
            try {
                const data = await listManagedClasses({ signal: controller.signal, academicTerm: selectedTerm });
                if (controller.signal.aborted) return;
                const classList = data || [];
                setClasses(classList);
                const firstClass = classList[0];
                setSelectedClassId(firstClass ? String(firstClass.class_id) : '');
                if (!firstClass) setWeights(DEFAULT_WEIGHTS);
            } catch (err: unknown) {
                if (isAbortError(err)) return;
                if (!controller.signal.aborted) {
                    setError(getErrorMessage(err, '获取班级列表失败'));
                }
            } finally {
                if (!controller.signal.aborted) {
                    setIsLoadingClasses(false);
                }
            }
        };

        fetchClasses();
        return () => { controller.abort(); };
    }, [isLoadingTerms, selectedTerm]);

    // Fetch weights
    useEffect(() => {
        if (!selectedClassId) return;

        const controller = new AbortController();

        const fetchWeights = async () => {
            setIsLoadingWeights(true);
            setError(null);
            try {
                const data = await apiClient.get(`/classes/${selectedClassId}/grading-policy`, { signal: controller.signal });
                if (controller.signal.aborted) return;
                setWeights(data || DEFAULT_WEIGHTS);
            } catch (err: unknown) {
                if (isAbortError(err)) return;
                if (!controller.signal.aborted) {
                    setWeights(DEFAULT_WEIGHTS);
                }
            } finally {
                if (!controller.signal.aborted) {
                    setIsLoadingWeights(false);
                }
            }
        };

        fetchWeights();
        return () => { controller.abort(); };
    }, [selectedClassId]);

    // Calculate totals
    const topLevelTotal = useMemo(() => {
        return TOP_LEVEL_ITEMS.reduce((sum, item) => sum + (weights[item.key] || 0), 0);
    }, [weights]);

    const flowDetailTotal = useMemo(() => {
        return FLOW_ITEMS.reduce((sum, item) => sum + (weights[item.key] || 0), 0);
    }, [weights]);

    // Handle weight change
    const handleTopLevelChange = (key: TopLevelKey, value: number | null) => {
        setWeights(prev => ({ ...prev, [key]: value || 0 }));
    };

    const handleFlowChange = (key: FlowKey, value: number | null) => {
        setWeights(prev => ({ ...prev, [key]: value || 0 }));
    };

    // Reset to defaults
    const resetToDefaults = () => {
        setWeights(DEFAULT_WEIGHTS);
        message.info('已恢复默认权重');
    };

    // Save weights
    const saveWeights = async () => {
        if (!selectedClassId) {
            message.warning('请先选择班级');
            return;
        }

        if (topLevelTotal !== 100) {
            message.error('顶层权重总和必须为 100%');
            return;
        }

        if (flowDetailTotal !== 100) {
            message.error('流程细节权重总和必须为 100%');
            return;
        }

        setIsSaving(true);
        try {
            const endpoint = `/classes/${selectedClassId}/grading-policy`;
            await apiClient.put(endpoint, weights);
            message.success('权重保存成功');
        } catch (err: unknown) {
            message.error(getErrorMessage(err, '保存失败'));
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoadingClasses) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 300 }}>
                <Spin size="large">
                    <div style={{ padding: 50, textAlign: 'center' }}>加载中...</div>
                </Spin>
            </div>
        );
    }

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <Title level={3} style={{ marginBottom: 0 }}>成绩权重设置</Title>
                <Space>
                    <Button icon={<ReloadOutlined />} onClick={resetToDefaults}>恢复默认</Button>
                    <Button type="primary" icon={<SaveOutlined />} onClick={saveWeights} loading={isSaving}>
                        保存设置
                    </Button>
                </Space>
            </div>

            {/* Class selector */}
            <Card style={{ marginBottom: 16 }}>
                <Space>
                    <Text strong>选择班级：</Text>
                    <Select
                        value={selectedClassId}
                        onChange={setSelectedClassId}
                        style={{ width: 200 }}
                        placeholder="请选择班级"
                        loading={isLoadingClasses}
                        options={classes.map(c => ({ value: String(c.class_id), label: c.class_name }))}
                    />
                </Space>
            </Card>

            {error && <Alert description={error} type="error" showIcon style={{ marginBottom: 16 }} />}

            <Spin spinning={isLoadingWeights}>
                {/* Top Level Weights */}
                <Card title="顶层权重" style={{ marginBottom: 16 }}>
                    <Alert
                        message={`总计：${topLevelTotal}%`}
                        type={topLevelTotal === 100 ? 'success' : 'warning'}
                        showIcon
                        style={{ marginBottom: 16 }}
                    />
                    <Row gutter={[16, 16]}>
                        {TOP_LEVEL_ITEMS.map(item => (
                            <Col span={6} key={item.key}>
                                <Card size="small" style={{ borderTop: `3px solid ${item.color}` }}>
                                    <div style={{ marginBottom: 8 }}>
                                        <Text strong>{item.label}</Text>
                                    </div>
                                    <InputNumber
                                        min={0}
                                        max={100}
                                        value={weights[item.key]}
                                        onChange={(val) => handleTopLevelChange(item.key, val)}
                                        addonAfter="%"
                                        style={{ width: '100%' }}
                                    />
                                    <Progress
                                        percent={weights[item.key]}
                                        strokeColor={item.color}
                                        showInfo={false}
                                        style={{ marginTop: 8 }}
                                    />
                                </Card>
                            </Col>
                        ))}
                    </Row>
                </Card>

                {/* Flow Detail Weights */}
                <Card
                    title={
                        <Space>
                            <span>实验流程细节权重</span>
                            <Tooltip title="占实验流程总分的百分比">
                                <InfoCircleOutlined />
                            </Tooltip>
                        </Space>
                    }
                >
                    <Alert
                        message={`总计：${flowDetailTotal}%`}
                        type={flowDetailTotal === 100 ? 'success' : 'warning'}
                        showIcon
                        style={{ marginBottom: 16 }}
                    />
                    <Row gutter={[16, 16]}>
                        {FLOW_ITEMS.map(item => (
                            <Col span={8} key={item.key}>
                                <Card size="small">
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                                        <Text>{item.label}</Text>
                                        <InputNumber
                                            min={0}
                                            max={100}
                                            value={weights[item.key]}
                                            onChange={(val) => handleFlowChange(item.key, val)}
                                            addonAfter="%"
                                            style={{ width: 100 }}
                                        />
                                    </div>
                                    <Progress
                                        percent={weights[item.key]}
                                        strokeColor="#1890ff"
                                        showInfo={false}
                                    />
                                </Card>
                            </Col>
                        ))}
                    </Row>
                </Card>
            </Spin>
        </div>
    );
};

export default GradeWeights;
