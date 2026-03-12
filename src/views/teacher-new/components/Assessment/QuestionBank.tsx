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
import type { Question, QuestionTypeApi } from '../../types';
import { getErrorMessage } from '../../utils/error';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;
const { Option } = Select;

// Match teacher's knowledge point grouping
const KNOWLEDGE_POINT_GROUPS: Record<string, string[]> = {
    '预测模型': [
        '时间序列基础',
        '移动平均法(MA)',
        '指数平滑法(ES)',
        'ARIMA模型',
        'LSTM深度学习',
        '模型融合技术',
        '模型评估指标',
    ],
    '生产计划': [
        'MPS基本原理',
        '安全库存策略',
        '投入产出计算',
        '库存与缺货',
        '服务水平评估',
        '产能规划',
    ],
};

// Search debounce delay (ms)
const SEARCH_DEBOUNCE_DELAY = 250;

const QUESTION_TYPES: Record<string, { label: string; color: string }> = {
    'Single Choice': { label: '单选题', color: 'blue' },
    'Multiple Choice': { label: '多选题', color: 'purple' },
    'True/False': { label: '判断题', color: 'green' },
};

const CANONICAL_KNOWLEDGE_POINTS = new Set(
    Object.values(KNOWLEDGE_POINT_GROUPS).flat()
);

type QuestionOptions = Record<string, string> | string[] | null | undefined;

function normalizeKnowledgePoint(value: string | null | undefined): string | null {
    if (!value) return null;
    const trimmed = value.trim();
    if (CANONICAL_KNOWLEDGE_POINTS.has(trimmed)) return trimmed;

    const tail = trimmed.split('-').pop()?.trim() ?? trimmed;
    if (CANONICAL_KNOWLEDGE_POINTS.has(tail)) return tail;

    return trimmed;
}

function parseKnowledgePoint(value: string | null | undefined): { group: string | null; detail: string | null } {
    if (!value) return { group: null, detail: null };
    const trimmed = value.trim();

    for (const group of Object.keys(KNOWLEDGE_POINT_GROUPS)) {
        if (trimmed.startsWith(group + '-')) {
            return { group, detail: trimmed.slice(group.length + 1) };
        }
    }

    for (const [group, points] of Object.entries(KNOWLEDGE_POINT_GROUPS)) {
        if (points.includes(trimmed)) return { group, detail: trimmed };
    }

    return { group: null, detail: trimmed };
}

function toOptionMap(options: QuestionOptions): Record<string, string> | null {
    if (!options || Array.isArray(options)) return null;
    return Object.entries(options).reduce<Record<string, string>>((acc, [key, val]) => {
        acc[String(key)] = String(val);
        return acc;
    }, {});
}

function normalizeOptionsForForm(options: QuestionOptions): string[] {
    if (!options) return [];
    if (Array.isArray(options)) {
        return options.map(String).map(v => v.trim()).filter(Boolean);
    }
    return Object.values(options).map(String).map(v => v.trim()).filter(Boolean);
}

function normalizeAnswersForForm(correctAnswers: unknown, options: QuestionOptions): string[] {
    const answers = Array.isArray(correctAnswers)
        ? correctAnswers.map(String).map(v => v.trim()).filter(Boolean)
        : [];
    const optionMap = toOptionMap(options);
    if (!optionMap) return answers;

    return answers.map((ans) => optionMap[ans] ?? ans);
}

function uniqValues(values: string[]): string[] {
    return Array.from(new Set(values));
}

function normalizeTagValues(values: unknown): string[] {
    if (!Array.isArray(values)) return [];
    return uniqValues(
        values
            .map(String)
            .map(v => v.trim())
            .filter(Boolean)
    );
}

const QuestionBank: React.FC = () => {
    const [questions, setQuestions] = useState<Question[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
    const [filterType, setFilterType] = useState<string>('');
    const [selectedKnowledgePoint, setSelectedKnowledgePoint] = useState<string | null>(null);
    const [selectedKnowledgeDetail, setSelectedKnowledgeDetail] = useState<string | null>(null);

    // Modal states
    const [previewModalOpen, setPreviewModalOpen] = useState(false);
    const [editorModalOpen, setEditorModalOpen] = useState(false);
    const [selectedQuestion, setSelectedQuestion] = useState<Question | null>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [form] = Form.useForm();
    const [isSaving, setIsSaving] = useState(false);

    // Debounced search
    useEffect(() => {
        const handler = window.setTimeout(() => {
            setDebouncedSearchTerm(searchTerm.trim().toLowerCase());
        }, SEARCH_DEBOUNCE_DELAY);

        return () => window.clearTimeout(handler);
    }, [searchTerm]);

    // Fetch questions
    const fetchQuestions = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const data = await apiClient.get('/question-bank/questions');
            setQuestions(data || []);
        } catch (err: unknown) {
            setError(getErrorMessage(err, '获取题目失败'));
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchQuestions();
    }, [fetchQuestions]);

    // First-level knowledge point options for filtering
    const knowledgePointOptions = useMemo(() => {
        const groups = new Set<string>(Object.keys(KNOWLEDGE_POINT_GROUPS));
        questions.forEach((q) => {
            const group = q.knowledge_point?.split('-')[0]?.trim();
            if (group) groups.add(group);
        });
        return Array.from(groups);
    }, [questions]);

    // Second-level options based on selected first-level group
    const knowledgeDetailOptions = useMemo(() => {
        if (!selectedKnowledgePoint) return [];
        const staticDetails = KNOWLEDGE_POINT_GROUPS[selectedKnowledgePoint] || [];
        const details = new Set<string>(staticDetails);
        const prefix = selectedKnowledgePoint + '-';
        questions.forEach((q) => {
            if (q.knowledge_point?.startsWith(prefix)) {
                const detail = q.knowledge_point.slice(prefix.length).trim();
                if (detail) details.add(detail);
            }
        });
        return Array.from(details);
    }, [selectedKnowledgePoint, questions]);

    const filteredQuestions = useMemo(() => {
        let result = questions;

        // Text search (debounced)
        if (debouncedSearchTerm) {
            result = result.filter(q => q.question_text.toLowerCase().includes(debouncedSearchTerm));
        }

        // Question type filter
        if (filterType) {
            result = result.filter(q => q.question_type === filterType);
        }

        // Knowledge point filter
        if (selectedKnowledgeDetail) {
            const full = selectedKnowledgePoint + '-' + selectedKnowledgeDetail;
            result = result.filter(q => q.knowledge_point === full);
        } else if (selectedKnowledgePoint) {
            const prefix = selectedKnowledgePoint + '-';
            result = result.filter(q => q.knowledge_point?.startsWith(prefix));
        }

        return result;
    }, [questions, debouncedSearchTerm, filterType, selectedKnowledgePoint, selectedKnowledgeDetail]);

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
            const parsed = parseKnowledgePoint(question.knowledge_point);
            const answers = normalizeAnswersForForm(question.correct_answers, question.options);
            form.setFieldsValue({
                question_text: question.question_text,
                question_type: question.question_type,
                knowledge_point_group: parsed.group,
                knowledge_point_detail: parsed.detail,
                options: normalizeOptionsForForm(question.options),
                correct_answers: question.question_type === 'Multiple Choice'
                    ? answers
                    : answers[0] ?? undefined,
            });
        } else {
            form.resetFields();
        }
        setEditorModalOpen(true);
    };

    // Save question
    interface QuestionFormValues {
        question_text: string;
        question_type: QuestionTypeApi;
        knowledge_point_group: string;
        knowledge_point_detail: string;
        options?: string[];
        correct_answers: string | string[];
    }

    const handleSave = async (values: QuestionFormValues) => {
        setIsSaving(true);
        try {
            const questionType = values.question_type as QuestionTypeApi;
            const optionMap = toOptionMap(selectedQuestion?.options);
            const rawOptions: unknown[] = Array.isArray(values.options) ? values.options : [];
            const normalizedOptions = uniqValues(
                rawOptions
                    .map(String)
                    .map((v: string) => v.trim())
                    .filter(Boolean)
            );
            const rawAnswers: unknown[] = Array.isArray(values.correct_answers)
                ? values.correct_answers
                : values.correct_answers ? [values.correct_answers] : [];
            const normalizedAnswersRaw = uniqValues(
                rawAnswers
                    .map(String)
                    .map((v: string) => v.trim())
                    .filter(Boolean)
            );
            const normalizedAnswers =
                optionMap && normalizedAnswersRaw.every((ans) => optionMap[ans])
                    ? normalizedAnswersRaw.map((ans) => optionMap[ans]!)
                    : normalizedAnswersRaw;

            const payload: {
                question_text: string;
                question_type: QuestionTypeApi;
                knowledge_point?: string;
                options?: string[];
                correct_answers: string[];
            } = {
                question_text: String(values.question_text ?? '').trim(),
                question_type: questionType,
                knowledge_point: values.knowledge_point_group && values.knowledge_point_detail
                    ? `${values.knowledge_point_group}-${values.knowledge_point_detail}`
                    : undefined,
                options: questionType === 'True/False' ? undefined : normalizedOptions,
                correct_answers: normalizedAnswers,
            };

            if (isEditing && selectedQuestion) {
                await apiClient.put(`/question-bank/questions/${selectedQuestion.question_id}`, payload);
                setQuestions(prev => prev.map(q =>
                    q.question_id === selectedQuestion.question_id
                        ? {
                            ...q,
                            ...payload,
                            knowledge_point: payload.knowledge_point ?? null,
                            options: payload.options ?? ['正确', '错误'],
                        }
                        : q
                ));
                message.success('题目更新成功');
            } else {
                const newQuestion = await apiClient.post<Question>('/question-bank/questions', payload);
                setQuestions(prev => [...prev, newQuestion]);
                message.success('题目创建成功');
            }
            setEditorModalOpen(false);
            form.resetFields();
            setSelectedQuestion(null);
        } catch (err: unknown) {
            message.error(getErrorMessage(err, '保存失败'));
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
        } catch (err: unknown) {
            message.error(getErrorMessage(err, '删除失败'));
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
            render: (text: string | null) => normalizeKnowledgePoint(text) || '—',
        },
        {
            title: '正确答案',
            key: 'correct_answer',
            width: 100,
            render: (_: unknown, record: Question) => formatCorrectAnswers(record),
        },
        {
            title: '操作',
            key: 'action',
            width: 150,
            render: (_: unknown, record: Question) => (
                <Space>
                    <Tooltip title="预览">
                        <Button
                            type="text"
                            aria-label="预览题目"
                            icon={<EyeOutlined />}
                            onClick={() => openPreview(record)}
                        />
                    </Tooltip>
                    <Tooltip title="编辑">
                        <Button
                            type="text"
                            aria-label="编辑题目"
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
                            <Button type="text" danger aria-label="删除题目" icon={<DeleteOutlined />} />
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
                        <Text strong style={{ marginRight: 8 }}>一级知识点</Text>
                        <Select
                            value={selectedKnowledgePoint || undefined}
                            onChange={(val) => {
                                setSelectedKnowledgePoint(val || null);
                                setSelectedKnowledgeDetail(null);
                            }}
                            style={{ width: 140 }}
                            placeholder="全部"
                            allowClear
                        >
                            {knowledgePointOptions.map((point) => (
                                <Option key={point} value={point}>{point}</Option>
                            ))}
                        </Select>
                    </div>
                    <div>
                        <Text strong style={{ marginRight: 8 }}>二级知识点</Text>
                        <Select
                            value={selectedKnowledgeDetail || undefined}
                            onChange={(val) => setSelectedKnowledgeDetail(val || null)}
                            style={{ width: 180 }}
                            placeholder="全部"
                            allowClear
                            disabled={!selectedKnowledgePoint}
                        >
                            {knowledgeDetailOptions.map((point) => (
                                <Option key={point} value={point}>{point}</Option>
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
                        <Select
                            placeholder="请选择"
                            onChange={() => form.setFieldsValue({ options: [], correct_answers: undefined })}
                        >
                            {Object.entries(QUESTION_TYPES).map(([key, val]) => (
                                <Option key={key} value={key}>{val.label}</Option>
                            ))}
                        </Select>
                    </Form.Item>
                    <Form.Item
                        label="一级知识点"
                        name="knowledge_point_group"
                        rules={[{ required: true, message: '请选择一级知识点' }]}
                    >
                        <Select
                            placeholder="请选择一级知识点"
                            onChange={() => form.setFieldValue('knowledge_point_detail', undefined)}
                        >
                            {Object.keys(KNOWLEDGE_POINT_GROUPS).map((group) => (
                                <Option key={group} value={group}>{group}</Option>
                            ))}
                        </Select>
                    </Form.Item>
                    <Form.Item
                        noStyle
                        shouldUpdate={(prev, cur) => prev.knowledge_point_group !== cur.knowledge_point_group}
                    >
                        {({ getFieldValue }) => {
                            const group = getFieldValue('knowledge_point_group');
                            const detailOptions = group ? (KNOWLEDGE_POINT_GROUPS[group] || []) : [];
                            return (
                                <Form.Item
                                    label="二级知识点"
                                    name="knowledge_point_detail"
                                    rules={[{ required: true, message: '请选择二级知识点' }]}
                                >
                                    <Select placeholder="请选择二级知识点" disabled={!group}>
                                        {detailOptions.map((point) => (
                                            <Option key={point} value={point}>{point}</Option>
                                        ))}
                                    </Select>
                                </Form.Item>
                            );
                        }}
                    </Form.Item>
                    <Form.Item
                        noStyle
                        shouldUpdate={(prev, cur) => prev.question_type !== cur.question_type}
                    >
                        {({ getFieldValue }) => {
                            const type = getFieldValue('question_type') as QuestionTypeApi | undefined;
                            if (type === 'True/False') return null;
                            return (
                                <Form.Item
                                    label="选项"
                                    name="options"
                                    rules={[{
                                        validator: (_, value) => {
                                            if (normalizeTagValues(value).length < 2) {
                                                return Promise.reject(new Error('选择题至少需要 2 个选项'));
                                            }
                                            return Promise.resolve();
                                        },
                                    }]}
                                >
                                    <Select mode="tags" placeholder="输入选项内容后回车添加" />
                                </Form.Item>
                            );
                        }}
                    </Form.Item>
                    <Form.Item
                        noStyle
                        shouldUpdate={(prev, cur) =>
                            prev.question_type !== cur.question_type || prev.options !== cur.options
                        }
                    >
                        {({ getFieldValue }) => {
                            const type = getFieldValue('question_type') as QuestionTypeApi | undefined;
                            if (!type) return null;

                            if (type === 'True/False') {
                                return (
                                    <Form.Item
                                        label="正确答案"
                                        name="correct_answers"
                                        rules={[{ required: true, message: '请选择正确答案' }]}
                                    >
                                        <Select placeholder="请选择正确答案">
                                            <Option value="正确">正确</Option>
                                            <Option value="错误">错误</Option>
                                        </Select>
                                    </Form.Item>
                                );
                            }

                            const options = normalizeTagValues(getFieldValue('options'));
                            const optionSet = new Set(options);
                            const currentAnswers = getFieldValue('correct_answers');

                            // Clear stale answers when options change
                            if (type === 'Multiple Choice') {
                                if (Array.isArray(currentAnswers)) {
                                    const valid = currentAnswers.filter((a: string) => optionSet.has(a));
                                    if (valid.length !== currentAnswers.length) {
                                        setTimeout(() => form.setFieldValue('correct_answers', valid.length > 0 ? valid : undefined), 0);
                                    }
                                }
                            } else {
                                if (currentAnswers && !optionSet.has(currentAnswers as string)) {
                                    setTimeout(() => form.setFieldValue('correct_answers', undefined), 0);
                                }
                            }

                            return (
                                <Form.Item
                                    label="正确答案"
                                    name="correct_answers"
                                    rules={[{ required: true, message: '请选择正确答案' }]}
                                >
                                    <Select
                                        mode={type === 'Multiple Choice' ? 'multiple' : undefined}
                                        placeholder={options.length === 0 ? '请先添加选项' : '请从选项中选择'}
                                        disabled={options.length === 0}
                                    >
                                        {options.map((opt) => (
                                            <Option key={opt} value={opt}>{opt}</Option>
                                        ))}
                                    </Select>
                                </Form.Item>
                            );
                        }}
                    </Form.Item>

                </Form>
            </Modal>
        </div>
    );
};

export default QuestionBank;
