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
    FallOutlined,
    BarChartOutlined,
    PieChartOutlined
} from '@ant-design/icons';
import {
    ResponsiveContainer,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip as RechartsTooltip,
    Legend,
    PieChart,
    Pie,
    Cell
} from 'recharts';
import { apiClient } from '../../../../utils/apiClient';
import { decodeToken } from '../../../../utils/auth';
import type { Class, StudentGradeOverview } from '../../types';

const { Title, Text } = Typography;

const ALL_CLASSES = 'all';

// Class summary interface
interface ClassSummary {
    class_id: number;
    class_name: string;
    total_students: number;
    graded_count: number;
    submitted_count: number;
    rejected_count: number;
    not_submitted_count: number;
    average_score: number | null;
}

const SCORE_COLORS: Record<string, { color: string; label: string }> = {
    excellent: { color: '#52c41a', label: '≥90 优秀' },
    good: { color: '#1890ff', label: '80-89 良好' },
    average: { color: '#faad14', label: '70-79 中等' },
    pass: { color: '#eb2f96', label: '60-69 及格' },
    fail: { color: '#ff4d4f', label: '<60 不及格' },
};

// Chart colors
const CHART_COLORS = ['#1890ff', '#52c41a', '#faad14', '#f5222d', '#722ed1', '#eb2f96'];

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
    const [classSummaries, setClassSummaries] = useState<ClassSummary[]>([]);
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
            if (classId === ALL_CLASSES) {
                // Fetch grades for all classes and calculate summaries
                const summaries = await Promise.all(
                    classes.map(async (cls) => {
                        try {
                            const response = await apiClient.get<StudentGradeOverview[]>(`/classes/${cls.class_id}/grade-summaries`);
                            const gradesArray = Array.isArray(response) ? response : [];

                            // Calculate stats
                            const graded = gradesArray.filter(g => g.report_status === 'graded');
                            const submitted = gradesArray.filter(g => g.report_status === 'submitted');
                            const rejected = gradesArray.filter(g => g.report_status === 'rejected');
                            const notSubmitted = gradesArray.filter(g => !g.report_status);

                            const validScores = graded.filter(g => g.final_score !== null).map(g => g.final_score as number);
                            const avgScore = validScores.length > 0
                                ? validScores.reduce((a, b) => a + b, 0) / validScores.length
                                : null;

                            return {
                                class_id: cls.class_id,
                                class_name: cls.class_name,
                                total_students: gradesArray.length,
                                graded_count: graded.length,
                                submitted_count: submitted.length,
                                rejected_count: rejected.length,
                                not_submitted_count: notSubmitted.length,
                                average_score: avgScore
                            } as ClassSummary;
                        } catch (e) {
                            return {
                                class_id: cls.class_id,
                                class_name: cls.class_name,
                                total_students: 0,
                                graded_count: 0,
                                submitted_count: 0,
                                rejected_count: 0,
                                not_submitted_count: 0,
                                average_score: null
                            } as ClassSummary;
                        }
                    })
                );
                setClassSummaries(summaries);
                setGrades([]); // Clear individual grades when showing all
            } else {
                // Single class view
                const data = await apiClient.get<StudentGradeOverview[]>(`/classes/${classId}/grade-summaries`);
                setGrades(data || []);
                setClassSummaries([]);
            }
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

    // Filter by search (only for single class view)
    const filteredGrades = useMemo(() => {
        if (!searchTerm.trim()) return grades;
        const query = searchTerm.toLowerCase();
        return grades.filter(g =>
            g.username.toLowerCase().includes(query) ||
            g.full_name.toLowerCase().includes(query)
        );
    }, [grades, searchTerm]);

    // Statistics for single class
    const singleClassStats = useMemo(() => {
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

    // Score distribution for single class
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
        if (selectedClassId === ALL_CLASSES) return;

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

    // Render "All Classes" View
    const renderAllClassesView = () => {
        const barData = classSummaries.map(s => ({
            name: s.class_name,
            avg: s.average_score ? parseFloat(s.average_score.toFixed(1)) : 0
        }));

        const stackData = classSummaries.map(s => ({
            name: s.class_name,
            已评阅: s.graded_count,
            已提交: s.submitted_count,
            未提交: s.not_submitted_count + s.rejected_count // Simplified for chart
        }));

        return (
            <div className="space-y-6">
                {/* Summary Cards */}
                <Row gutter={[16, 16]}>
                    {classSummaries.map((summary, index) => (
                        <Col xs={24} sm={12} md={8} lg={6} key={summary.class_id}>
                            <Card hoverable className="h-full border-l-4" style={{ borderLeftColor: CHART_COLORS[index % CHART_COLORS.length] }}>
                                <Statistic
                                    title={<Text strong className="text-lg">{summary.class_name}</Text>}
                                    value={summary.average_score ? summary.average_score.toFixed(1) : '—'}
                                    precision={1}
                                    suffix={<span className="text-sm text-gray-400">平均分</span>}
                                />
                                <div className="mt-4 flex justify-between text-sm text-gray-500">
                                    <span>总人数: {summary.total_students}</span>
                                    <span>已评阅: {summary.graded_count}</span>
                                </div>
                                <Progress
                                    percent={summary.total_students > 0 ? Math.round((summary.graded_count / summary.total_students) * 100) : 0}
                                    size="small"
                                    strokeColor={CHART_COLORS[index % CHART_COLORS.length]}
                                    className="mt-2"
                                />
                            </Card>
                        </Col>
                    ))}
                </Row>

                {/* Charts */}
                <Row gutter={[16, 16]}>
                    <Col xs={24} lg={12}>
                        <Card title={<><BarChartOutlined className="mr-2" />各班级平均分对比</>} bordered={false}>
                            <div className="h-[300px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={barData} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                                        <CartesianGrid strokeDasharray="3 3" horizontal={false} strokeOpacity={0.2} />
                                        <XAxis type="number" domain={[0, 100]} />
                                        <YAxis dataKey="name" type="category" width={80} tick={{ fontSize: 12 }} />
                                        <RechartsTooltip
                                            contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                                            cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                                            formatter={(value: number) => [`${value} 分`, '平均分']}
                                        />
                                        <Bar dataKey="avg" name="平均分" radius={[0, 4, 4, 0]} barSize={20}>
                                            {barData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </Card>
                    </Col>
                    <Col xs={24} lg={12}>
                        <Card title={<><PieChartOutlined className="mr-2" />各班级完成情况</>} bordered={false}>
                            <div className="h-[300px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={stackData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} strokeOpacity={0.2} />
                                        <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                                        <YAxis />
                                        <RechartsTooltip
                                            contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                                            cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                                        />
                                        <Legend />
                                        <Bar dataKey="已评阅" stackId="a" fill="#52c41a" barSize={30} />
                                        <Bar dataKey="已提交" stackId="a" fill="#1890ff" barSize={30} />
                                        <Bar dataKey="未提交" stackId="a" fill="#ff4d4f" radius={[4, 4, 0, 0]} barSize={30} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </Card>
                    </Col>
                </Row>
            </div>
        );
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
                <Spin size="large" tip="加载班级数据...">
                    <div style={{ padding: 50 }} />
                </Spin>
            </div>
        );
    }

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <Title level={3} style={{ marginBottom: 0 }}>成绩总览</Title>
                <div className="flex gap-4">
                    <Select
                        value={selectedClassId}
                        onChange={setSelectedClassId}
                        style={{ width: 220 }}
                        placeholder="请选择班级"
                        size="large"
                    >
                        <Select.Option value={ALL_CLASSES}>全部班级</Select.Option>
                        {classes.map(c => (
                            <Select.Option key={c.class_id} value={String(c.class_id)}>
                                {c.class_name}
                            </Select.Option>
                        ))}
                    </Select>

                    {selectedClassId !== ALL_CLASSES && (
                        <Button
                            type="primary"
                            icon={<DownloadOutlined />}
                            onClick={handleExport}
                            size="large"
                        >
                            导出成绩
                        </Button>
                    )}
                </div>
            </div>

            {error && <Alert description={error} type="error" showIcon className="mb-6" />}

            {isLoadingGrades ? (
                <div className="flex justify-center items-center h-64">
                    <Spin size="large" tip="加载成绩数据..." />
                </div>
            ) : selectedClassId === ALL_CLASSES ? (
                renderAllClassesView()
            ) : (
                <>
                    {/* Single Class Statistics */}
                    <Row gutter={16} className="mb-6">
                        <Col span={4}>
                            <Card bordered={false}>
                                <Statistic title="总人数" value={singleClassStats.total} prefix={<TeamOutlined />} />
                            </Card>
                        </Col>
                        <Col span={4}>
                            <Card bordered={false}>
                                <Statistic title="已评分" value={singleClassStats.graded} valueStyle={{ color: '#52c41a' }} />
                            </Card>
                        </Col>
                        <Col span={4}>
                            <Card bordered={false}>
                                <Statistic title="平均分" value={singleClassStats.avgScore.toFixed(1)} prefix={<TrophyOutlined />} />
                            </Card>
                        </Col>
                        <Col span={4}>
                            <Card bordered={false}>
                                <Statistic title="最高分" value={singleClassStats.maxScore.toFixed(1)} prefix={<RiseOutlined />} valueStyle={{ color: '#52c41a' }} />
                            </Card>
                        </Col>
                        <Col span={4}>
                            <Card bordered={false}>
                                <Statistic title="最低分" value={singleClassStats.minScore.toFixed(1)} prefix={<FallOutlined />} valueStyle={{ color: '#ff4d4f' }} />
                            </Card>
                        </Col>
                        <Col span={4}>
                            <Card bordered={false} bodyStyle={{ padding: '12px 24px' }}>
                                <Text strong>成绩分布</Text>
                                <div className="mt-2 text-xs space-y-1">
                                    {Object.entries(SCORE_COLORS).map(([key, val]) => (
                                        <div key={key} className="flex justify-between">
                                            <span style={{ color: val.color }}>{val.label}</span>
                                            <span>{distribution[key as keyof typeof distribution] || 0}</span>
                                        </div>
                                    ))}
                                </div>
                            </Card>
                        </Col>
                    </Row>

                    {/* Filter Input */}
                    <div className="flex justify-end mb-4">
                        <Input
                            prefix={<SearchOutlined />}
                            placeholder="搜索学号或姓名"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            style={{ width: 250 }}
                            allowClear
                        />
                    </div>

                    {/* Grades Table */}
                    <Card bordered={false}>
                        <Table
                            dataSource={filteredGrades}
                            columns={columns}
                            rowKey="student_id"
                            pagination={{
                                pageSize: 15,
                                showTotal: (total) => `共 ${total} 名学生`,
                                showSizeChanger: true,
                                pageSizeOptions: ['15', '30', '50']
                            }}
                            scroll={{ x: 1000 }}
                        />
                    </Card>
                </>
            )}
        </div>
    );
};

export default GradesOverview;
