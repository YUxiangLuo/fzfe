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
    message,
    Tooltip
} from 'antd';
import {
    SearchOutlined,
    FileTextOutlined,
    CheckCircleOutlined,
    SyncOutlined,
    DownloadOutlined,
    ExportOutlined,
    FileZipOutlined,
    EditOutlined
} from '@ant-design/icons';
import { apiClient } from '../../../../utils/apiClient';
import { createAuthObjectUrl, openFileWithAuth } from '../../../../utils/authFile';
import { useObjectUrl } from '../../../../hooks/useObjectUrl';
import type { ExperimentReport } from '../../types';
import { formatDateTime } from '../../utils/format';
import { isAbortError, getErrorMessage } from '../../utils/error';
import ReviewReportModal from './ReviewReportModal';
import { useTermManagedClasses } from '../../utils/useTermManagedClasses';
import { compareNullableNumber, type SortOrder } from '../../utils/sort';
import AcademicTermSelect from '../AcademicTermSelect';

const { Title, Text } = Typography;

const STATUS_META: Record<string, { label: string; color: string }> = {
    submitted: { label: '待评分', color: 'processing' },
    graded: { label: '已评分', color: 'success' },
    rejected: { label: '已驳回', color: 'error' },
    draft: { label: '未提交', color: 'default' },
};

const ExperimentReports: React.FC = () => {
    const {
        terms,
        selectedTermId,
        setSelectedTermId,
        classes,
        isLoading: isLoadingClasses,
        isLoadingTerms,
        error: classLoadError,
    } = useTermManagedClasses();
    const [reports, setReports] = useState<ExperimentReport[]>([]);
    const [selectedClassId, setSelectedClassId] = useState<string>('');
    const [searchTerm, setSearchTerm] = useState('');
    const [isLoadingReports, setIsLoadingReports] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const pageSize = 10;

    // Review modal state
    const [reviewModalOpen, setReviewModalOpen] = useState(false);
    const [selectedReport, setSelectedReport] = useState<ExperimentReport | null>(null);

    // CSV export state
    const [isExportingCsv, setIsExportingCsv] = useState(false);
    const { url: exportedCsvUrl, setUrl: setExportedCsvUrl, clearUrl: clearExportedCsvUrl } = useObjectUrl();

    // Reports archive export state
    const [isExportingReports, setIsExportingReports] = useState(false);
    const { url: exportedFileUrl, setUrl: setExportedFileUrl, clearUrl: clearExportedFileUrl } = useObjectUrl();

    useEffect(() => {
        clearExportedCsvUrl();
        clearExportedFileUrl();
    }, [selectedClassId, clearExportedCsvUrl, clearExportedFileUrl]);

    useEffect(() => {
        const firstClass = classes[0];
        setSelectedClassId(firstClass ? String(firstClass.class_id) : '');
        if (!firstClass) setReports([]);
    }, [classes]);

    // Fetch reports
    useEffect(() => {
        if (!selectedClassId) {
            setReports([]);
            return;
        }

        const controller = new AbortController();

        const fetchReports = async () => {
            setIsLoadingReports(true);
            setError(null);
            try {
                const data = await apiClient.get(`/classes/${selectedClassId}/reports`, { signal: controller.signal });
                if (controller.signal.aborted) return;
                setReports(data || []);
            } catch (err: unknown) {
                if (isAbortError(err)) return;
                if (!controller.signal.aborted) {
                    setError(getErrorMessage(err, '获取报告数据失败'));
                    setReports([]);
                }
            } finally {
                if (!controller.signal.aborted) {
                    setIsLoadingReports(false);
                }
            }
        };

        fetchReports();
        return () => { controller.abort(); };
    }, [selectedClassId]);

    // Filter reports
    const filteredReports = useMemo(() => {
        if (!searchTerm.trim()) return reports;
        const query = searchTerm.toLowerCase();
        return reports.filter(r =>
            r.username.toLowerCase().includes(query) ||
            r.full_name.toLowerCase().includes(query)
        );
    }, [reports, searchTerm]);
    const hasClassReports = reports.length > 0;

    useEffect(() => {
        setCurrentPage(1);
    }, [selectedClassId, searchTerm]);

    useEffect(() => {
        const maxPage = Math.max(1, Math.ceil(filteredReports.length / pageSize));
        if (currentPage > maxPage) {
            setCurrentPage(maxPage);
        }
    }, [filteredReports.length, currentPage]);

    // Get report status
    const getReportStatus = (report: ExperimentReport): string => {
        if (!report.report_id) return 'draft';
        if (report.status === 'rejected') return 'rejected';
        if (report.status === 'graded') return 'graded';
        if (report.status === 'submitted') return 'submitted';
        return 'draft';
    };

    // Statistics
    const stats = useMemo(() => {
        const total = reports.length;
        const submittedReports = reports.filter(r => ['submitted', 'graded', 'rejected'].includes(r.status || ''));
        const pendingReports = reports.filter(r => r.status === 'submitted');
        const gradedReports = reports.filter(r => r.status === 'graded');
        const rejectedReports = reports.filter(r => r.status === 'rejected');

        const averageGrade = gradedReports.length
            ? (gradedReports.reduce((acc, report) => acc + (report.grade ?? 0), 0) / gradedReports.length).toFixed(1)
            : '--';

        return {
            total,
            submitted: submittedReports.length,
            pendingReview: pendingReports.length,
            reviewed: gradedReports.length,
            averageGrade,
            rejectedReportsCount: rejectedReports.length,
        };
    }, [reports]);

    // Export CSV
    const handleExportCsv = useCallback(async () => {
        if (!selectedClassId || !hasClassReports || isExportingCsv) return;
        setIsExportingCsv(true);
        clearExportedCsvUrl();
        try {
            const response = await apiClient.get<{ file_path: string }>(`/classes/${selectedClassId}/report-export.csv`);

            if (!response || !response.file_path) {
                throw new Error('导出失败：服务器未返回文件地址');
            }

            const objectUrl = await createAuthObjectUrl(response.file_path);
            setExportedCsvUrl(objectUrl);
            message.success('导出成功');
        } catch (err: unknown) {
            message.error(getErrorMessage(err, '导出 CSV 失败，请稍后再试。'));
        } finally {
            setIsExportingCsv(false);
        }
    }, [selectedClassId, hasClassReports, isExportingCsv, clearExportedCsvUrl, setExportedCsvUrl]);

    // Export all reports as ZIP
    const handleExportReports = useCallback(async () => {
        if (!selectedClassId || !hasClassReports || isExportingReports) return;
        setIsExportingReports(true);
        clearExportedFileUrl();
        try {
            const response = await apiClient.get<{ file_path: string }>(`/classes/${selectedClassId}/report-archive`);

            if (!response || !response.file_path) {
                throw new Error('导出失败：服务器未返回文件地址');
            }

            const objectUrl = await createAuthObjectUrl(response.file_path);
            setExportedFileUrl(objectUrl);
            message.success('报告文件导出成功');
        } catch (err: unknown) {
            message.error(getErrorMessage(err, '导出实验报告失败，请稍后再试。'));
        } finally {
            setIsExportingReports(false);
        }
    }, [selectedClassId, hasClassReports, isExportingReports, clearExportedFileUrl, setExportedFileUrl]);

    // Download report
    const handleDownload = (filePath: string | null) => {
        if (!filePath) {
            message.warning('报告文件不存在');
            return;
        }
        openFileWithAuth(filePath).catch((err: unknown) => {
            message.error(getErrorMessage(err, '下载失败'));
        });
    };

    // Open review modal
    const openReviewModal = (report: ExperimentReport) => {
        setSelectedReport(report);
        setReviewModalOpen(true);
    };

    // Close review modal
    const closeReviewModal = () => {
        setReviewModalOpen(false);
        setSelectedReport(null);
    };

    // Handle review success
    const handleReviewSuccess = (updatedReport: ExperimentReport) => {
        setReports(prev =>
            prev.map(r =>
                r.report_id === updatedReport.report_id
                    ? updatedReport
                    : r
            )
        );
    };

    // Table columns
    const columns = [
        {
            title: '序号',
            key: 'index',
            width: 70,
            render: (_: unknown, __: unknown, index: number) => (currentPage - 1) * pageSize + index + 1,
        },
        {
            title: '状态',
            key: 'status',
            width: 100,
            render: (_: unknown, record: ExperimentReport) => {
                const status = getReportStatus(record);
                const meta = STATUS_META[status] || { label: status, color: 'default' };
                return <Tag color={meta.color}>{meta.label}</Tag>;
            },
            sorter: (a: ExperimentReport, b: ExperimentReport) =>
                getReportStatus(a).localeCompare(getReportStatus(b)),
        },
        {
            title: '姓名',
            dataIndex: 'full_name',
            key: 'full_name',
            width: 100,
        },
        {
            title: '学号',
            dataIndex: 'username',
            key: 'username',
            width: 120,
            sorter: (a: ExperimentReport, b: ExperimentReport) => a.username.localeCompare(b.username),
        },
        {
            title: '提交时间',
            dataIndex: 'submitted_at',
            key: 'submitted_at',
            width: 180,
            render: (value: string | null) => formatDateTime(value),
            sorter: (a: ExperimentReport, b: ExperimentReport) => {
                const aTime = a.submitted_at ? new Date(a.submitted_at).getTime() : 0;
                const bTime = b.submitted_at ? new Date(b.submitted_at).getTime() : 0;
                return aTime - bTime;
            },
        },
        {
            title: '报告得分',
            dataIndex: 'grade',
            key: 'grade',
            width: 100,
            render: (grade: number | null) => grade !== null ? grade : '—',
            sorter: (a: ExperimentReport, b: ExperimentReport, sortOrder: SortOrder) =>
                compareNullableNumber(a.grade, b.grade, sortOrder),
        },
        {
            title: '评语',
            dataIndex: 'feedback',
            key: 'feedback',
            width: 200,
            ellipsis: true,
            render: (feedback: string | null) => feedback || '—',
        },
        {
            title: '评阅人',
            dataIndex: 'grader_name',
            key: 'grader_name',
            width: 100,
            render: (name: string | null) => name || '—',
        },
        {
            title: '操作',
            key: 'action',
            width: 180,
            render: (_: unknown, record: ExperimentReport) => (
                <Space>
                    {record.pdf_file_path && (
                        <Tooltip title="下载报告">
                            <Button
                                type="link"
                                icon={<DownloadOutlined />}
                                onClick={() => handleDownload(record.pdf_file_path)}
                            >
                                下载
                            </Button>
                        </Tooltip>
                    )}
                    {record.report_id && (
                        <Tooltip title="评阅">
                            <Button
                                type="primary"
                                ghost
                                icon={<EditOutlined />}
                                onClick={() => openReviewModal(record)}
                            >
                                评阅
                            </Button>
                        </Tooltip>
                    )}
                </Space>
            ),
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
            <Title level={3} style={{ marginBottom: 24 }}>实验报告</Title>

            {/* Statistics */}
            <Row gutter={16} style={{ marginBottom: 24 }}>
                <Col xs={24} sm={12} lg={6}>
                    <Card>
                        <Statistic
                            title="学生总数"
                            value={stats.total}
                            prefix={<FileTextOutlined />}
                            suffix={<Text type="secondary" style={{ fontSize: 12 }}>当前班级</Text>}
                        />
                    </Card>
                </Col>
                <Col xs={24} sm={12} lg={6}>
                    <Card>
                        <Statistic
                            title="提交报告"
                            value={stats.submitted}
                            valueStyle={{ color: '#52c41a' }}
                            prefix={<CheckCircleOutlined />}
                            suffix={
                                stats.rejectedReportsCount > 0 ? (
                                    <Text type="secondary" style={{ fontSize: 12 }}>
                                        (含 {stats.rejectedReportsCount} 份已驳回)
                                    </Text>
                                ) : null
                            }
                        />
                    </Card>
                </Col>
                <Col xs={24} sm={12} lg={6}>
                    <Card>
                        <Statistic
                            title="待评分"
                            value={stats.pendingReview}
                            valueStyle={{ color: '#1890ff' }}
                            prefix={<SyncOutlined />}
                            suffix={<Text type="secondary" style={{ fontSize: 12 }}>待老师评分</Text>}
                        />
                    </Card>
                </Col>
                <Col xs={24} sm={12} lg={6}>
                    <Card>
                        <Statistic
                            title="报告平均得分"
                            value={stats.averageGrade}
                            valueStyle={{ color: '#722ed1' }}
                            prefix={<FileTextOutlined />}
                            suffix={<Text type="secondary" style={{ fontSize: 12 }}>分</Text>}
                        />
                    </Card>
                </Col>
            </Row>

            {/* Filters */}
            <Card style={{ marginBottom: 16 }}>
                <Space size="large" wrap>
                    <div>
                        <AcademicTermSelect
                            terms={terms}
                            value={selectedTermId}
                            onChange={setSelectedTermId}
                            loading={isLoadingTerms}
                        />
                    </div>
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
                    <div style={{ marginLeft: 'auto' }}>
                        <Space>
                            {exportedFileUrl ? (
                                <Button
                                    type="primary"
                                    icon={<DownloadOutlined />}
                                    href={exportedFileUrl}
                                    target="_blank"
                                >
                                    下载报告文件
                                </Button>
                            ) : (
                                <Button
                                    icon={<FileZipOutlined />}
                                    onClick={handleExportReports}
                                    loading={isExportingReports}
                                    disabled={!selectedClassId || !hasClassReports}
                                >
                                    导出所有报告
                                </Button>
                            )}
                            {exportedCsvUrl ? (
                                <Button
                                    type="primary"
                                    icon={<DownloadOutlined />}
                                    href={exportedCsvUrl}
                                    target="_blank"
                                >
                                    下载 CSV
                                </Button>
                            ) : (
                                <Button
                                    icon={<ExportOutlined />}
                                    onClick={handleExportCsv}
                                    loading={isExportingCsv}
                                    disabled={!selectedClassId || !hasClassReports}
                                >
                                    导出 CSV
                                </Button>
                            )}
                        </Space>
                    </div>
                </Space>
            </Card>

            {(classLoadError || error) && <Alert description={classLoadError || error} type="error" showIcon style={{ marginBottom: 16 }} />}

            {/* Reports Table */}
            <Card>
                <Table
                    dataSource={filteredReports}
                    columns={columns}
                    rowKey={(record) => `${record.user_id}-${record.report_id || 'no-report'}`}
                    loading={isLoadingReports}
                    pagination={{ current: currentPage, pageSize, onChange: (page) => setCurrentPage(page), showTotal: (total) => `共 ${total} 份报告` }}
                    locale={{ emptyText: selectedClassId ? '暂无数据' : '请先选择班级' }}
                />
            </Card>

            {/* Review Modal */}
            <ReviewReportModal
                open={reviewModalOpen}
                report={selectedReport}
                onClose={closeReviewModal}
                onSuccess={handleReviewSuccess}
            />
        </div>
    );
};

export default ExperimentReports;
