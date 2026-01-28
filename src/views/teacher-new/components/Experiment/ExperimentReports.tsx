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
    Modal,
    Form,
    InputNumber,
    message,
    Tooltip
} from 'antd';
import {
    SearchOutlined,
    FileTextOutlined,
    CheckCircleOutlined,
    SyncOutlined,
    DownloadOutlined,
    EditOutlined,
    CloseCircleOutlined,
    ExclamationCircleOutlined
} from '@ant-design/icons';
import { apiClient } from '../../../../utils/apiClient';
import { API_BASE_URL } from '../../../../utils/apiClient';
import { decodeToken } from '../../../../utils/auth';
import type { Class, ExperimentReport } from '../../types';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;
const { confirm } = Modal;

const STATUS_META: Record<string, { label: string; color: string }> = {
    submitted: { label: '已评阅', color: 'success' },
    pending: { label: '待评阅', color: 'processing' },
    rejected: { label: '已驳回', color: 'error' },
    draft: { label: '未提交', color: 'default' },
};

const ExperimentReports: React.FC = () => {
    const [classes, setClasses] = useState<Class[]>([]);
    const [reports, setReports] = useState<ExperimentReport[]>([]);
    const [selectedClassId, setSelectedClassId] = useState<string>('');
    const [searchTerm, setSearchTerm] = useState('');
    const [isLoadingClasses, setIsLoadingClasses] = useState(true);
    const [isLoadingReports, setIsLoadingReports] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Review modal state
    const [reviewModalOpen, setReviewModalOpen] = useState(false);
    const [selectedReport, setSelectedReport] = useState<ExperimentReport | null>(null);
    const [reviewForm] = Form.useForm();
    const [isSaving, setIsSaving] = useState(false);

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

    // Fetch reports
    const fetchReports = useCallback(async (classId: string) => {
        if (!classId) return;

        setIsLoadingReports(true);
        setError(null);
        try {
            const data = await apiClient.get(`/classes/${classId}/reports`);
            setReports(data || []);
        } catch (err: any) {
            setError(err.message || '获取报告数据失败');
            setReports([]);
        } finally {
            setIsLoadingReports(false);
        }
    }, []);

    useEffect(() => {
        if (selectedClassId) {
            fetchReports(selectedClassId);
        }
    }, [selectedClassId, fetchReports]);

    // Filter reports
    const filteredReports = useMemo(() => {
        if (!searchTerm.trim()) return reports;
        const query = searchTerm.toLowerCase();
        return reports.filter(r =>
            r.username.toLowerCase().includes(query) ||
            r.full_name.toLowerCase().includes(query)
        );
    }, [reports, searchTerm]);

    // Get report status
    const getReportStatus = (report: ExperimentReport): string => {
        if (!report.report_id) return 'draft';
        if (report.status === 'rejected') return 'rejected';
        if (report.grade !== null) return 'submitted';
        return 'pending';
    };

    // Statistics
    const stats = useMemo(() => {
        const total = reports.length;
        const pending = reports.filter(r => getReportStatus(r) === 'pending').length;
        const graded = reports.filter(r => getReportStatus(r) === 'submitted').length;
        const rejected = reports.filter(r => getReportStatus(r) === 'rejected').length;

        return { total, pending, graded, rejected };
    }, [reports]);

    // Format datetime
    const formatDateTime = (value: string | null) => {
        if (!value) return '—';
        const date = new Date(value);
        if (isNaN(date.getTime())) return '—';
        return date.toLocaleString('zh-CN');
    };

    // Download report
    const handleDownload = (filePath: string | null) => {
        if (!filePath) {
            message.warning('报告文件不存在');
            return;
        }
        const url = `${API_BASE_URL}${filePath}`;
        window.open(url, '_blank', 'noopener,noreferrer');
    };

    // Open review modal
    const openReviewModal = (report: ExperimentReport) => {
        setSelectedReport(report);
        reviewForm.setFieldsValue({
            grade: report.grade,
            feedback: report.feedback,
        });
        setReviewModalOpen(true);
    };

    // Save review
    const handleSaveReview = async (values: any) => {
        if (!selectedReport || !selectedReport.report_id) return;

        setIsSaving(true);
        try {
            await apiClient.put(`/reports/${selectedReport.report_id}`, {
                grade: values.grade,
                feedback: values.feedback || null,
            });

            // Update local state
            setReports(prev => prev.map(r =>
                r.report_id === selectedReport.report_id
                    ? { ...r, grade: values.grade, feedback: values.feedback, status: 'graded' }
                    : r
            ));

            setReviewModalOpen(false);
            setSelectedReport(null);
            reviewForm.resetFields();
            message.success('评阅保存成功');
        } catch (err: any) {
            message.error(err.message || '保存失败');
        } finally {
            setIsSaving(false);
        }
    };

    // Reject report
    const handleReject = () => {
        if (!selectedReport || !selectedReport.report_id) return;

        confirm({
            title: '确认驳回',
            icon: <ExclamationCircleOutlined />,
            content: '确定要驳回该报告吗？学生需要重新提交。',
            okText: '驳回',
            okType: 'danger',
            cancelText: '取消',
            onOk: async () => {
                try {
                    const feedback = reviewForm.getFieldValue('feedback');
                    await apiClient.put(`/reports/${selectedReport.report_id}/reject`, {
                        feedback: feedback || '请修改后重新提交',
                    });

                    setReports(prev => prev.map(r =>
                        r.report_id === selectedReport.report_id
                            ? { ...r, status: 'rejected', feedback: feedback }
                            : r
                    ));

                    setReviewModalOpen(false);
                    setSelectedReport(null);
                    reviewForm.resetFields();
                    message.success('报告已驳回');
                } catch (err: any) {
                    message.error(err.message || '驳回失败');
                }
            },
        });
    };

    // Table columns
    const columns = [
        {
            title: '学号',
            dataIndex: 'username',
            key: 'username',
            width: 120,
            sorter: (a: ExperimentReport, b: ExperimentReport) => a.username.localeCompare(b.username),
        },
        {
            title: '姓名',
            dataIndex: 'full_name',
            key: 'full_name',
            width: 100,
        },
        {
            title: '状态',
            key: 'status',
            width: 100,
            render: (_: any, record: ExperimentReport) => {
                const status = getReportStatus(record);
                const meta = STATUS_META[status] || { label: status, color: 'default' };
                return <Tag color={meta.color}>{meta.label}</Tag>;
            },
            sorter: (a: ExperimentReport, b: ExperimentReport) =>
                getReportStatus(a).localeCompare(getReportStatus(b)),
        },
        {
            title: '提交时间',
            dataIndex: 'submitted_at',
            key: 'submitted_at',
            width: 180,
            render: (value: string | null) => formatDateTime(value),
        },
        {
            title: '成绩',
            dataIndex: 'grade',
            key: 'grade',
            width: 80,
            render: (grade: number | null) => grade !== null ? grade : '—',
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
            render: (_: any, record: ExperimentReport) => (
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
                <Col span={6}>
                    <Card>
                        <Statistic
                            title="总报告数"
                            value={stats.total}
                            prefix={<FileTextOutlined />}
                        />
                    </Card>
                </Col>
                <Col span={6}>
                    <Card>
                        <Statistic
                            title="待评阅"
                            value={stats.pending}
                            styles={{ content: { color: '#1890ff' } }}
                            prefix={<SyncOutlined />}
                        />
                    </Card>
                </Col>
                <Col span={6}>
                    <Card>
                        <Statistic
                            title="已评阅"
                            value={stats.graded}
                            styles={{ content: { color: '#52c41a' } }}
                            prefix={<CheckCircleOutlined />}
                        />
                    </Card>
                </Col>
                <Col span={6}>
                    <Card>
                        <Statistic
                            title="已驳回"
                            value={stats.rejected}
                            styles={{ content: { color: '#ff4d4f' } }}
                            prefix={<CloseCircleOutlined />}
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

            {/* Reports Table */}
            <Card>
                <Table
                    dataSource={filteredReports}
                    columns={columns}
                    rowKey={(record) => `${record.user_id}-${record.report_id || 'no-report'}`}
                    loading={isLoadingReports}
                    pagination={{ pageSize: 10, showTotal: (total) => `共 ${total} 份报告` }}
                    locale={{ emptyText: selectedClassId ? '暂无数据' : '请先选择班级' }}
                />
            </Card>

            {/* Review Modal */}
            <Modal
                title={`评阅报告 - ${selectedReport?.full_name || ''}`}
                open={reviewModalOpen}
                onCancel={() => {
                    setReviewModalOpen(false);
                    setSelectedReport(null);
                    reviewForm.resetFields();
                }}
                footer={[
                    <Button key="cancel" onClick={() => setReviewModalOpen(false)}>
                        取消
                    </Button>,
                    <Button key="reject" danger onClick={handleReject}>
                        驳回
                    </Button>,
                    <Button key="save" type="primary" loading={isSaving} onClick={() => reviewForm.submit()}>
                        保存评阅
                    </Button>,
                ]}
                width={600}
            >
                <Form form={reviewForm} layout="vertical" onFinish={handleSaveReview}>
                    <Form.Item
                        label="成绩"
                        name="grade"
                        rules={[
                            { required: true, message: '请输入成绩' },
                            { type: 'number', min: 0, max: 100, message: '成绩范围 0-100' },
                        ]}
                    >
                        <InputNumber min={0} max={100} style={{ width: '100%' }} placeholder="0-100" />
                    </Form.Item>
                    <Form.Item label="评语（可选）" name="feedback">
                        <TextArea rows={4} placeholder="请输入评语或反馈" />
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
};

export default ExperimentReports;
