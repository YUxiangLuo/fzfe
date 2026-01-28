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
    Button,
    Progress
} from 'antd';
import {
    SearchOutlined,
    TeamOutlined,
    TrophyOutlined,
    DownloadOutlined,
    RiseOutlined,
    FallOutlined
} from '@ant-design/icons';
import { apiClient } from '../../../../utils/apiClient';
import { decodeToken } from '../../../../utils/auth';
import type { Class, StudentGradeOverview } from '../../types';

const { Title, Text } = Typography;

const ALL_CLASSES = 'all';

const SCORE_COLORS: Record<string, { color: string; label: string }> = {
    excellent: { color: '#52c41a', label: '≥90 优秀' },
    good: { color: '#1890ff', label: '80-89 良好' },
    average: { color: '#faad14', label: '70-79 中等' },
    pass: { color: '#eb2f96', label: '60-69 及格' },
    fail: { color: '#ff4d4f', label: '<60 不及格' },
};

const getScoreLevel = (score: number | null): string => {
    if (score === null) return 'none';
    if (score >= 90) return 'excellent';
    if (score >= 80) return 'good';
    if (score >= 70) return 'average';
    if (score >= 60) return 'pass';
    return 'fail';
};

const GradesOverview: React.FC = () => {
    const [classes, setClasses] = useState<Class[]>([]);
    const [grades, setGrades] = useState<StudentGradeOverview[]>([]);
    const [selectedClassId, setSelectedClassId] = useState<string>(ALL_CLASSES);
    const [searchTerm, setSearchTerm] = useState('');
    const [isLoadingClasses, setIsLoadingClasses] = useState(true);
    const [isLoadingGrades, setIsLoadingGrades] = useState(false);
    const [error, setError] = useState<string | null>(null);

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
                setClasses(data || []);
            } catch (err: any) {
                setError(err.message || '获取班级列表失败');
            } finally {
                setIsLoadingClasses(false);
            }
        };

        fetchClasses();
    }, []);

    // Fetch grades
    const fetchGrades = useCallback(async (classId: string) => {
        setIsLoadingGrades(true);
        setError(null);
        try {
            let data: StudentGradeOverview[] = [];
            if (classId === ALL_CLASSES) {
                // Fetch grades for all classes
                const results = await Promise.all(
                    classes.map(c => apiClient.get(`/classes/${c.class_id}/grade-summaries`))
                );
                data = results.flat();
            } else {
                data = await apiClient.get(`/classes/${classId}/grade-summaries`);
            }
            setGrades(data || []);
        } catch (err: any) {
            setError(err.message || '获取成绩数据失败');
            setGrades([]);
        } finally {
            setIsLoadingGrades(false);
        }
    }, [classes]);

    useEffect(() => {
        if (classes.length > 0) {
            fetchGrades(selectedClassId);
        }
    }, [selectedClassId, classes, fetchGrades]);

    // Filter by search
    const filteredGrades = useMemo(() => {
        if (!searchTerm.trim()) return grades;
        const query = searchTerm.toLowerCase();
        return grades.filter(g =>
            g.username.toLowerCase().includes(query) ||
            g.full_name.toLowerCase().includes(query)
        );
    }, [grades, searchTerm]);

    // Statistics
    const stats = useMemo(() => {
        const validGrades = grades.filter(g => g.final_score !== null);
        const total = grades.length;
        const graded = validGrades.length;
        const avgScore = graded > 0
            ? validGrades.reduce((sum, g) => sum + (g.final_score || 0), 0) / graded
            : 0;
        const maxScore = graded > 0
            ? Math.max(...validGrades.map(g => g.final_score || 0))
            : 0;
        const minScore = graded > 0
            ? Math.min(...validGrades.map(g => g.final_score || 0))
            : 0;

        return { total, graded, avgScore, maxScore, minScore };
    }, [grades]);

    // Score distribution
    const distribution = useMemo(() => {
        const result = { excellent: 0, good: 0, average: 0, pass: 0, fail: 0 };
        grades.forEach(g => {
            const level = getScoreLevel(g.final_score);
            if (level !== 'none') {
                result[level as keyof typeof result]++;
            }
        });
        return result;
    }, [grades]);

    // Format score
    const formatScore = (score: number | null): string => {
        if (score === null) return '—';
        return score.toFixed(1);
    };

    // Export grades
    const handleExport = () => {
        const headers = ['学号', '姓名', '实验流程', '模型质量', '知识测试', '报告质量', '最终成绩'];
        const rows = filteredGrades.map(g => [
            g.username,
            g.full_name,
            formatScore(g.exp_flow_score),
            formatScore(g.model_quality),
            formatScore(g.knowledge_test),
            formatScore(g.report_quality),
            formatScore(g.final_score),
        ]);

        const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
        const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `成绩导出_${new Date().toLocaleDateString()}.csv`;
        link.click();
        window.URL.revokeObjectURL(url);
    };

    // Table columns
    const columns = [
        {
            title: '学号',
            dataIndex: 'username',
            key: 'username',
            width: 120,
            sorter: (a: StudentGradeOverview, b: StudentGradeOverview) =>
                a.username.localeCompare(b.username),
        },
        {
            title: '姓名',
            dataIndex: 'full_name',
            key: 'full_name',
            width: 100,
        },
        {
            title: '实验流程',
            dataIndex: 'exp_flow_score',
            key: 'exp_flow_score',
            width: 100,
            render: (score: number | null) => formatScore(score),
            sorter: (a: StudentGradeOverview, b: StudentGradeOverview) =>
                (a.exp_flow_score || 0) - (b.exp_flow_score || 0),
        },
        {
            title: '模型质量',
            dataIndex: 'model_quality',
            key: 'model_quality',
            width: 100,
            render: (score: number | null) => formatScore(score),
        },
        {
            title: '知识测试',
            dataIndex: 'knowledge_test',
            key: 'knowledge_test',
            width: 100,
            render: (score: number | null) => formatScore(score),
        },
        {
            title: '报告质量',
            dataIndex: 'report_quality',
            key: 'report_quality',
            width: 100,
            render: (score: number | null) => formatScore(score),
        },
        {
            title: '最终成绩',
            dataIndex: 'final_score',
            key: 'final_score',
            width: 120,
            render: (score: number | null) => {
                const level = getScoreLevel(score);
                const config = SCORE_COLORS[level];
                return (
                    <Tag color={config?.color || 'default'}>
                        {formatScore(score)}
                    </Tag>
                );
            },
            sorter: (a: StudentGradeOverview, b: StudentGradeOverview) =>
                (a.final_score || 0) - (b.final_score || 0),
        },
        {
            title: '报告状态',
            dataIndex: 'report_status',
            key: 'report_status',
            width: 100,
            render: (status: string | null) => {
                const statusMap: Record<string, { color: string; label: string }> = {
                    submitted: { color: 'blue', label: '已提交' },
                    graded: { color: 'green', label: '已评阅' },
                    rejected: { color: 'red', label: '已驳回' },
                };
                const config = status ? statusMap[status] : null;
                return config ? <Tag color={config.color}>{config.label}</Tag> : '—';
            },
        },
    ];

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
                <Title level={3} style={{ marginBottom: 0 }}>成绩总览</Title>
                <Button type="primary" icon={<DownloadOutlined />} onClick={handleExport}>
                    导出成绩
                </Button>
            </div>

            {/* Statistics */}
            <Row gutter={16} style={{ marginBottom: 24 }}>
                <Col span={4}>
                    <Card>
                        <Statistic title="总人数" value={stats.total} prefix={<TeamOutlined />} />
                    </Card>
                </Col>
                <Col span={4}>
                    <Card>
                        <Statistic title="已评分" value={stats.graded} styles={{ content: { color: '#52c41a' } }} />
                    </Card>
                </Col>
                <Col span={4}>
                    <Card>
                        <Statistic title="平均分" value={stats.avgScore.toFixed(1)} prefix={<TrophyOutlined />} />
                    </Card>
                </Col>
                <Col span={4}>
                    <Card>
                        <Statistic title="最高分" value={stats.maxScore.toFixed(1)} prefix={<RiseOutlined />} styles={{ content: { color: '#52c41a' } }} />
                    </Card>
                </Col>
                <Col span={4}>
                    <Card>
                        <Statistic title="最低分" value={stats.minScore.toFixed(1)} prefix={<FallOutlined />} styles={{ content: { color: '#ff4d4f' } }} />
                    </Card>
                </Col>
                <Col span={4}>
                    <Card>
                        <Text strong>成绩分布</Text>
                        <div style={{ marginTop: 8 }}>
                            {Object.entries(SCORE_COLORS).map(([key, val]) => (
                                <div key={key} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                                    <span style={{ color: val.color }}>{val.label}</span>
                                    <span>{distribution[key as keyof typeof distribution] || 0}</span>
                                </div>
                            ))}
                        </div>
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
                        >
                            <Select.Option value={ALL_CLASSES}>全部班级</Select.Option>
                            {classes.map(c => (
                                <Select.Option key={c.class_id} value={String(c.class_id)}>
                                    {c.class_name}
                                </Select.Option>
                            ))}
                        </Select>
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

            {/* Grades Table */}
            <Card>
                <Table
                    dataSource={filteredGrades}
                    columns={columns}
                    rowKey="student_id"
                    loading={isLoadingGrades}
                    pagination={{ pageSize: 15, showTotal: (total) => `共 ${total} 名学生` }}
                    scroll={{ x: 1000 }}
                />
            </Card>
        </div>
    );
};

export default GradesOverview;
