import React, { useEffect, useMemo, useState } from 'react';
import {
    Card,
    Table,
    Select,
    Input,
    Progress,
    Tag,
    Spin,
    Alert,
    Typography,
    Space,
    Statistic,
    Row,
    Col,
    Timeline
} from 'antd';
import {
    SearchOutlined,
    TeamOutlined,
    CheckCircleOutlined,
    SyncOutlined,
    ClockCircleOutlined,
    PlayCircleOutlined
} from '@ant-design/icons';
import { apiClient } from '../../../../utils/apiClient';
import type { Class, StudentExperimentProgress as ProgressType } from '../../types';
import { formatDateTime } from '../../utils/format';
import { isAbortError, getErrorMessage } from '../../utils/error';
import { listManagedClasses } from '../../utils/portalApi';
import { compareProgressStatus, normalizeProgressStatus } from '../../utils/sort';

const { Title, Text } = Typography;

// Search debounce delay (ms)
const SEARCH_DEBOUNCE_DELAY = 300;

const STEP_LABELS = [
    { id: 'industry_selection', label: '选择行业', order: 1 },
    { id: 'company_selection', label: '选择企业', order: 2 },
    { id: 'product_selection', label: '选择产品', order: 3 },
    { id: 'data_analysis', label: '历史数据', order: 4 },
    { id: 'model_building', label: '预测模型', order: 5 },
    { id: 'result_evaluation', label: '结果评估', order: 6 },
    { id: 'production_planning', label: '生产计划', order: 7 },
];

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
    'Completed': { label: '已完成', color: 'success', icon: <CheckCircleOutlined /> },
    'In Progress': { label: '进行中', color: 'processing', icon: <SyncOutlined spin /> },
    'Not Started': { label: '未开始', color: 'default', icon: <ClockCircleOutlined /> },
};

const TOTAL_STEPS = STEP_LABELS.length;

const clampCompletedStepCount = (value: number | null | undefined) => {
    const numericValue = Number(value ?? 0);
    if (!Number.isFinite(numericValue)) return 0;
    return Math.min(Math.max(Math.floor(numericValue), 0), TOTAL_STEPS);
};

const getCompletionMeta = (student: ProgressType) => {
    const completedSteps = clampCompletedStepCount(student.highest_completed_step);
    const completionPercent = Math.round((completedSteps / TOTAL_STEPS) * 100);
    return { completedSteps, totalSteps: TOTAL_STEPS, completionPercent };
};

const ExperimentProgress: React.FC = () => {
    const [classes, setClasses] = useState<Class[]>([]);
    const [progressData, setProgressData] = useState<ProgressType[]>([]);
    const [selectedClassId, setSelectedClassId] = useState<string>('');
    const [searchTerm, setSearchTerm] = useState('');
    const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
    const [isLoadingClasses, setIsLoadingClasses] = useState(true);
    const [isLoadingProgress, setIsLoadingProgress] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [expandedRows, setExpandedRows] = useState<number[]>([]);

    // Debounced search
    useEffect(() => {
        const handler = window.setTimeout(() => {
            setDebouncedSearchTerm(searchTerm.trim());
        }, SEARCH_DEBOUNCE_DELAY);

        return () => {
            window.clearTimeout(handler);
        };
    }, [searchTerm]);

    // Fetch classes
    useEffect(() => {
        const controller = new AbortController();

        const fetchClasses = async () => {
            setIsLoadingClasses(true);
            try {
                const data = await listManagedClasses({ signal: controller.signal });
                if (controller.signal.aborted) return;
                const classList = data || [];
                setClasses(classList);
                const firstClass = classList[0];
                if (firstClass) {
                    setSelectedClassId(String(firstClass.class_id));
                }
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
    }, []);

    // Fetch progress data
    useEffect(() => {
        if (!selectedClassId) return;

        const controller = new AbortController();

        const fetchProgress = async () => {
            setIsLoadingProgress(true);
            setError(null);
            try {
                const data = await apiClient.get(`/classes/${selectedClassId}/experiment-events`, { signal: controller.signal });
                if (controller.signal.aborted) return;
                setProgressData(data || []);
            } catch (err: unknown) {
                if (isAbortError(err)) return;
                if (!controller.signal.aborted) {
                    setError(getErrorMessage(err, '获取进度数据失败'));
                    setProgressData([]);
                }
            } finally {
                if (!controller.signal.aborted) {
                    setIsLoadingProgress(false);
                }
            }
        };

        fetchProgress();
        return () => { controller.abort(); };
    }, [selectedClassId]);

    // Filter students by search (using debounced value)
    const filteredProgress = useMemo(() => {
        if (!debouncedSearchTerm) return progressData;
        const query = debouncedSearchTerm.toLowerCase();
        return progressData.filter(p =>
            p.username.toLowerCase().includes(query) ||
            p.full_name.toLowerCase().includes(query)
        );
    }, [progressData, debouncedSearchTerm]);

    // Statistics (including average completion)
    const stats = useMemo(() => {
        const total = progressData.length;
        const completed = progressData.filter(p => p.status === 'Completed').length;
        const inProgress = progressData.filter(p => p.status === 'In Progress').length;
        const notStarted = total - completed - inProgress;

        // Calculate average completion percentage. The experiment_status.highest_completed_step
        // field is the authoritative progress source used by report submission, while
        // experiment_step_events are only used below to show available timestamps.
        let averageCompletion = 0;
        if (total > 0) {
            const completionPercents = progressData.map(p => getCompletionMeta(p).completionPercent);
            averageCompletion = Math.round(
                completionPercents.reduce((acc, val) => acc + val, 0) / completionPercents.length
            );
        }

        return { total, completed, inProgress, notStarted, averageCompletion };
    }, [progressData]);

    // Get status config
    const getStatusConfig = (status: string | null | undefined) => {
        return STATUS_CONFIG[normalizeProgressStatus(status)];
    };

    const formatTime = formatDateTime;

    // Table columns
    const columns = [
        {
            title: '学号',
            dataIndex: 'username',
            key: 'username',
            width: 120,
            sorter: (a: ProgressType, b: ProgressType) => a.username.localeCompare(b.username, 'zh-CN'),
        },
        {
            title: '姓名',
            dataIndex: 'full_name',
            key: 'full_name',
            width: 120,
        },
        {
            title: '状态',
            dataIndex: 'status',
            key: 'status',
            width: 120,
            render: (status: string | null) => {
                const config = getStatusConfig(status);
                return (
                    <Tag icon={config?.icon} color={config?.color || 'default'}>
                        {config?.label || status}
                    </Tag>
                );
            },
            sorter: (a: ProgressType, b: ProgressType) => {
                return compareProgressStatus(a.status, b.status);
            },
        },
        {
            title: '完成进度',
            key: 'progress',
            width: 200,
            render: (_: unknown, record: ProgressType) => {
                const { completionPercent } = getCompletionMeta(record);
                return (
                    <Progress
                        percent={completionPercent}
                        size="small"
                        status={normalizeProgressStatus(record.status) === 'Completed' ? 'success' : 'active'}
                    />
                );
            },
            sorter: (a: ProgressType, b: ProgressType) => {
                const metaA = getCompletionMeta(a);
                const metaB = getCompletionMeta(b);
                return metaA.completionPercent - metaB.completionPercent;
            },
        },
        {
            title: '完成步数',
            key: 'steps',
            width: 100,
            render: (_: unknown, record: ProgressType) => {
                const { completedSteps, totalSteps } = getCompletionMeta(record);
                return `${completedSteps}/${totalSteps} 步`;
            },
            sorter: (a: ProgressType, b: ProgressType) => {
                const metaA = getCompletionMeta(a);
                const metaB = getCompletionMeta(b);
                return metaA.completedSteps - metaB.completedSteps;
            },
        },
        {
            title: '最后活动时间',
            dataIndex: 'last_activity_at',
            key: 'last_activity_at',
            width: 180,
            render: (value: string | null) => formatTime(value),
            sorter: (a: ProgressType, b: ProgressType) => {
                const dateA = a.last_activity_at ? new Date(a.last_activity_at).getTime() : 0;
                const dateB = b.last_activity_at ? new Date(b.last_activity_at).getTime() : 0;
                return dateA - dateB;
            },
        },
    ];

    // Expanded row render
    const expandedRowRender = (record: ProgressType) => {
        const sortedTimeline = [...(record.timeline || [])].sort(
            (a, b) => new Date(a.event_timestamp).getTime() - new Date(b.event_timestamp).getTime()
        );

        return (
            <Card size="small" style={{ margin: '8px 0' }}>
                {/* Summary Info */}
                <Row gutter={16} style={{ marginBottom: 16 }}>
                    <Col span={6}>
                        <Card size="small" bordered>
                            <Text type="secondary">实验状态</Text>
                            <div style={{ marginTop: 4 }}>
                                <Tag color={getStatusConfig(record.status)?.color || 'default'}>
                                    {getStatusConfig(record.status)?.label || record.status}
                                </Tag>
                            </div>
                        </Card>
                    </Col>
                    <Col span={6}>
                        <Card size="small" bordered>
                            <Text type="secondary">开始时间</Text>
                            <div style={{ marginTop: 4 }}>
                                <Text>{formatTime(record.start_time)}</Text>
                            </div>
                        </Card>
                    </Col>
                    <Col span={6}>
                        <Card size="small" bordered>
                            <Text type="secondary">最近操作</Text>
                            <div style={{ marginTop: 4 }}>
                                <Text>{formatTime(record.last_activity_at)}</Text>
                            </div>
                        </Card>
                    </Col>
                    <Col span={6}>
                        <Card size="small" bordered>
                            <Text type="secondary">完成时间</Text>
                            <div style={{ marginTop: 4 }}>
                                <Text>{formatTime(record.completion_time)}</Text>
                            </div>
                        </Card>
                    </Col>
                </Row>

                {/* Step Overview */}
                {record.steps && record.steps.length > 0 && (
                    <div style={{ marginBottom: 16 }}>
                        <Text strong style={{ display: 'block', marginBottom: 8 }}>步骤完成情况</Text>
                        <Row gutter={[8, 8]}>
                            {STEP_LABELS.map((stepDef) => {
                                const stepData = record.steps?.find((step) => step.step_order === stepDef.order);
                                const { completedSteps } = getCompletionMeta(record);
                                const completedByEvent = Boolean(stepData?.completed_at);
                                const completedByProgress = !completedByEvent && stepDef.order <= completedSteps;
                                const status = completedByEvent || completedByProgress
                                    ? 'completed'
                                    : stepData?.started_at
                                        ? 'started'
                                        : 'pending';

                                return (
                                    <Col span={8} key={stepDef.id}>
                                        <Card
                                            size="small"
                                            bordered
                                            style={{
                                                borderColor: status === 'completed' ? '#52c41a' : undefined,
                                                background: status === 'completed' ? '#f6ffed' : status === 'started' ? '#e6f7ff' : undefined,
                                            }}
                                        >
                                            <Space>
                                                {status === 'completed' ? (
                                                    <CheckCircleOutlined style={{ color: '#52c41a' }} />
                                                ) : status === 'started' ? (
                                                    <PlayCircleOutlined style={{ color: '#1890ff' }} />
                                                ) : (
                                                    <ClockCircleOutlined style={{ color: '#999' }} />
                                                )}
                                                <div>
                                                    <Text strong style={{ fontSize: 12 }}>{stepDef.label}</Text>
                                                    <div style={{ fontSize: 11, color: '#666' }}>
                                                        {status === 'completed'
                                                            ? completedByEvent
                                                                ? `完成：${formatTime(stepData?.completed_at ?? null)}`
                                                                : '已完成（按实验进度）'
                                                            : status === 'started'
                                                                ? `开始：${formatTime(stepData?.started_at ?? null)}`
                                                                : '尚未开始'}
                                                    </div>
                                                </div>
                                            </Space>
                                        </Card>
                                    </Col>
                                );
                            })}
                        </Row>
                    </div>
                )}

                {/* Timeline */}
                {sortedTimeline.length > 0 && (
                    <div>
                        <Text strong style={{ display: 'block', marginBottom: 8 }}>操作时间线</Text>
                        <div style={{ maxHeight: 200, overflowY: 'auto' }}>
                            <Timeline
                                items={sortedTimeline.map((event) => {
                                    const stepLabel =
                                        STEP_LABELS.find((step) => step.order === event.step_order)?.label ??
                                        `步骤 ${event.step_order}`;
                                    const isCompleted = event.event_type === 'COMPLETED';
                                    return {
                                        color: isCompleted ? 'green' : 'blue',
                                        children: (
                                            <div>
                                                <Text strong>{isCompleted ? '完成' : '开始'} · {stepLabel}</Text>
                                                <div style={{ fontSize: 12, color: '#666' }}>
                                                    {formatTime(event.event_timestamp)}
                                                </div>
                                            </div>
                                        ),
                                    };
                                })}
                            />
                        </div>
                    </div>
                )}
            </Card>
        );
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
            <Title level={3} style={{ marginBottom: 24 }}>实验进度</Title>

            {/* Statistics */}
            <Row gutter={16} style={{ marginBottom: 24 }}>
                <Col xs={24} sm={12} lg={6} xl={5}>
                    <Card>
                        <Statistic
                            title="学生总数"
                            value={stats.total}
                            prefix={<TeamOutlined />}
                            suffix={<Text type="secondary" style={{ fontSize: 12 }}>当前班级</Text>}
                        />
                    </Card>
                </Col>
                <Col xs={24} sm={12} lg={6} xl={5}>
                    <Card>
                        <Statistic
                            title="已完成"
                            value={stats.completed}
                            styles={{ content: { color: '#52c41a' } }}
                            prefix={<CheckCircleOutlined />}
                            suffix={<Text type="secondary" style={{ fontSize: 12 }}>全部步骤</Text>}
                        />
                    </Card>
                </Col>
                <Col xs={24} sm={12} lg={6} xl={5}>
                    <Card>
                        <Statistic
                            title="进行中"
                            value={stats.inProgress}
                            styles={{ content: { color: '#1890ff' } }}
                            prefix={<SyncOutlined />}
                            suffix={<Text type="secondary" style={{ fontSize: 12 }}>实验流程</Text>}
                        />
                    </Card>
                </Col>
                <Col xs={24} sm={12} lg={6} xl={4}>
                    <Card>
                        <Statistic
                            title="未开始"
                            value={stats.notStarted}
                            styles={{ content: { color: '#999' } }}
                            prefix={<ClockCircleOutlined />}
                        />
                    </Card>
                </Col>
                <Col xs={24} sm={12} lg={6} xl={5}>
                    <Card>
                        <Statistic
                            title="平均完成度"
                            value={stats.averageCompletion}
                            styles={{ content: { color: '#722ed1' } }}
                            suffix="%"
                        />
                    </Card>
                </Col>
            </Row>

            {/* Filters */}
            <Card style={{ marginBottom: 16 }}>
                <Space size="large" wrap>
                    <div>
                        <Text strong style={{ marginRight: 8 }}>选择班级</Text>
                        <Select
                            value={selectedClassId}
                            onChange={setSelectedClassId}
                            style={{ width: 200 }}
                            placeholder="请选择班级"
                            loading={isLoadingClasses}
                            options={classes.map(c => ({ value: String(c.class_id), label: c.class_name }))}
                        />
                    </div>
                    <div>
                        <Text strong style={{ marginRight: 8 }}>搜索学生</Text>
                        <Input
                            prefix={<SearchOutlined />}
                            placeholder="学号或姓名"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            style={{ width: 200 }}
                            allowClear
                        />
                    </div>
                </Space>
            </Card>

            {error && <Alert description={error} type="error" showIcon style={{ marginBottom: 16 }} />}

            {/* Data Table */}
            <Card>
                <Table
                    dataSource={filteredProgress}
                    columns={columns}
                    rowKey="student_id"
                    loading={isLoadingProgress}
                    expandable={{
                        expandedRowRender,
                        rowExpandable: () => true,
                    }}
                    pagination={{ pageSize: 10, showTotal: (total) => `共 ${total} 名学生` }}
                    locale={{ emptyText: selectedClassId ? '暂无数据' : '请先选择班级' }}
                />
            </Card>
        </div>
    );
};

export default ExperimentProgress;
