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

// ─── Constants ────────────────────────────────────────────────────────────────

// Two-level knowledge point taxonomy matching the teacher portal curriculum
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

const SEARCH_DEBOUNCE_MS = 250;

const QUESTION_TYPE_CONFIG: Record<QuestionTypeApi, { label: string; color: string }> = {
    'Single Choice': { label: '单选题', color: 'blue' },
    'Multiple Choice': { label: '多选题', color: 'purple' },
    'True/False': { label: '判断题', color: 'green' },
};

// Flat set of all valid detail-level knowledge points for quick lookup
const ALL_KNOWLEDGE_DETAILS = new Set(Object.values(KNOWLEDGE_POINT_GROUPS).flat());

// ─── Types ────────────────────────────────────────────────────────────────────

type QuestionOptions = Record<string, string> | string[] | null | undefined;

// Form values for the create/edit modal
interface QuestionFormValues {
    question_text: string;
    question_type: QuestionTypeApi;
    knowledge_point_group: string;
    knowledge_point_detail: string;
    options?: string[];
    correct_answers: string | string[];
}

// ─── Pure helper functions ────────────────────────────────────────────────────

/**
 * Parse a knowledge_point string into {group, detail}.
 * Handles "group-detail" (stored format) and bare "detail" (legacy format).
 */
function parseKnowledgePoint(value: string | null | undefined): { group: string | null; detail: string | null } {
    if (!value) return { group: null, detail: null };
    const trimmed = value.trim();

    // "预测模型-ARIMA模型" → { group: "预测模型", detail: "ARIMA模型" }
    for (const group of Object.keys(KNOWLEDGE_POINT_GROUPS)) {
        if (trimmed.startsWith(group + '-')) {
            return { group, detail: trimmed.slice(group.length + 1) };
        }
    }

    // "ARIMA模型" (legacy bare format) → { group: "预测模型", detail: "ARIMA模型" }
    for (const [group, details] of Object.entries(KNOWLEDGE_POINT_GROUPS)) {
        if (details.includes(trimmed)) return { group, detail: trimmed };
    }

    return { group: null, detail: trimmed };
}

/**
 * Normalize a raw knowledge_point to its canonical detail string for display.
 * Strips any group prefix; returns the raw value when unrecognized.
 */
function normalizeKnowledgePoint(value: string | null | undefined): string | null {
    if (!value) return null;
    const trimmed = value.trim();
    if (ALL_KNOWLEDGE_DETAILS.has(trimmed)) return trimmed;

    // Strip "group-" prefix (e.g. "预测模型-ARIMA模型" → "ARIMA模型")
    const tail = trimmed.split('-').pop()?.trim() ?? trimmed;
    if (ALL_KNOWLEDGE_DETAILS.has(tail)) return tail;

    return trimmed;
}

/**
 * Convert Record-format options (key → value) to a key map.
 * Returns null for array-format or absent options.
 */
function toOptionKeyMap(options: QuestionOptions): Record<string, string> | null {
    if (!options || Array.isArray(options)) return null;
    return Object.fromEntries(
        Object.entries(options).map(([k, v]) => [String(k), String(v)])
    );
}

/**
 * Normalize API options (Record or string[]) to a plain string array for the form.
 */
function normalizeOptionsToArray(options: QuestionOptions): string[] {
    if (!options) return [];
    const values = Array.isArray(options) ? options : Object.values(options);
    return values.map(String).map(v => v.trim()).filter(Boolean);
}

/**
 * When options are Record-format (key → value), map stored answer keys to their
 * display values so the form shows human-readable text.
 * Falls through unchanged for string-array options.
 */
function resolveAnswerValues(answers: string[], options: QuestionOptions): string[] {
    const keyMap = toOptionKeyMap(options);
    if (!keyMap) return answers;
    return answers.map(ans => keyMap[ans] ?? ans);
}

/**
 * Safely cast an unknown form value (scalar or array) to a deduplicated string array.
 */
function toStringArray(value: unknown): string[] {
    const arr = Array.isArray(value) ? value : value != null ? [value] : [];
    return Array.from(new Set(arr.map(String).map(v => v.trim()).filter(Boolean)));
}

// ─── Component ────────────────────────────────────────────────────────────────

const QuestionBank: React.FC = () => {

    // ── Data state ──────────────────────────────────────────────────────────
    const [questions, setQuestions] = useState<Question[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [fetchError, setFetchError] = useState<string | null>(null);

    // ── Filter state ─────────────────────────────────────────────────────────
    const [searchInput, setSearchInput] = useState('');
    const [searchTerm, setSearchTerm] = useState('');   // debounced, lower-cased
    const [typeFilter, setTypeFilter] = useState('');
    const [groupFilter, setGroupFilter] = useState<string | null>(null);
    const [detailFilter, setDetailFilter] = useState<string | null>(null);

    // ── Modal / form state ────────────────────────────────────────────────────
    const [previewQuestion, setPreviewQuestion] = useState<Question | null>(null);
    const [editingQuestion, setEditingQuestion] = useState<Question | null>(null); // null = create mode
    const [editorOpen, setEditorOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [form] = Form.useForm<QuestionFormValues>();

    // Derived: true when the editor is in edit-mode, false for create-mode
    const isEditing = editingQuestion !== null;

    // ── Effects ──────────────────────────────────────────────────────────────

    // Debounce the search input before applying it to the filter
    useEffect(() => {
        const timer = window.setTimeout(() => {
            setSearchTerm(searchInput.trim().toLowerCase());
        }, SEARCH_DEBOUNCE_MS);
        return () => window.clearTimeout(timer);
    }, [searchInput]);

    const fetchQuestions = useCallback(async () => {
        setIsLoading(true);
        setFetchError(null);
        try {
            const data = await apiClient.get('/question-bank/questions');
            setQuestions(data || []);
        } catch (err: unknown) {
            setFetchError(getErrorMessage(err, '获取题目失败'));
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => { fetchQuestions(); }, [fetchQuestions]);

    // ── Derived filter options ────────────────────────────────────────────────

    /**
     * First-level group options for the filter dropdown.
     * Includes static groups plus any extra groups found in existing data (legacy).
     */
    const groupFilterOptions = useMemo(() => {
        const groups = new Set(Object.keys(KNOWLEDGE_POINT_GROUPS));
        for (const q of questions) {
            const { group } = parseKnowledgePoint(q.knowledge_point);
            if (group) groups.add(group);
        }
        return Array.from(groups);
    }, [questions]);

    /** Second-level detail options for the currently selected group filter. */
    const detailFilterOptions = useMemo(() => {
        if (!groupFilter) return [];
        const details = new Set<string>(KNOWLEDGE_POINT_GROUPS[groupFilter] ?? []);
        for (const q of questions) {
            const { group, detail } = parseKnowledgePoint(q.knowledge_point);
            if (group === groupFilter && detail) details.add(detail);
        }
        return Array.from(details);
    }, [groupFilter, questions]);

    /** Questions after applying all active filters. */
    const filteredQuestions = useMemo(() => {
        return questions.filter(q => {
            if (searchTerm && !q.question_text.toLowerCase().includes(searchTerm)) return false;
            if (typeFilter && q.question_type !== typeFilter) return false;
            if (groupFilter) {
                const { group, detail } = parseKnowledgePoint(q.knowledge_point);
                if (group !== groupFilter) return false;
                if (detailFilter && detail !== detailFilter) return false;
            }
            return true;
        });
    }, [questions, searchTerm, typeFilter, groupFilter, detailFilter]);

    // ── Handlers ─────────────────────────────────────────────────────────────

    const openPreview = (question: Question) => {
        setPreviewQuestion(question);
    };

    const openEditor = (question: Question | null) => {
        setEditingQuestion(question);
        if (question) {
            const { group, detail } = parseKnowledgePoint(question.knowledge_point);
            const answers = resolveAnswerValues(question.correct_answers, question.options);
            form.setFieldsValue({
                question_text: question.question_text,
                question_type: question.question_type,
                knowledge_point_group: group ?? undefined,
                knowledge_point_detail: detail ?? undefined,
                options: normalizeOptionsToArray(question.options),
                correct_answers: question.question_type === 'Multiple Choice'
                    ? answers
                    : answers[0] ?? undefined,
            });
        } else {
            form.resetFields();
        }
        setEditorOpen(true);
    };

    const closeEditor = () => {
        setEditorOpen(false);
        setEditingQuestion(null);
        form.resetFields();
    };

    /**
     * When the options list changes, drop any selected correct_answers that are
     * no longer present in the options so the form stays consistent.
     */
    const handleOptionsChange = () => {
        const type = form.getFieldValue('question_type') as QuestionTypeApi | undefined;
        if (!type || type === 'True/False') return;

        const validOptions = new Set(toStringArray(form.getFieldValue('options')));
        const currentAnswers = form.getFieldValue('correct_answers');

        if (type === 'Multiple Choice') {
            const retained = Array.isArray(currentAnswers)
                ? currentAnswers.filter((a: string) => validOptions.has(a))
                : [];
            form.setFieldValue('correct_answers', retained.length > 0 ? retained : undefined);
        } else {
            if (currentAnswers && !validOptions.has(currentAnswers as string)) {
                form.setFieldValue('correct_answers', undefined);
            }
        }
    };

    const handleSave = async (values: QuestionFormValues) => {
        setIsSaving(true);
        try {
            const isTrueFalse = values.question_type === 'True/False';
            const payload = {
                question_text: values.question_text.trim(),
                question_type: values.question_type,
                knowledge_point: values.knowledge_point_group && values.knowledge_point_detail
                    ? `${values.knowledge_point_group}-${values.knowledge_point_detail}`
                    : undefined,
                // True/False options are managed by the backend; omit them from the payload
                options: isTrueFalse ? undefined : toStringArray(values.options),
                correct_answers: toStringArray(values.correct_answers),
            };

            if (isEditing && editingQuestion) {
                await apiClient.put(`/question-bank/questions/${editingQuestion.question_id}`, payload);
                setQuestions(prev => prev.map(q =>
                    q.question_id === editingQuestion.question_id
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
                const created = await apiClient.post<Question>('/question-bank/questions', payload);
                setQuestions(prev => [...prev, created]);
                message.success('题目创建成功');
            }
            closeEditor();
        } catch (err: unknown) {
            message.error(getErrorMessage(err, '保存失败'));
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async (questionId: number) => {
        try {
            await apiClient.delete(`/question-bank/questions/${questionId}`);
            setQuestions(prev => prev.filter(q => q.question_id !== questionId));
            message.success('题目已删除');
        } catch (err: unknown) {
            message.error(getErrorMessage(err, '删除失败'));
        }
    };

    // ── Table columns ─────────────────────────────────────────────────────────

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
                    <span>{text.length > 50 ? `${text.slice(0, 50)}…` : text}</span>
                </Tooltip>
            ),
        },
        {
            title: '类型',
            dataIndex: 'question_type',
            key: 'question_type',
            width: 100,
            render: (type: QuestionTypeApi) => {
                const cfg = QUESTION_TYPE_CONFIG[type];
                return <Tag color={cfg?.color ?? 'default'}>{cfg?.label ?? type}</Tag>;
            },
        },
        {
            title: '知识点',
            dataIndex: 'knowledge_point',
            key: 'knowledge_point',
            width: 150,
            render: (kp: string | null) => normalizeKnowledgePoint(kp) ?? '—',
        },
        {
            title: '正确答案',
            key: 'correct_answer',
            width: 100,
            render: (_: unknown, q: Question) =>
                q.correct_answers?.length ? q.correct_answers.join(', ') : '—',
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

    // ── Render ────────────────────────────────────────────────────────────────

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
            {/* Header */}
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
                            value={searchInput}
                            onChange={e => setSearchInput(e.target.value)}
                            style={{ width: 200 }}
                            allowClear
                        />
                    </div>
                    <div>
                        <Text strong style={{ marginRight: 8 }}>题目类型</Text>
                        <Select
                            value={typeFilter}
                            onChange={setTypeFilter}
                            style={{ width: 120 }}
                            placeholder="全部"
                            allowClear
                        >
                            {Object.entries(QUESTION_TYPE_CONFIG).map(([key, val]) => (
                                <Option key={key} value={key}>{val.label}</Option>
                            ))}
                        </Select>
                    </div>
                    <div>
                        <Text strong style={{ marginRight: 8 }}>一级知识点</Text>
                        <Select
                            value={groupFilter ?? undefined}
                            onChange={(val) => {
                                setGroupFilter(val ?? null);
                                setDetailFilter(null);
                            }}
                            style={{ width: 140 }}
                            placeholder="全部"
                            allowClear
                        >
                            {groupFilterOptions.map((g) => (
                                <Option key={g} value={g}>{g}</Option>
                            ))}
                        </Select>
                    </div>
                    <div>
                        <Text strong style={{ marginRight: 8 }}>二级知识点</Text>
                        <Select
                            value={detailFilter ?? undefined}
                            onChange={(val) => setDetailFilter(val ?? null)}
                            style={{ width: 180 }}
                            placeholder="全部"
                            allowClear
                            disabled={!groupFilter}
                        >
                            {detailFilterOptions.map((d) => (
                                <Option key={d} value={d}>{d}</Option>
                            ))}
                        </Select>
                    </div>
                </Space>
            </Card>

            {fetchError && <Alert description={fetchError} type="error" showIcon style={{ marginBottom: 16 }} />}

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
                open={previewQuestion !== null}
                onCancel={() => setPreviewQuestion(null)}
                footer={null}
                width={600}
            >
                {previewQuestion && (
                    <div>
                        <Paragraph>
                            <Tag color={QUESTION_TYPE_CONFIG[previewQuestion.question_type]?.color}>
                                {QUESTION_TYPE_CONFIG[previewQuestion.question_type]?.label ?? previewQuestion.question_type}
                            </Tag>
                            {previewQuestion.knowledge_point && (
                                <Tag>{previewQuestion.knowledge_point}</Tag>
                            )}
                        </Paragraph>
                        <Title level={5}>{previewQuestion.question_text}</Title>
                        {previewQuestion.options && typeof previewQuestion.options === 'object' && (
                            <div style={{ marginTop: 16 }}>
                                {Array.isArray(previewQuestion.options)
                                    ? previewQuestion.options.map((opt: string, idx: number) => (
                                        <div key={idx} style={{ marginBottom: 8 }}>
                                            <Text>{String.fromCharCode(65 + idx)}. {opt}</Text>
                                        </div>
                                    ))
                                    : Object.entries(previewQuestion.options).map(([key, val]) => (
                                        <div key={key} style={{ marginBottom: 8 }}>
                                            <Text>{key}. {val}</Text>
                                        </div>
                                    ))
                                }
                            </div>
                        )}
                        <Alert
                            message={`正确答案：${previewQuestion.correct_answers?.length ? previewQuestion.correct_answers.join(', ') : '—'}`}
                            type="success"
                            style={{ marginTop: 16 }}
                        />
                    </div>
                )}
            </Modal>

            {/* Editor Modal (create or edit) */}
            <Modal
                title={isEditing ? '编辑题目' : '新增题目'}
                open={editorOpen}
                onCancel={closeEditor}
                onOk={() => form.submit()}
                confirmLoading={isSaving}
                okText="保存"
                cancelText="取消"
                width={700}
            >
                <Form
                    form={form}
                    layout="vertical"
                    onFinish={handleSave}
                    onValuesChange={(changed) => {
                        if ('options' in changed) handleOptionsChange();
                    }}
                >
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
                            {Object.entries(QUESTION_TYPE_CONFIG).map(([key, val]) => (
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

                    {/* 二级知识点 — cascades from 一级 selection */}
                    <Form.Item
                        noStyle
                        shouldUpdate={(prev, cur) => prev.knowledge_point_group !== cur.knowledge_point_group}
                    >
                        {({ getFieldValue }) => {
                            const group = getFieldValue('knowledge_point_group') as string | undefined;
                            const detailOptions = group ? (KNOWLEDGE_POINT_GROUPS[group] ?? []) : [];
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

                    {/* Options — hidden for True/False (options are fixed on the backend) */}
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
                                            if (toStringArray(value).length < 2) {
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

                    {/* Correct answers — options depend on question_type and current options list */}
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

                            const options = toStringArray(getFieldValue('options'));
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
