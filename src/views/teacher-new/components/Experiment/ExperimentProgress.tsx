import React, { useEffect, useMemo, useState, useCallback } from 'react';
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
    Badge,
    Collapse
} from 'antd';
import {
    SearchOutlined,
    TeamOutlined,
    CheckCircleOutlined,
    SyncOutlined,
    ClockCircleOutlined
} from '@ant-design/icons';
import { apiClient } from '../../../../utils/apiClient';
import { decodeToken } from '../../../../utils/auth';
import type { Class, StudentExperimentProgress as ProgressType } from '../../types';

const { Title, Text } = Typography;
const { Panel } = Collapse;

const STEP_LABELS = [
    { id: 'data_import', label: '数据导入', order: 1 },
    { id: 'data_preprocessing', label: '数据预处理', order: 2 },
    { id: 'demand_forecasting', label: '需求预测', order: 3 },
    { id: 'model_training', label: '模型训练', order: 4 },
    { id: 'model_evaluation', label: '模型评估', order: 5 },
    { id: 'result_evaluation', label: '结果评估', order: 6 },
    { id: 'production_planning', label: '生产计划', order: 7 },
];

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
    'Completed': { label: '已完成', color: 'success', icon: <CheckCircleOutlined /> },
    'In Progress': { label: '进行中', color: 'processing', icon: <SyncOutlined spin /> },
    'Not Started': { label: '未开始', color: 'default', icon: <ClockCircleOutlined /> },
};

const ExperimentProgress: React.FC = () => {
    const [classes, setClasses] = useState<Class[]>([]);
    const [progressData, setProgressData] = useState<ProgressType[]>([]);
    const [selectedClassId, setSelectedClassId] = useState<string>('');
    const [searchTerm, setSearchTerm] = useState('');
    const [isLoadingClasses, setIsLoadingClasses] = useState(true);
    const [isLoadingProgress, setIsLoadingProgress] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [expandedRows, setExpandedRows] = useState<number[]>([]);

    // Fetch classes
    useEffect(() => {
        const fetchClasses = async () => {
            setIsLoadingClasses(true);
            try {
                const token = localStorage.getItem('token');
                if (!token) throw new Error('未找到登录凭据');
                const decoded = decodeToken(token);
                if (!decoded) throw new Error('登录信息已失效');

                const data = await apiClient.get(`/teachers/${decoded.sub}/classes`);
                const classList = data || [];
                setClasses(classList);
                if (classList.length > 0) {
                    setSelectedClassId(String(classList[0].class_id));
                }
            } catch (err: any) {
                setError(err.message || '获取班级列表失败');
            } finally {
                setIsLoadingClasses(false);
            }
        };

        fetchClasses();
    }, []);

    // Fetch progress data
    const fetchProgress = useCallback(async (classId: string) => {
        if (!classId) return;

        setIsLoadingProgress(true);
        setError(null);
        try {
            const data = await apiClient.get(`/classes/${classId}/experiment-events`);
            setProgressData(data || []);
        } catch (err: any) {
            setError(err.message || '获取进度数据失败');
            setProgressData([]);
        } finally {
            setIsLoadingProgress(false);
        }
    }, []);

    useEffect(() => {
        if (selectedClassId) {
            fetchProgress(selectedClassId);
        }
    }, [selectedClassId, fetchProgress]);

    // Filter students by search
    const filteredProgress = useMemo(() => {
        if (!searchTerm.trim()) return progressData;
        const query = searchTerm.toLowerCase();
        return progressData.filter(p =>
            p.username.toLowerCase().includes(query) ||
            p.full_name.toLowerCase().includes(query)
        );
    }, [progressData, searchTerm]);

    // Statistics
    const stats = useMemo(() => {
        const total = progressData.length;
        const completed = progressData.filter(p => p.status === 'Completed').length;
        const inProgress = progressData.filter(p => p.status === 'In Progress').length;
        const notStarted = total - completed - inProgress;

        return { total, completed, inProgress, notStarted };
    }, [progressData]);

    // Get status config
    const getStatusConfig = (status: string) => {
        return STATUS_CONFIG[status] || STATUS_CONFIG['Not Started'];
    };

    // Format time
    const formatTime = (value: string | null) => {
        if (!value) return '—';
        const date = new Date(value);
        if (isNaN(date.getTime())) return '—';
        return date.toLocaleString('zh-CN');
    };

    // Calculate step progress
    const getStepProgress = (highestStep: number | null) => {
        if (!highestStep) return 0;
        return Math.round((highestStep / STEP_LABELS.length) * 100);
    };

    // Table columns
    const columns = [
        {
            title: '学号',
            dataIndex: 'username',
            key: 'username',
            width: 120,
            sorter: (a: ProgressType, b: ProgressType) => a.username.localeCompare(b.username),
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
            render: (status: string) => {
                const config = getStatusConfig(status);
                return (
                    <Tag icon={config?.icon} color={config?.color || 'default'}>
                        {config?.label || status}
                    </Tag>
                );
            },
            sorter: (a: ProgressType, b: ProgressType) => {
                const order = { 'Completed': 3, 'In Progress': 2, 'Not Started': 1 };
                return (order[a.status as keyof typeof order] || 0) - (order[b.status as keyof typeof order] || 0);
            },
        },
        {
            title: '当前步骤',
            dataIndex: 'current_step',
            key: 'current_step',
            width: 100,
            render: (step: number | null) => step ? `第 ${step} 步` : '—',
        },
        {
            title: '进度',
            key: 'progress',
            width: 180,
            render: (_: any, record: ProgressType) => (
                <Progress
                    percent={getStepProgress(record.highest_completed_step)}
                    size="small"
                    status={record.status === 'Completed' ? 'success' : 'active'}
                />
            ),
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
        return (
            <Card size="small" style={{ margin: '8px 0' }}>
                <Row gutter={16}>
                    <Col span={8}>
                        <Text type="secondary">开始时间：</Text>
                        <Text>{formatTime(record.start_time)}</Text>
                    </Col>
                    <Col span={8}>
                        <Text type="secondary">完成时间：</Text>
                        <Text>{formatTime(record.completion_time)}</Text>
                    </Col>
                    <Col span={8}>
                        <Text type="secondary">最高完成步骤：</Text>
                        <Text>{record.highest_completed_step || '—'} / {STEP_LABELS.length}</Text>
                    </Col>
                </Row>
                {record.steps && record.steps.length > 0 && (
                    <div style={{ marginTop: 16 }}>
                        <Text strong>步骤详情：</Text>
                        <Table
                            size="small"
                            dataSource={record.steps}
                            rowKey="step_order"
                            pagination={false}
                            columns={[
                                {
                                    title: '步骤',
                                    dataIndex: 'step_order',
                                    key: 'step_order',
                                    render: (order: number) => {
                                        const step = STEP_LABELS.find(s => s.order === order);
                                        return step ? `${order}. ${step.label}` : `步骤 ${order}`;
                                    },
                                },
                                {
                                    title: '状态',
                                    dataIndex: 'latest_event_type',
                                    key: 'status',
                                    render: (type: string | null) => (
                                        <Badge
                                            status={type === 'COMPLETED' ? 'success' : type === 'STARTED' ? 'processing' : 'default'}
                                            text={type === 'COMPLETED' ? '已完成' : type === 'STARTED' ? '进行中' : '未开始'}
                                        />
                                    ),
                                },
                                {
                                    title: '开始时间',
                                    dataIndex: 'started_at',
                                    key: 'started_at',
                                    render: (value: string | null) => formatTime(value),
                                },
                                {
                                    title: '完成时间',
                                    dataIndex: 'completed_at',
                                    key: 'completed_at',
                                    render: (value: string | null) => formatTime(value),
                                },
                            ]}
                        />
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
                <Col span={6}>
                    <Card>
                        <Statistic
                            title="总人数"
                            value={stats.total}
                            prefix={<TeamOutlined />}
                        />
                    </Card>
                </Col>
                <Col span={6}>
                    <Card>
                        <Statistic
                            title="已完成"
                            value={stats.completed}
                            styles={{ content: { color: '#52c41a' } }}
                            prefix={<CheckCircleOutlined />}
                        />
                    </Card>
                </Col>
                <Col span={6}>
                    <Card>
                        <Statistic
                            title="进行中"
                            value={stats.inProgress}
                            styles={{ content: { color: '#1890ff' } }}
                            prefix={<SyncOutlined />}
                        />
                    </Card>
                </Col>
                <Col span={6}>
                    <Card>
                        <Statistic
                            title="未开始"
                            value={stats.notStarted}
                            styles={{ content: { color: '#999' } }}
                            prefix={<ClockCircleOutlined />}
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
