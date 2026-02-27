import React, { useEffect, useMemo, useState, useCallback, useRef } from 'react';
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
    Progress,
    message
} from 'antd';
import {
    SearchOutlined,
    TeamOutlined,
    TrophyOutlined,
    DownloadOutlined,
    RiseOutlined,
    FallOutlined,
    BarChartOutlined,
    PieChartOutlined,
    DownOutlined,
    RightOutlined
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
    Cell,
    RadarChart,
    PolarGrid,
    PolarAngleAxis,
    PolarRadiusAxis,
    Radar,
    LineChart,
    Line
} from 'recharts';
import { apiClient } from '../../../../utils/apiClient';
import { createAuthObjectUrl } from '../../../../utils/authFile';
import { useObjectUrl } from '../../../../hooks/useObjectUrl';
import { decodeToken } from '../../../../utils/auth';
import type { Class, StudentGradeOverview } from '../../types';
import FinalBreakdown from './FinalBreakdown';
import { getProgressStatus, getEvaluationBadge } from '../../utils/gradeStatus';

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
    const [expandedRowKeys, setExpandedRowKeys] = useState<number[]>([]);
    const fetchRequestIdRef = useRef(0);

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
        const requestId = ++fetchRequestIdRef.current;
        setIsLoadingGrades(true);
        setError(null);
        try {
            if (classId === ALL_CLASSES) {
                const token = localStorage.getItem('token');
                if (!token) throw new Error('未找到登录凭据');
                const decoded = decodeToken(token);
                if (!decoded) throw new Error('登录信息已失效');
                let endpoint: string | null = null;
                if (decoded.role === 'Teacher') endpoint = `/teachers/${decoded.sub}/grade-summaries`;
                if (decoded.role === 'Assistant') endpoint = `/assistants/${decoded.sub}/grade-summaries`;

                if (!endpoint) {
                    throw new Error('当前角色不支持查看全部班级成绩总览');
                }

                const summaries = await apiClient.get<ClassSummary[]>(endpoint);
                if (requestId !== fetchRequestIdRef.current) return;
                setClassSummaries(Array.isArray(summaries) ? summaries : []);
                setGrades([]);
            } else {
                // Single class view
                const data = await apiClient.get<StudentGradeOverview[]>(`/classes/${classId}/grade-summaries`);
                if (requestId !== fetchRequestIdRef.current) return;
                setGrades(data || []);
                setClassSummaries([]);
            }
        } catch (err: any) {
            if (requestId !== fetchRequestIdRef.current) return;
            setError(err.message || '获取成绩数据失败');
            setGrades([]);
        } finally {
            if (requestId === fetchRequestIdRef.current) {
                setIsLoadingGrades(false);
            }
        }
    }, []);

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

    // Toggle row expansion
    const toggleRow = useCallback((studentId: number) => {
        setExpandedRowKeys(prev =>
            prev.includes(studentId)
                ? prev.filter(id => id !== studentId)
                : [...prev, studentId]
        );
    }, []);

    // Chart data calculations
    const chartData = useMemo(() => {
        const graded = filteredGrades.filter(g => g.final_score !== null);

        // Trend data (sorted by final score)
        const trendData = [...graded]
            .sort((a, b) => (b.final_score || 0) - (a.final_score || 0))
            .map((g, index) => ({
                rank: index + 1,
                score: g.final_score || 0,
                student: g.full_name || g.username,
            }));

        // Histogram data
        type HistogramBin = { label: string; min: number; max: number; count: number };
        const histogramData: HistogramBin[] = Array.from({ length: 10 }, (_, idx) => {
            const min = idx * 10;
            const max = idx === 9 ? 100 : (idx + 1) * 10;
            return {
                label: `${min}-${max}`,
                min,
                max,
                count: 0,
            };
        });

        graded.forEach(g => {
            const score = g.final_score || 0;
            const idx = Math.min(Math.floor(score / 10), 9);
            if (histogramData[idx]) {
                histogramData[idx].count += 1;
            }
        });

        // Average data for radar chart
        type RadarDatum = { subject: string; A: number; fullMark: number };
        const avgData: RadarDatum[] = [
            { subject: '实验流程', A: 0, fullMark: 100 },
            { subject: '知识测试', A: 0, fullMark: 100 },
            { subject: '模型选择', A: 0, fullMark: 100 },
            { subject: '实验报告', A: 0, fullMark: 100 },
        ];

        const expFlowScores = filteredGrades
            .map(g => g.exp_flow_score)
            .filter((s): s is number => s !== null);
        const knowledgeScores = filteredGrades
            .map(g => g.knowledge_test)
            .filter((s): s is number => s !== null);
        const modelScores = filteredGrades
            .map(g => g.model_quality)
            .filter((s): s is number => s !== null);
        const reportScores = filteredGrades
            .map(g => g.report_quality)
            .filter((s): s is number => s !== null);

        if (expFlowScores.length > 0 && avgData[0]) {
            avgData[0].A = parseFloat((expFlowScores.reduce((a, b) => a + b, 0) / expFlowScores.length).toFixed(2));
        }
        if (knowledgeScores.length > 0 && avgData[1]) {
            avgData[1].A = parseFloat((knowledgeScores.reduce((a, b) => a + b, 0) / knowledgeScores.length).toFixed(2));
        }
        if (modelScores.length > 0 && avgData[2]) {
            avgData[2].A = parseFloat((modelScores.reduce((a, b) => a + b, 0) / modelScores.length).toFixed(2));
        }
        if (reportScores.length > 0 && avgData[3]) {
            avgData[3].A = parseFloat((reportScores.reduce((a, b) => a + b, 0) / reportScores.length).toFixed(2));
        }

        return { trendData, histogramData, avgData, gradedCount: graded.length };
    }, [filteredGrades]);

    // Render grade charts
    const renderGradeCharts = () => {
        if (chartData.gradedCount === 0) {
            return (
                <Alert
                    title="暂无成绩图表"
                    description="暂未有评分数据，无法生成图表。"
                    type="info"
                    showIcon
                    className="mb-6"
                />
            );
        }

        return (
            <Row gutter={[16, 16]} className="mb-6">
                {/* Trend Chart */}
                <Col span={24}>
                    <Card title={<><BarChartOutlined /> 总分排序趋势</>} bordered={false}>
                        <div style={{ height: 300 }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={chartData.trendData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2} />
                                    <XAxis dataKey="rank" tickLine={false} />
                                    <YAxis domain={[0, 100]} tickLine={false} />
                                    <RechartsTooltip formatter={(value: number) => value.toFixed(2)} labelFormatter={(label) => `排名 ${label}`} />
                                    <Legend />
                                    <Line
                                        type="monotone"
                                        dataKey="score"
                                        stroke="#1890ff"
                                        strokeWidth={2}
                                        dot={{ r: 3 }}
                                        name="总分"
                                    />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </Card>
                </Col>

                {/* Histogram */}
                <Col span={12}>
                    <Card title={<><BarChartOutlined /> 总分区间分布</>} bordered={false}>
                        <div style={{ height: 300 }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={chartData.histogramData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2} />
                                    <XAxis dataKey="label" tickLine={false} tick={{ fontSize: 12 }} />
                                    <YAxis allowDecimals={false} tickLine={false} />
                                    <RechartsTooltip />
                                    <Bar dataKey="count" fill="#1890ff" radius={[6, 6, 0, 0]} name="人数" />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </Card>
                </Col>

                {/* Radar Chart */}
                <Col span={12}>
                    <Card title={<><PieChartOutlined /> 评分维度平均分</>} bordered={false}>
                        <div style={{ height: 300 }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <RadarChart cx="50%" cy="50%" outerRadius="80%" data={chartData.avgData}>
                                    <PolarGrid />
                                    <PolarAngleAxis dataKey="subject" />
                                    <PolarRadiusAxis angle={30} domain={[0, 100]} />
                                    <Radar
                                        name="班级平均"
                                        dataKey="A"
                                        stroke="#52c41a"
                                        fill="#52c41a"
                                        fillOpacity={0.3}
                                    />
                                    <RechartsTooltip formatter={(value: number) => value.toFixed(2)} />
                                    <Legend />
                                </RadarChart>
                            </ResponsiveContainer>
                        </div>
                    </Card>
                </Col>
            </Row>
        );
    };

    // Export grades using backend API
    const [isExporting, setIsExporting] = useState(false);
    const { url: exportedFileUrl, setUrl: setExportedFileUrl, clearUrl: clearExportedFileUrl } = useObjectUrl();
    const [exportError, setExportError] = useState<string | null>(null);

    const handleExport = async () => {
        if (!selectedClassId) {
            setExportError('请先选择一个班级');
            return;
        }

        if (selectedClassId === ALL_CLASSES) {
            setExportError('导出功能暂不支持"全部班级"，请选择单个班级进行导出。');
            return;
        }

        setIsExporting(true);
        setExportError(null);
        clearExportedFileUrl();
        try {
            const response = await apiClient.get<{ file_path: string }>(`/classes/${selectedClassId}/grade-export.csv`);

            if (!response || !response.file_path) {
                throw new Error('导出失败：服务器未返回文件地址');
            }

            const objectUrl = await createAuthObjectUrl(response.file_path);
            setExportedFileUrl(objectUrl);
            message.success('导出成功');
        } catch (err: any) {
            const errorMessage = err?.message || '导出失败，请稍后重试。';
            setExportError(errorMessage);
            message.error(errorMessage);
        } finally {
            setIsExporting(false);
        }
    };

    // Render "All Classes" View
    const renderAllClassesView = () => {
        const barData = classSummaries
            .filter(s => s.average_score !== null)
            .map(s => ({
                name: s.class_name,
                avg: parseFloat(s.average_score!.toFixed(1)),
            }));

        const stackData = classSummaries.map(s => ({
            name: s.class_name,
            已评分: s.graded_count,
            待评分: s.submitted_count,
            已驳回: s.rejected_count,
            未提交: s.not_submitted_count,
        }));

        const studentCountPieData = classSummaries.map((s, index) => ({
            name: s.class_name,
            value: s.total_students,
            color: CHART_COLORS[index % CHART_COLORS.length],
        }));

        const submissionRateData = classSummaries.map(s => {
            const submitted = s.graded_count + s.submitted_count + s.rejected_count;
            return { name: s.class_name, submitted, total: s.total_students };
        });

        return (
            <div className="space-y-6">
                {/* Summary Cards */}
                <Row gutter={[16, 16]}>
                    {classSummaries.map((summary, index) => {
                        const submittedTotal = summary.graded_count + summary.submitted_count + summary.rejected_count;
                        const submissionRate = summary.total_students > 0
                            ? ((submittedTotal / summary.total_students) * 100).toFixed(1)
                            : '—';
                        return (
                            <Col xs={24} sm={12} md={8} lg={6} key={summary.class_id}>
                                <Card
                                    hoverable
                                    className="h-full border-l-4 cursor-pointer"
                                    style={{ borderLeftColor: CHART_COLORS[index % CHART_COLORS.length] }}
                                    onClick={() => setSelectedClassId(String(summary.class_id))}
                                >
                                    <Statistic
                                        title={<Text strong className="text-lg">{summary.class_name}</Text>}
                                        value={summary.average_score !== null ? summary.average_score.toFixed(1) : '—'}
                                        precision={1}
                                        suffix={<span className="text-sm text-gray-400">平均分</span>}
                                    />
                                    <div className="mt-4 flex justify-between text-sm text-gray-500">
                                        <span>总人数: {summary.total_students}</span>
                                        <span>已提交: {submittedTotal}</span>
                                    </div>
                                    {summary.rejected_count > 0 && (
                                        <div className="text-xs text-red-500 mt-1">
                                            （含 {summary.rejected_count} 份已驳回）
                                        </div>
                                    )}
                                    <div className="mt-2 flex justify-between text-sm text-gray-500">
                                        <span>提交率</span>
                                        <span className="font-bold">{submissionRate}%</span>
                                    </div>
                                    <Progress
                                        percent={summary.total_students > 0 ? Math.round((submittedTotal / summary.total_students) * 100) : 0}
                                        size="small"
                                        strokeColor={CHART_COLORS[index % CHART_COLORS.length]}
                                        className="mt-1"
                                    />
                                    <div className="text-center mt-3 text-xs text-blue-500 font-medium">
                                        点击查看详情 →
                                    </div>
                                </Card>
                            </Col>
                        );
                    })}
                </Row>

                {/* Charts */}
                <Row gutter={[16, 16]}>
                    {/* Bar Chart - Average Scores */}
                    <Col xs={24} lg={12}>
                        <Card title={<><BarChartOutlined className="mr-2" />各班级平均分对比</>} bordered={false}>
                            <div className="h-[300px] w-full">
                                {barData.length === 0 ? (
                                    <div className="flex items-center justify-center h-full text-gray-400">暂无数据</div>
                                ) : (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={barData} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                                            <CartesianGrid strokeDasharray="3 3" horizontal={false} strokeOpacity={0.2} />
                                            <XAxis type="number" domain={[0, 100]} />
                                            <YAxis dataKey="name" type="category" width={80} tick={{ fontSize: 12 }} />
                                            <RechartsTooltip
                                                contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                                                cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                                                formatter={(value: number) => [`${value.toFixed(2)} 分`, '平均分']}
                                            />
                                            <Bar dataKey="avg" name="平均分" radius={[0, 4, 4, 0]} barSize={20}>
                                                {barData.map((_, index) => (
                                                    <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                                                ))}
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                )}
                            </div>
                        </Card>
                    </Col>

                    {/* Stacked Bar Chart - Completion Status */}
                    <Col xs={24} lg={12}>
                        <Card title={<><PieChartOutlined className="mr-2" />各班级完成情况</>} bordered={false}>
                            <div className="h-[300px] w-full">
                                {stackData.length === 0 ? (
                                    <div className="flex items-center justify-center h-full text-gray-400">暂无数据</div>
                                ) : (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={stackData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} strokeOpacity={0.2} />
                                            <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                                            <YAxis />
                                            <RechartsTooltip
                                                contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                                                cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                                                formatter={(value: number, name: string) => [`${value} 人`, name]}
                                            />
                                            <Legend />
                                            <Bar dataKey="已评分" stackId="a" fill="#52c41a" barSize={30} />
                                            <Bar dataKey="待评分" stackId="a" fill="#1890ff" barSize={30} />
                                            <Bar dataKey="已驳回" stackId="a" fill="#faad14" barSize={30} />
                                            <Bar dataKey="未提交" stackId="a" fill="#d9d9d9" radius={[4, 4, 0, 0]} barSize={30} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                )}
                            </div>
                        </Card>
                    </Col>

                    {/* Pie Chart - Student Distribution */}
                    <Col xs={24} lg={12}>
                        <Card title={<><TeamOutlined className="mr-2" />各班级人数分布</>} bordered={false}>
                            <div className="h-[300px] w-full">
                                {studentCountPieData.length === 0 ? (
                                    <div className="flex items-center justify-center h-full text-gray-400">暂无数据</div>
                                ) : (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <RechartsTooltip
                                                contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                                                formatter={(value: number) => [`${value} 人`]}
                                            />
                                            <Pie
                                                data={studentCountPieData}
                                                dataKey="value"
                                                nameKey="name"
                                                cx="50%"
                                                cy="50%"
                                                outerRadius={100}
                                                label={(entry) => `${entry.name}: ${entry.value}人`}
                                                labelLine={{ stroke: '#8c8c8c', strokeWidth: 1 }}
                                            >
                                                {studentCountPieData.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                                                ))}
                                            </Pie>
                                        </PieChart>
                                    </ResponsiveContainer>
                                )}
                            </div>
                        </Card>
                    </Col>

                    {/* Submission Rate Bars */}
                    <Col xs={24} lg={12}>
                        <Card title={<><RiseOutlined className="mr-2" />各班级提交率对比</>} bordered={false}>
                            <div className="space-y-4 py-2">
                                {submissionRateData.length === 0 ? (
                                    <div className="flex items-center justify-center h-[268px] text-gray-400">暂无数据</div>
                                ) : (
                                    submissionRateData.map((data, index) => {
                                        const rate = data.total > 0 ? (data.submitted / data.total) * 100 : 0;
                                        return (
                                            <div key={index} className="space-y-1">
                                                <div className="flex items-center justify-between text-sm">
                                                    <span className="font-medium">{data.name}</span>
                                                    <span className="font-bold">{rate.toFixed(1)}%</span>
                                                </div>
                                                <div className="flex items-center space-x-2">
                                                    <Progress
                                                        percent={parseFloat(rate.toFixed(1))}
                                                        showInfo={false}
                                                        strokeColor={CHART_COLORS[index % CHART_COLORS.length]}
                                                        trailColor="#f0f0f0"
                                                        size="small"
                                                        className="flex-1"
                                                    />
                                                    <span className="text-xs text-gray-400 w-16 text-right">
                                                        {data.submitted}/{data.total}
                                                    </span>
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
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
            render: (_: any, record: StudentGradeOverview) => {
                const badge = getEvaluationBadge(record);
                return <Tag color={badge.color}>{badge.text}</Tag>;
            },
        },
        {
            title: '操作',
            key: 'action',
            width: 100,
            fixed: 'right' as const,
            render: (_: any, record: StudentGradeOverview) => {
                const isExpanded = expandedRowKeys.includes(record.student_id);
                return (
                    <Button
                        type="link"
                        size="small"
                        onClick={() => toggleRow(record.student_id)}
                        icon={isExpanded ? <DownOutlined /> : <RightOutlined />}
                    >
                        {isExpanded ? '收起' : '详情'}
                    </Button>
                );
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
                            loading={isExporting}
                            size="large"
                        >
                            导出成绩
                        </Button>
                    )}
                </div>
            </div>

            {error && <Alert description={error} type="error" showIcon className="mb-6" />}
            {exportError && <Alert description={exportError} type="error" showIcon className="mb-6" closable onClose={() => setExportError(null)} />}
            {exportedFileUrl && (
                <Alert
                    title="导出成功"
                    description={
                        <span>
                            点击 <a href={exportedFileUrl} target="_blank" rel="noopener noreferrer">此处</a> 下载文件。
                            或者点击右侧按钮下载。
                        </span>
                    }
                    type="success"
                    showIcon
                    className="mb-6"
                    closable
                    onClose={clearExportedFileUrl}
                    action={
                        <Button
                            type="primary"
                            size="small"
                            href={exportedFileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label="下载导出的成绩文件"
                        >
                            下载
                        </Button>
                    }
                />
            )}

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

                    {/* Charts */}
                    {filteredGrades.length > 0 && renderGradeCharts()}

                    {/* Grades Table */}
                    <Card bordered={false} className="mt-6">
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
                            expandable={{
                                expandedRowKeys,
                                onExpandedRowsChange: (expandedKeys) => setExpandedRowKeys(expandedKeys as number[]),
                                expandedRowRender: (record) => <FinalBreakdown grade={record} />,
                                rowExpandable: (record) => record.final_score !== null || record.report_status !== null,
                            }}
                        />
                    </Card>
                </>
            )}
        </div>
    );
};

export default GradesOverview;
