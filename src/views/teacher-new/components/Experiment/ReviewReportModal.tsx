import React, { useState, useMemo } from 'react';
import {
    Modal,
    Row,
    Col,
    Button,
    Input,
    InputNumber,
    Collapse,
    Descriptions,
    Divider,
    Space,
    Typography,
    Alert,
    message,
} from 'antd';
import {
    FileTextOutlined,
    CloseCircleOutlined,
    DownOutlined,
    UpOutlined,
} from '@ant-design/icons';
import { apiClient } from '../../../../utils/apiClient';
import { openFileWithAuth } from '../../../../utils/authFile';
import { useAuthObjectUrl } from '../../../../hooks/useAuthObjectUrl';
import type { ExperimentReport } from '../../types';
import { formatDateTime } from '../../utils/format';
import { getErrorMessage } from '../../utils/error';

const { Title, Text } = Typography;
const { TextArea } = Input;
const { Panel } = Collapse;

// 实验步骤评分字段定义
const EXP_FLOW_SCORE_FIELDS = [
    { key: 'exp_flow_demand_data_preparation', label: '需求预测 - 数据准备', group: 'demand' },
    { key: 'exp_flow_demand_descriptive_stats', label: '需求预测 - 描述性统计', group: 'demand' },
    { key: 'exp_flow_demand_model_selection', label: '需求预测 - 模型选择', group: 'demand' },
    { key: 'exp_flow_demand_generate_results', label: '需求预测 - 生成预测结果', group: 'demand' },
    { key: 'exp_flow_production_inventory_calc', label: '生产计划 - 库存变量计算', group: 'production' },
    { key: 'exp_flow_production_service_level', label: '生产计划 - 服务水平计算', group: 'production' },
    { key: 'exp_flow_production_variable_calc', label: '生产计划 - 生产变量计算', group: 'production' },
    { key: 'exp_flow_production_plan_creation', label: '生产计划 - 制定计划', group: 'production' },
];

interface ReviewReportModalProps {
    open: boolean;
    report: ExperimentReport | null;
    onClose: () => void;
    onSuccess: (updatedReport: ExperimentReport) => void;
}

const ReviewReportModal: React.FC<ReviewReportModalProps> = ({
    open,
    report,
    onClose,
    onSuccess,
}) => {
    // Review form state
    const [tempScore, setTempScore] = useState<string>('');
    const [tempModelQualityScore, setTempModelQualityScore] = useState<string>('');
    const [tempFeedback, setTempFeedback] = useState('');
    const [rejectReason, setRejectReason] = useState('');
    const [showExpFlowScores, setShowExpFlowScores] = useState(false);
    const [expFlowScores, setExpFlowScores] = useState<Record<string, string>>({
        exp_flow_demand_data_preparation: '',
        exp_flow_demand_descriptive_stats: '',
        exp_flow_demand_model_selection: '',
        exp_flow_demand_generate_results: '',
        exp_flow_production_inventory_calc: '',
        exp_flow_production_service_level: '',
        exp_flow_production_variable_calc: '',
        exp_flow_production_plan_creation: '',
    });
    const [isSaving, setIsSaving] = useState(false);
    const [isPreviewLoadError, setIsPreviewLoadError] = useState(false);
    const pdfPreviewUrl = useAuthObjectUrl(open ? report?.pdf_file_path : null);

    // Reset state when report changes
    React.useEffect(() => {
        if (report) {
            setTempScore(report.grade !== null && report.grade !== undefined ? String(report.grade) : '');
            setTempModelQualityScore(
                report.experiment_grade?.model_quality !== null && report.experiment_grade?.model_quality !== undefined
                    ? String(report.experiment_grade.model_quality)
                    : ''
            );
            setTempFeedback(report.feedback || '');
            setRejectReason('');
            setIsPreviewLoadError(false);

            const eg = report.experiment_grade;
            setExpFlowScores({
                exp_flow_demand_data_preparation: eg?.exp_flow_demand_data_preparation != null ? String(eg.exp_flow_demand_data_preparation) : '',
                exp_flow_demand_descriptive_stats: eg?.exp_flow_demand_descriptive_stats != null ? String(eg.exp_flow_demand_descriptive_stats) : '',
                exp_flow_demand_model_selection: eg?.exp_flow_demand_model_selection != null ? String(eg.exp_flow_demand_model_selection) : '',
                exp_flow_demand_generate_results: eg?.exp_flow_demand_generate_results != null ? String(eg.exp_flow_demand_generate_results) : '',
                exp_flow_production_inventory_calc: eg?.exp_flow_production_inventory_calc != null ? String(eg.exp_flow_production_inventory_calc) : '',
                exp_flow_production_service_level: eg?.exp_flow_production_service_level != null ? String(eg.exp_flow_production_service_level) : '',
                exp_flow_production_variable_calc: eg?.exp_flow_production_variable_calc != null ? String(eg.exp_flow_production_variable_calc) : '',
                exp_flow_production_plan_creation: eg?.exp_flow_production_plan_creation != null ? String(eg.exp_flow_production_plan_creation) : '',
            });
        }
    }, [open, report]);

    // Validation
    const isScoreValid = useMemo(() => {
        if (!tempScore.trim()) return true;
        const val = Number(tempScore);
        return !Number.isNaN(val) && val >= 0 && val <= 100;
    }, [tempScore]);

    const isModelQualityScoreValid = useMemo(() => {
        if (!tempModelQualityScore.trim()) return true;
        const val = Number(tempModelQualityScore);
        return !Number.isNaN(val) && val >= 0 && val <= 100;
    }, [tempModelQualityScore]);

    const areExpFlowScoresValid = useMemo(() => {
        return Object.values(expFlowScores).every((value) => {
            if (!value.trim()) return true;
            const val = Number(value);
            return !Number.isNaN(val) && val >= 0 && val <= 100;
        });
    }, [expFlowScores]);

    const canSubmitReview = useMemo(() => {
        return isScoreValid && isModelQualityScoreValid && areExpFlowScoresValid;
    }, [isScoreValid, isModelQualityScoreValid, areExpFlowScoresValid]);

    const hasAnyScoringInput = useMemo(() => {
        return Boolean(
            tempScore.trim() ||
            tempModelQualityScore.trim() ||
            Object.values(expFlowScores).some((value) => value.trim())
        );
    }, [tempScore, tempModelQualityScore, expFlowScores]);

    // Save review
    const handleSaveReview = async () => {
        if (!report || !report.report_id) return;
        if (!canSubmitReview) {
            message.error('请检查评分是否在 0-100 之间');
            return;
        }

        const payload: {
            grade?: number;
            feedback?: string;
            experiment_grade?: Record<string, number>;
            status?: string;
        } = {};

        if (tempScore.trim()) {
            payload.grade = Number(tempScore);
        }

        // Build experiment_grade object
        const experimentGrade: Record<string, number> = {};
        let hasExperimentGrade = false;

        if (tempModelQualityScore.trim()) {
            experimentGrade.model_quality = Number(tempModelQualityScore);
            hasExperimentGrade = true;
        }

        // Process experiment flow scores
        for (const [key, value] of Object.entries(expFlowScores)) {
            if (value.trim()) {
                experimentGrade[key] = Number(value);
                hasExperimentGrade = true;
            }
        }

        if (hasExperimentGrade) {
            payload.experiment_grade = experimentGrade;
        }

        if (tempFeedback.trim()) {
            payload.feedback = tempFeedback.trim();
        }

        if (payload.grade === undefined && !hasExperimentGrade && payload.feedback === undefined) {
            message.error('请至少填写一项成绩或评语');
            return;
        }

        if (hasExperimentGrade && payload.grade === undefined) {
            message.error('填写实验成绩时必须同时填写报告得分');
            return;
        }

        // Only mark as graded if score is submitted
        if (payload.grade !== undefined || hasExperimentGrade) {
            payload.status = 'graded';
        }

        setIsSaving(true);
        try {
            const updatedReport = await apiClient.put(`/reports/${report.report_id}`, payload);
            message.success('评阅结果保存成功');
            onSuccess(updatedReport as ExperimentReport);
            onClose();
        } catch (err: unknown) {
            message.error(getErrorMessage(err, '保存评阅结果失败'));
        } finally {
            setIsSaving(false);
        }
    };

    // Reject report
    const handleReject = async () => {
        if (!report || !report.report_id) return;

        if (!rejectReason.trim()) {
            message.error('驳回报告时必须填写驳回原因');
            return;
        }

        const payload = {
            status: 'rejected',
            feedback: rejectReason.trim(),
            grade: 0,
            experiment_grade: {
                model_quality: 0,
                exp_flow_demand_data_preparation: 0,
                exp_flow_demand_descriptive_stats: 0,
                exp_flow_demand_model_selection: 0,
                exp_flow_demand_generate_results: 0,
                exp_flow_production_inventory_calc: 0,
                exp_flow_production_service_level: 0,
                exp_flow_production_variable_calc: 0,
                exp_flow_production_plan_creation: 0,
                exp_flow_report_submission: 0,
            }
        };

        setIsSaving(true);
        try {
            const updatedReport = await apiClient.put(`/reports/${report.report_id}`, payload);
            message.success('报告已驳回');
            onSuccess(updatedReport as ExperimentReport);
            onClose();
        } catch (err: unknown) {
            message.error(getErrorMessage(err, '驳回失败'));
        } finally {
            setIsSaving(false);
        }
    };

    if (!report) return null;
    const pdfFilePath = report.pdf_file_path;

    return (
        <Modal
            title={`评阅报告 - ${report?.full_name || ''}`}
            open={open}
            onCancel={onClose}
            width="calc(100vw - 48px)"
            footer={null}
            style={{ top: 24, paddingBottom: 24, maxWidth: '1600px' }}
            styles={{
                header: { padding: '16px 24px', marginBottom: 0, borderBottom: '1px solid #f0f0f0' },
                container: { height: 'calc(100vh - 48px)', padding: 0 },
                body: { padding: 0, height: 'calc(100vh - 105px)', overflow: 'hidden' }
            }}
        >
            <Row style={{ height: '100%' }}>
                {/* Left side - PDF Preview */}
                <Col span={16} style={{ height: '100%', padding: 24, borderRight: '1px solid #f0f0f0' }}>
                    {pdfFilePath && !isPreviewLoadError ? (
                        <div style={{ height: '100%', background: '#f5f5f5', borderRadius: 8, overflow: 'hidden', position: 'relative' }}>
                            <iframe
                                src={pdfPreviewUrl ?? undefined}
                                title="report-preview"
                                style={{ width: '100%', height: '100%', border: 'none' }}
                                onError={() => setIsPreviewLoadError(true)}
                            />
                        </div>
                    ) : pdfFilePath ? (
                        <div style={{ height: '100%', background: '#f5f5f5', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <div style={{ textAlign: 'center', color: '#999' }}>
                                <FileTextOutlined style={{ fontSize: 48, marginBottom: 16 }} />
                                <p>PDF 加载失败</p>
                                <Button
                                    type="link"
                                    onClick={() => {
                                        if (!pdfFilePath) return;
                                        openFileWithAuth(pdfFilePath).catch((err: unknown) => {
                                            message.error(getErrorMessage(err, '下载失败'));
                                        });
                                    }}
                                >
                                    点击下载查看
                                </Button>
                            </div>
                        </div>
                    ) : (
                        <div style={{ height: '100%', background: '#f5f5f5', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <div style={{ textAlign: 'center', color: '#999' }}>
                                <FileTextOutlined style={{ fontSize: 48, marginBottom: 16 }} />
                                <p>该报告没有可预览的文件</p>
                            </div>
                        </div>
                    )}
                </Col>

                {/* Right side - Review Form */}
                <Col span={8} style={{ height: '100%', padding: 24, background: '#fafafa', overflowY: 'auto' }}>
                    {/* Rejected Status */}
                    {report.status === 'rejected' ? (
                        <div style={{ textAlign: 'center', padding: '40px 0' }}>
                            <div style={{
                                width: 80,
                                height: 80,
                                borderRadius: '50%',
                                background: '#fff2f0',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                margin: '0 auto 24px'
                            }}>
                                <CloseCircleOutlined style={{ fontSize: 40, color: '#ff4d4f' }} />
                            </div>
                            <Title level={4} style={{ color: '#ff4d4f', marginBottom: 16 }}>报告已驳回</Title>
                            <Text type="secondary" style={{ display: 'block', marginBottom: 24 }}>
                                该报告已被驳回，分数已归零。<br />
                                需等待学生重新提交后，方可再次评阅。
                            </Text>
                            {report.feedback && (
                                <Alert
                                    message="驳回原因"
                                    description={report.feedback}
                                    type="error"
                                    style={{ marginBottom: 24, textAlign: 'left' }}
                                />
                            )}
                            <Button onClick={onClose} block>
                                关闭
                            </Button>
                        </div>
                    ) : (
                        <>
                            {/* Student Info */}
                            <Descriptions column={1} size="small" style={{ marginBottom: 24 }}>
                                <Descriptions.Item label="学生">{report.full_name}</Descriptions.Item>
                                <Descriptions.Item label="学号">{report.username}</Descriptions.Item>
                                <Descriptions.Item label="提交时间">
                                    {formatDateTime(report.submitted_at)}
                                </Descriptions.Item>
                            </Descriptions>

                            <Divider />

                            {/* Report Score */}
                            <div style={{ marginBottom: 16 }}>
                                <Text strong>实验报告得分（0-100）</Text>
                                <InputNumber
                                    min={0}
                                    max={100}
                                    value={tempScore === '' ? undefined : Number(tempScore)}
                                    onChange={(val) => setTempScore(val === undefined ? '' : String(val))}
                                    style={{ width: '100%', marginTop: 8 }}
                                    placeholder="请输入报告得分"
                                />
                                {!isScoreValid && (
                                    <Text type="danger" style={{ fontSize: 12 }}>分数需在 0-100 之间</Text>
                                )}
                            </div>

                            {/* Model Quality Score */}
                            <div style={{ marginBottom: 16 }}>
                                <Text strong>模型选择得分（0-100）</Text>
                                <InputNumber
                                    min={0}
                                    max={100}
                                    value={tempModelQualityScore === '' ? undefined : Number(tempModelQualityScore)}
                                    onChange={(val) => setTempModelQualityScore(val === undefined ? '' : String(val))}
                                    style={{ width: '100%', marginTop: 8 }}
                                    placeholder="请输入模型选择得分"
                                />
                                {!isModelQualityScoreValid && (
                                    <Text type="danger" style={{ fontSize: 12 }}>分数需在 0-100 之间</Text>
                                )}
                            </div>

                            <Divider />

                            {/* Experiment Flow Scores - Collapsible */}
                            <Collapse
                                ghost
                                activeKey={showExpFlowScores ? ['1'] : []}
                                onChange={(keys) => setShowExpFlowScores(keys.length > 0)}
                                style={{ marginBottom: 16 }}
                            >
                                <Panel
                                    header={<Text strong>实验步骤评分（可选）</Text>}
                                    key="1"
                                    extra={showExpFlowScores ? <UpOutlined /> : <DownOutlined />}
                                >
                                    {/* Demand Forecast Group */}
                                    <div style={{ marginBottom: 16 }}>
                                        <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 8 }}>
                                            需求预测任务：
                                        </Text>
                                        {EXP_FLOW_SCORE_FIELDS.filter(f => f.group === 'demand').map(field => (
                                            <div key={field.key} style={{ marginBottom: 12 }}>
                                                <Text style={{ fontSize: 13 }}>{field.label}</Text>
                                                <InputNumber
                                                    min={0}
                                                    max={100}
                                                    value={expFlowScores[field.key] === '' ? undefined : Number(expFlowScores[field.key])}
                                                    onChange={(val) => setExpFlowScores(prev => ({
                                                        ...prev,
                                                        [field.key]: val === undefined ? '' : String(val)
                                                    }))}
                                                    style={{ width: '100%', marginTop: 4 }}
                                                    placeholder="0-100"
                                                    size="small"
                                                />
                                            </div>
                                        ))}
                                    </div>

                                    {/* Production Planning Group */}
                                    <div>
                                        <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 8, marginTop: 16 }}>
                                            生产计划决策任务：
                                        </Text>
                                        {EXP_FLOW_SCORE_FIELDS.filter(f => f.group === 'production').map(field => (
                                            <div key={field.key} style={{ marginBottom: 12 }}>
                                                <Text style={{ fontSize: 13 }}>{field.label}</Text>
                                                <InputNumber
                                                    min={0}
                                                    max={100}
                                                    value={expFlowScores[field.key] === '' ? undefined : Number(expFlowScores[field.key])}
                                                    onChange={(val) => setExpFlowScores(prev => ({
                                                        ...prev,
                                                        [field.key]: val === undefined ? '' : String(val)
                                                    }))}
                                                    style={{ width: '100%', marginTop: 4 }}
                                                    placeholder="0-100"
                                                    size="small"
                                                />
                                            </div>
                                        ))}
                                    </div>

                                    {!areExpFlowScoresValid && (
                                        <Text type="danger" style={{ fontSize: 12 }}>所有步骤评分需在 0-100 之间</Text>
                                    )}
                                </Panel>
                            </Collapse>

                            <Divider />

                            {/* Feedback */}
                            <div style={{ marginBottom: 16 }}>
                                <Text strong>评语（评分时使用）</Text>
                                <TextArea
                                    value={tempFeedback}
                                    onChange={(e) => setTempFeedback(e.target.value)}
                                    rows={4}
                                    style={{ marginTop: 8 }}
                                    placeholder="请输入评语，可为空"
                                />
                            </div>

                            {/* Action Buttons */}
                            <Space direction="vertical" style={{ width: '100%' }} size="middle">
                                <Button
                                    type="primary"
                                    onClick={handleSaveReview}
                                    disabled={!canSubmitReview || (hasAnyScoringInput && !tempScore.trim())}
                                    loading={isSaving}
                                    block
                                >
                                    保存评阅结果
                                </Button>
                                {hasAnyScoringInput && !tempScore.trim() && (
                                    <Text type="danger" style={{ fontSize: 12 }}>
                                        填写实验成绩时必须同时填写报告得分
                                    </Text>
                                )}
                                <Button onClick={onClose} block>
                                    取消
                                </Button>
                            </Space>

                            <Divider />

                            {/* Reject Section */}
                            <div style={{
                                background: '#fff2f0',
                                border: '1px solid #ffccc7',
                                borderRadius: 8,
                                padding: 16
                            }}>
                                <Text strong style={{ color: '#ff4d4f', display: 'block', marginBottom: 8 }}>
                                    驳回原因（驳回时必填）
                                </Text>
                                <TextArea
                                    value={rejectReason}
                                    onChange={(e) => setRejectReason(e.target.value)}
                                    rows={3}
                                    style={{ marginBottom: 8 }}
                                    placeholder="请输入具体的修改建议..."
                                />
                                <Button
                                    danger
                                    onClick={handleReject}
                                    disabled={isSaving || !rejectReason.trim()}
                                    loading={isSaving}
                                    block
                                >
                                    驳回报告
                                </Button>
                            </div>
                        </>
                    )}
                </Col>
            </Row>
        </Modal>
    );
};

export default ReviewReportModal;
