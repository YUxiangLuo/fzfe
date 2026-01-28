import React, { useEffect, useMemo, useState, useCallback } from 'react';
import {
    Card,
    Table,
    Button,
    Space,
    Modal,
    Form,
    Input,
    Select,
    Tag,
    message,
    Spin,
    Alert,
    Typography,
    Radio,
    Checkbox,
    Tooltip,
    Popconfirm
} from 'antd';
import {
    PlusOutlined,
    EyeOutlined,
    EditOutlined,
    DeleteOutlined,
    SearchOutlined,
    ReloadOutlined
} from '@ant-design/icons';
import { apiClient } from '../../../../utils/apiClient';
import { decodeToken } from '../../../../utils/auth';
import type { Question, QuestionTypeApi } from '../../types';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;
const { Option } = Select;

const QUESTION_CATEGORIES: Record<string, string[]> = {
    '需求预测': ['需求特征分析', '数据预处理', '趋势与季节性', '时间序列分解', '模型选择策略', '预测评估指标'],
    '模型评估': ['LSTM深度学习', '模型融合技术', '模型评估指标'],
    '生产计划': ['MPS基本原理', '安全库存策略', '投入产出计算', '库存与缺货', '服务水平评估', '产能规划'],
};

const QUESTION_TYPES: Record<string, { label: string; color: string }> = {
    'Single Choice': { label: '单选题', color: 'blue' },
    'Multiple Choice': { label: '多选题', color: 'purple' },
    'True/False': { label: '判断题', color: 'green' },
};

const QuestionBank: React.FC = () => {
    const [questions, setQuestions] = useState<Question[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterType, setFilterType] = useState<string>('');
    const [filterCategory, setFilterCategory] = useState<string>('');

    // Modal states
    const [previewModalOpen, setPreviewModalOpen] = useState(false);
    const [editorModalOpen, setEditorModalOpen] = useState(false);
    const [selectedQuestion, setSelectedQuestion] = useState<Question | null>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [form] = Form.useForm();
    const [isSaving, setIsSaving] = useState(false);

    // Fetch questions
    const fetchQuestions = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const data = await apiClient.get('/question-bank/questions');
            setQuestions(data || []);
        } catch (err: any) {
            setError(err.message || '获取题目失败');
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchQuestions();
    }, [fetchQuestions]);

    // Filter questions
    const filteredQuestions = useMemo(() => {
        let result = questions;
        if (searchTerm.trim()) {
            const query = searchTerm.toLowerCase();
            result = result.filter(q => q.question_text.toLowerCase().includes(query));
        }
        if (filterType) {
            result = result.filter(q => q.question_type === filterType);
        }
        if (filterCategory) {
            result = result.filter(q => q.knowledge_point === filterCategory);
        }
        return result;
    }, [questions, searchTerm, filterType, filterCategory]);

    // All categories
    const allCategories = useMemo(() => {
        return Object.values(QUESTION_CATEGORIES).flat();
    }, []);

    // Preview question
    const openPreview = (question: Question) => {
        setSelectedQuestion(question);
        setPreviewModalOpen(true);
    };

    // Edit question
    const openEditor = (question: Question | null) => {
        setSelectedQuestion(question);
        setIsEditing(!!question);
        if (question) {
            form.setFieldsValue({
                question_text: question.question_text,
                question_type: question.question_type,
                knowledge_point: question.knowledge_point,
                options: question.options,
                correct_answers: question.correct_answers,
            });
        } else {
            form.resetFields();
        }
        setEditorModalOpen(true);
    };

    // Save question
    const handleSave = async (values: any) => {
        setIsSaving(true);
        try {
            if (isEditing && selectedQuestion) {
                await apiClient.put(`/question-bank/questions/${selectedQuestion.question_id}`, values);
                setQuestions(prev => prev.map(q =>
                    q.question_id === selectedQuestion.question_id ? { ...q, ...values } : q
                ));
                message.success('题目更新成功');
            } else {
                const newQuestion = await apiClient.post<Question>('/question-bank/questions', values);
                setQuestions(prev => [...prev, newQuestion]);
                message.success('题目创建成功');
            }
            setEditorModalOpen(false);
            form.resetFields();
            setSelectedQuestion(null);
        } catch (err: any) {
            message.error(err.message || '保存失败');
        } finally {
            setIsSaving(false);
        }
    };

    // Delete question
    const handleDelete = async (questionId: number) => {
        try {
            await apiClient.delete(`/question-bank/questions/${questionId}`);
            setQuestions(prev => prev.filter(q => q.question_id !== questionId));
            message.success('题目已删除');
        } catch (err: any) {
            message.error(err.message || '删除失败');
        }
    };

    // Format correct answers for display
    const formatCorrectAnswers = (question: Question): string => {
        if (!question.correct_answers || question.correct_answers.length === 0) return '—';
        return question.correct_answers.join(', ');
    };

    // Table columns
    const columns = [
        {
            title: 'ID',
            dataIndex: 'question_id',
            key: 'question_id',
            width: 70,
        },
        {
            title: '题目内容',
            dataIndex: 'question_text',
            key: 'question_text',
            ellipsis: true,
            render: (text: string) => (
                <Tooltip title={text}>
                    <span>{text.length > 50 ? text.slice(0, 50) + '...' : text}</span>
                </Tooltip>
            ),
        },
        {
            title: '类型',
            dataIndex: 'question_type',
            key: 'question_type',
            width: 100,
            render: (type: string) => {
                const config = QUESTION_TYPES[type];
                return <Tag color={config?.color || 'default'}>{config?.label || type}</Tag>;
            },
        },
        {
            title: '知识点',
            dataIndex: 'knowledge_point',
            key: 'knowledge_point',
            width: 150,
            render: (text: string | null) => text || '—',
        },
        {
            title: '正确答案',
            key: 'correct_answer',
            width: 100,
            render: (_: any, record: Question) => formatCorrectAnswers(record),
        },
        {
            title: '操作',
            key: 'action',
            width: 150,
            render: (_: any, record: Question) => (
                <Space>
                    <Tooltip title="预览">
                        <Button
                            type="text"
                            icon={<EyeOutlined />}
                            onClick={() => openPreview(record)}
                        />
                    </Tooltip>
                    <Tooltip title="编辑">
                        <Button
                            type="text"
                            icon={<EditOutlined />}
                            onClick={() => openEditor(record)}
                        />
                    </Tooltip>
                    <Popconfirm
                        title="确定删除该题目？"
                        onConfirm={() => handleDelete(record.question_id)}
                        okText="确定"
                        cancelText="取消"
                    >
                        <Tooltip title="删除">
                            <Button type="text" danger icon={<DeleteOutlined />} />
                        </Tooltip>
                    </Popconfirm>
                </Space>
            ),
        },
    ];

    if (isLoading) {
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
                <Title level={3} style={{ marginBottom: 0 }}>题库管理</Title>
                <Space>
                    <Button icon={<ReloadOutlined />} onClick={fetchQuestions}>刷新</Button>
                    <Button type="primary" icon={<PlusOutlined />} onClick={() => openEditor(null)}>
                        新增题目
                    </Button>
                </Space>
            </div>

            {/* Filters */}
            <Card style={{ marginBottom: 16 }}>
                <Space size="large" wrap>
                    <div>
                        <Text strong style={{ marginRight: 8 }}>搜索题目</Text>
                        <Input
                            prefix={<SearchOutlined />}
                            placeholder="输入题目内容"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            style={{ width: 200 }}
                            allowClear
                        />
                    </div>
                    <div>
                        <Text strong style={{ marginRight: 8 }}>题目类型</Text>
                        <Select
                            value={filterType}
                            onChange={setFilterType}
                            style={{ width: 120 }}
                            placeholder="全部"
                            allowClear
                        >
                            {Object.entries(QUESTION_TYPES).map(([key, val]) => (
                                <Option key={key} value={key}>{val.label}</Option>
                            ))}
                        </Select>
                    </div>
                    <div>
                        <Text strong style={{ marginRight: 8 }}>知识点</Text>
                        <Select
                            value={filterCategory}
                            onChange={setFilterCategory}
                            style={{ width: 150 }}
                            placeholder="全部"
                            allowClear
                        >
                            {allCategories.map(cat => (
                                <Option key={cat} value={cat}>{cat}</Option>
                            ))}
                        </Select>
                    </div>
                </Space>
            </Card>

            {error && <Alert description={error} type="error" showIcon style={{ marginBottom: 16 }} />}

            {/* Questions Table */}
            <Card>
                <Table
                    dataSource={filteredQuestions}
                    columns={columns}
                    rowKey="question_id"
                    pagination={{ pageSize: 10, showTotal: (total) => `共 ${total} 道题目` }}
                />
            </Card>

            {/* Preview Modal */}
            <Modal
                title="题目预览"
                open={previewModalOpen}
                onCancel={() => setPreviewModalOpen(false)}
                footer={null}
                width={600}
            >
                {selectedQuestion && (
                    <div>
                        <Paragraph>
                            <Tag color={QUESTION_TYPES[selectedQuestion.question_type]?.color}>
                                {QUESTION_TYPES[selectedQuestion.question_type]?.label || selectedQuestion.question_type}
                            </Tag>
                            {selectedQuestion.knowledge_point && <Tag>{selectedQuestion.knowledge_point}</Tag>}
                        </Paragraph>
                        <Title level={5}>{selectedQuestion.question_text}</Title>
                        {selectedQuestion.options && typeof selectedQuestion.options === 'object' && (
                            <div style={{ marginTop: 16 }}>
                                {Array.isArray(selectedQuestion.options)
                                    ? selectedQuestion.options.map((opt: string, idx: number) => (
                                        <div key={idx} style={{ marginBottom: 8 }}>
                                            <Text>{String.fromCharCode(65 + idx)}. {opt}</Text>
                                        </div>
                                    ))
                                    : Object.entries(selectedQuestion.options).map(([key, val]) => (
                                        <div key={key} style={{ marginBottom: 8 }}>
                                            <Text>{key}. {val}</Text>
                                        </div>
                                    ))
                                }
                            </div>
                        )}
                        <Alert
                            message={`正确答案：${formatCorrectAnswers(selectedQuestion)}`}
                            type="success"
                            style={{ marginTop: 16 }}
                        />
                    </div>
                )}
            </Modal>

            {/* Editor Modal */}
            <Modal
                title={isEditing ? '编辑题目' : '新增题目'}
                open={editorModalOpen}
                onCancel={() => {
                    setEditorModalOpen(false);
                    form.resetFields();
                    setSelectedQuestion(null);
                }}
                onOk={() => form.submit()}
                confirmLoading={isSaving}
                okText="保存"
                cancelText="取消"
                width={700}
            >
                <Form form={form} layout="vertical" onFinish={handleSave}>
                    <Form.Item
                        label="题目内容"
                        name="question_text"
                        rules={[{ required: true, message: '请输入题目内容' }]}
                    >
                        <TextArea rows={3} placeholder="请输入题目内容" />
                    </Form.Item>
                    <Form.Item
                        label="题目类型"
                        name="question_type"
                        rules={[{ required: true, message: '请选择题目类型' }]}
                    >
                        <Select placeholder="请选择">
                            {Object.entries(QUESTION_TYPES).map(([key, val]) => (
                                <Option key={key} value={key}>{val.label}</Option>
                            ))}
                        </Select>
                    </Form.Item>
                    <Form.Item
                        label="知识点"
                        name="knowledge_point"
                        rules={[{ required: true, message: '请选择知识点' }]}
                    >
                        <Select placeholder="请选择">
                            {allCategories.map(cat => (
                                <Option key={cat} value={cat}>{cat}</Option>
                            ))}
                        </Select>
                    </Form.Item>
                    <Form.Item
                        label="选项（每行一个）"
                        name="options"
                    >
                        <Select mode="tags" placeholder="回车添加选项" />
                    </Form.Item>
                    <Form.Item
                        label="正确答案"
                        name="correct_answers"
                        rules={[{ required: true, message: '请输入正确答案' }]}
                    >
                        <Select mode="tags" placeholder="输入正确答案，回车确认" />
                    </Form.Item>

                </Form>
            </Modal>
        </div>
    );
};

export default QuestionBank;
