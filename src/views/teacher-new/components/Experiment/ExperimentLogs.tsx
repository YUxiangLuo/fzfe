import React, { useEffect, useMemo, useState, useCallback } from 'react';
import {
    Card,
    Table,
    Select,
    Input,
    Tag,
    Spin,
    Alert,
    Typography,
    Space,
    Statistic,
    Row,
    Col,
    Badge
} from 'antd';
import {
    SearchOutlined,
    ClockCircleOutlined,
    TeamOutlined,
    ExperimentOutlined,
    FieldTimeOutlined
} from '@ant-design/icons';
import { apiClient } from '../../../../utils/apiClient';
import { decodeToken } from '../../../../utils/auth';
import type { Class, StudentExperimentLog } from '../../types';

const { Title, Text } = Typography;

// Search debounce delay (ms)
const SEARCH_DEBOUNCE_DELAY = 300;

interface StudentExperimentSummary {
    studentId: number;
    studentUsername: string;
    studentName: string;
    totalExperiments: number;
    totalDurationSeconds: number;
    averageDurationSeconds: number;
    lastActivityAt: string | null;
    experiments: StudentExperimentDetailSummary[];
}

interface StudentExperimentDetailSummary {
    experimentId: number;
    status: string;
    startTime: string | null;
    lastActivityAt: string | null;
    completionTime: string | null;
    durationSeconds: number;
    currentStep: number | null;
    highestCompletedStep: number | null;
    industry: string | null;
    company: string | null;
    product: string | null;
}

const ExperimentLogs: React.FC = () => {
    const [classes, setClasses] = useState<Class[]>([]);
    const [logs, setLogs] = useState<StudentExperimentLog[]>([]);
    const [selectedClassId, setSelectedClassId] = useState<string>('');
    const [searchTerm, setSearchTerm] = useState('');
    const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
    const [isLoadingClasses, setIsLoadingClasses] = useState(true);
    const [isLoadingLogs, setIsLoadingLogs] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Debounced search
    useEffect(() => {
        const handler = window.setTimeout(() => {
            setDebouncedSearchTerm(searchTerm.trim().toLowerCase());
        }, SEARCH_DEBOUNCE_DELAY);

        return () => {
            window.clearTimeout(handler);
        };
    }, [searchTerm]);

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

    // Fetch logs
    const fetchLogs = useCallback(async (classId: string) => {
        if (!classId) return;

        setIsLoadingLogs(true);
        setError(null);
        try {
            const data = await apiClient.get(`/classes/${classId}/experiment-runs`);
            setLogs(data || []);
        } catch (err: any) {
            setError(err.message || '获取日志数据失败');
            setLogs([]);
        } finally {
            setIsLoadingLogs(false);
        }
    }, []);

    useEffect(() => {
        if (selectedClassId) {
            fetchLogs(selectedClassId);
        }
    }, [selectedClassId, fetchLogs]);

    // Transform logs to summary format
    const summaries = useMemo((): StudentExperimentSummary[] => {
        return logs.map(log => {
            const experiments = log.experiments || [];
            const totalDuration = experiments.reduce(
                (sum, exp) => sum + (exp.total_active_duration_seconds || 0),
                0
            );

            return {
                studentId: log.student_id,
                studentUsername: log.username,
                studentName: log.full_name,
                totalExperiments: experiments.length,
                totalDurationSeconds: totalDuration,
                averageDurationSeconds: experiments.length > 0 ? totalDuration / experiments.length : 0,
                lastActivityAt: experiments.length > 0
                    ? experiments.reduce((latest, exp) => {
                        const expTime = exp.last_activity_at ? new Date(exp.last_activity_at).getTime() : 0;
                        const latestTime = latest ? new Date(latest).getTime() : 0;
                        return expTime > latestTime ? exp.last_activity_at : latest;
                    }, null as string | null)
                    : null,
                experiments: experiments.map(exp => ({
                    experimentId: exp.experiment_id,
                    status: exp.status,
                    startTime: exp.start_time,
                    lastActivityAt: exp.last_activity_at,
                    completionTime: exp.completion_time,
                    durationSeconds: exp.total_active_duration_seconds || 0,
                    currentStep: exp.current_step,
                    highestCompletedStep: exp.highest_completed_step,
                    industry: exp.selected_industry,
                    company: exp.selected_company,
                    product: exp.selected_product,
                })),
            };
        });
    }, [logs]);

    // Filter by search (using debounced value)
    const filteredSummaries = useMemo(() => {
        if (!debouncedSearchTerm) return summaries;
        return summaries.filter(s =>
            s.studentUsername.toLowerCase().includes(debouncedSearchTerm) ||
            s.studentName.toLowerCase().includes(debouncedSearchTerm)
        );
    }, [summaries, debouncedSearchTerm]);

    // Overall statistics
    const totalStudents = summaries.length;
    const totalExperiments = summaries.reduce((sum, s) => sum + s.totalExperiments, 0);
    const totalDurationSeconds = summaries.reduce((sum, s) => sum + s.totalDurationSeconds, 0);
    const averageDurationPerStudent = totalStudents > 0 ? Math.round(totalDurationSeconds / totalStudents) : 0;

    // Format duration (with proper rounding)
    const formatDuration = (seconds: number): string => {
        if (!seconds || seconds <= 0) return '—';
        const rounded = Math.max(1, Math.round(seconds));
        const hours = Math.floor(rounded / 3600);
        const minutes = Math.floor((rounded % 3600) / 60);
        const secs = rounded % 60;

        if (hours > 0) {
            return minutes > 0 ? `${hours}小时${minutes}分钟` : `${hours}小时`;
        }
        if (minutes > 0) {
            return secs > 0 ? `${minutes}分钟${secs}秒` : `${minutes}分钟`;
        }
        return `${secs}秒`;
    };

    // Format datetime
    const formatDateTime = (value: string | null) => {
        if (!value) return '—';
        const date = new Date(value);
        if (isNaN(date.getTime())) return '—';
        return date.toLocaleString('zh-CN');
    };

    // Map status
    const mapStatus = (status: string) => {
        const statusMap: Record<string, { label: string; color: string }> = {
            'Completed': { label: '已完成', color: 'success' },
            'In Progress': { label: '进行中', color: 'processing' },
            'Not Started': { label: '未开始', color: 'default' },
        };
        return statusMap[status] || { label: status, color: 'default' };
    };

    // Table columns
    const columns = [
        {
            title: '学号',
            dataIndex: 'studentUsername',
            key: 'studentUsername',
            width: 120,
            sorter: (a: StudentExperimentSummary, b: StudentExperimentSummary) =>
                a.studentUsername.localeCompare(b.studentUsername),
        },
        {
            title: '姓名',
            dataIndex: 'studentName',
            key: 'studentName',
            width: 100,
        },
        {
            title: '实验次数',
            dataIndex: 'totalExperiments',
            key: 'totalExperiments',
            width: 100,
            sorter: (a: StudentExperimentSummary, b: StudentExperimentSummary) =>
                a.totalExperiments - b.totalExperiments,
        },
        {
            title: '总时长',
            key: 'totalDuration',
            width: 120,
            render: (_: any, record: StudentExperimentSummary) => formatDuration(record.totalDurationSeconds),
            sorter: (a: StudentExperimentSummary, b: StudentExperimentSummary) =>
                a.totalDurationSeconds - b.totalDurationSeconds,
        },
        {
            title: '平均时长',
            key: 'averageDuration',
            width: 120,
            render: (_: any, record: StudentExperimentSummary) => formatDuration(record.averageDurationSeconds),
        },
        {
            title: '最后活动时间',
            dataIndex: 'lastActivityAt',
            key: 'lastActivityAt',
            width: 180,
            render: (value: string | null) => formatDateTime(value),
            sorter: (a: StudentExperimentSummary, b: StudentExperimentSummary) => {
                const dateA = a.lastActivityAt ? new Date(a.lastActivityAt).getTime() : 0;
                const dateB = b.lastActivityAt ? new Date(b.lastActivityAt).getTime() : 0;
                return dateA - dateB;
            },
        },
    ];

    // Expanded row for experiment details
    const expandedRowRender = (record: StudentExperimentSummary) => {
        const detailColumns = [
            {
                title: '实验ID',
                dataIndex: 'experimentId',
                key: 'experimentId',
                width: 80,
            },
            {
                title: '状态',
                dataIndex: 'status',
                key: 'status',
                width: 100,
                render: (status: string) => {
                    const mapped = mapStatus(status);
                    return <Tag color={mapped.color}>{mapped.label}</Tag>;
                },
            },
            {
                title: '行业',
                dataIndex: 'industry',
                key: 'industry',
                width: 100,
                render: (text: string | null) => text || '—',
            },
            {
                title: '公司',
                dataIndex: 'company',
                key: 'company',
                width: 100,
                render: (text: string | null) => text || '—',
            },
            {
                title: '产品',
                dataIndex: 'product',
                key: 'product',
                width: 100,
                render: (text: string | null) => text || '—',
            },
            {
                title: '时长',
                key: 'duration',
                width: 100,
                render: (_: any, detail: StudentExperimentDetailSummary) => formatDuration(detail.durationSeconds),
            },
            {
                title: '开始时间',
                dataIndex: 'startTime',
                key: 'startTime',
                width: 160,
                render: (value: string | null) => formatDateTime(value),
            },
        ];

        return (
            <Card size="small" style={{ margin: '8px 0' }}>
                <Table
                    dataSource={record.experiments}
                    columns={detailColumns}
                    rowKey="experimentId"
                    size="small"
                    pagination={false}
                    locale={{ emptyText: '暂无实验记录' }}
                />
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
            <Title level={3} style={{ marginBottom: 24 }}>实验日志</Title>

            {/* Statistics Cards */}
            <Row gutter={16} style={{ marginBottom: 24 }}>
                <Col xs={24} sm={12} lg={6}>
                    <Card>
                        <Statistic
                            title="总学生数"
                            value={totalStudents}
                            prefix={<TeamOutlined />}
                            suffix={<Text type="secondary" style={{ fontSize: 12 }}>当前班级</Text>}
                        />
                    </Card>
                </Col>
                <Col xs={24} sm={12} lg={6}>
                    <Card>
                        <Statistic
                            title="总实验次数"
                            value={totalExperiments}
                            styles={{ content: { color: '#52c41a' } }}
                            prefix={<ExperimentOutlined />}
                        />
                    </Card>
                </Col>
                <Col xs={24} sm={12} lg={6}>
                    <Card>
                        <Statistic
                            title="总时长"
                            value={formatDuration(totalDurationSeconds)}
                            styles={{ content: { color: '#1890ff' } }}
                            prefix={<ClockCircleOutlined />}
                        />
                    </Card>
                </Col>
                <Col xs={24} sm={12} lg={6}>
                    <Card>
                        <Statistic
                            title="平均每生时长"
                            value={formatDuration(averageDurationPerStudent)}
                            styles={{ content: { color: '#faad14' } }}
                            prefix={<FieldTimeOutlined />}
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

            {/* Logs Table */}
            <Card>
                <Table
                    dataSource={filteredSummaries}
                    columns={columns}
                    rowKey="studentId"
                    loading={isLoadingLogs}
                    expandable={{
                        expandedRowRender,
                        rowExpandable: (record) => record.experiments.length > 0,
                    }}
                    pagination={{ pageSize: 10, showTotal: (total) => `共 ${total} 名学生` }}
                    locale={{ emptyText: selectedClassId ? '暂无数据' : '请先选择班级' }}
                />
            </Card>
        </div>
    );
};

export default ExperimentLogs;
