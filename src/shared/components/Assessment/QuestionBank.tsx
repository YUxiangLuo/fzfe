import React, { useEffect, useMemo, useState } from 'react';
import { Eye, Edit2, RefreshCcw, Search, AlertCircle, Plus } from 'lucide-react';
import type { Question, QuestionTypeApi } from '@/shared/types';
import Modal from '@/shared/components/common/Modal';
import Button from '@/shared/components/common/Button';
import { apiClient } from '@/utils/apiClient';
import { validateQuestionText, validateQuestionOption } from '@/shared/utils/validation';
import { useToast } from '@/shared/hooks/useToast';
import { Toast } from '@/shared/components/common/Toast';
import { ConfirmDialog } from '@/shared/components/common/ConfirmDialog';
import { useConfirm } from '@/shared/hooks/useConfirm';

type QuestionFormType = 'single' | 'multiple' | 'boolean';

interface QuestionOption {
  key: string;
  value: string;
}

interface QuestionFormState {
  questionText: string;
  questionType: QuestionFormType;
  knowledgePrimary: string;
  knowledgeSecondary: string;
  options: QuestionOption[];
  correctAnswers: string[];
}

const KNOWLEDGE_POINT_GROUPS: Record<string, string[]> = {
  预测模型: [
    '时间序列基础',
    '移动平均法(MA)',
    '指数平滑法(ES)',
    'ARIMA模型',
    'LSTM深度学习',
    '模型融合技术',
    '模型评估指标',
  ],
  生产计划: [
    'MPS基本原理',
    '安全库存策略',
    '投入产出计算',
    '库存与缺货',
    '服务水平评估',
    '产能规划',
  ],
};

const PRIMARY_KNOWLEDGE_POINTS = Object.keys(KNOWLEDGE_POINT_GROUPS);

const getDefaultKnowledgeSelection = () => {
  const primary = PRIMARY_KNOWLEDGE_POINTS[0] ?? '';
  const secondary = primary ? KNOWLEDGE_POINT_GROUPS[primary]?.[0] ?? '' : '';
  return { primary, secondary };
};

const parseKnowledgePoint = (value: string | null) => {
  const defaults = getDefaultKnowledgeSelection();
  if (!value) return defaults;

  const trimmed = value.trim();
  if (!trimmed) return defaults;

  if (trimmed.includes('-')) {
    const [primary, secondary] = trimmed.split('-');
    if (primary && secondary && KNOWLEDGE_POINT_GROUPS[primary]?.includes(secondary)) {
      return { primary, secondary };
    }
  }

  for (const [primary, secondaryList] of Object.entries(KNOWLEDGE_POINT_GROUPS)) {
    if (secondaryList.includes(trimmed)) {
      return { primary, secondary: trimmed };
    }
  }

  return defaults;
};

const API_TYPE_TO_FORM_TYPE: Record<QuestionTypeApi, QuestionFormType> = {
  'Single Choice': 'single',
  'Multiple Choice': 'multiple',
  'True/False': 'boolean',
};

const FORM_TYPE_TO_API_TYPE: Record<QuestionFormType, QuestionTypeApi> = {
  single: 'Single Choice',
  multiple: 'Multiple Choice',
  boolean: 'True/False',
};

const DEFAULT_BOOLEAN_OPTIONS: QuestionOption[] = [
  { key: 'true', value: '正确' },
  { key: 'false', value: '错误' },
];

const DEFAULT_CHOICE_OPTIONS: QuestionOption[] = [
  { key: 'A', value: '' },
  { key: 'B', value: '' },
  { key: 'C', value: '' },
  { key: 'D', value: '' },
];

const getDefaultBooleanOptions = (): QuestionOption[] => DEFAULT_BOOLEAN_OPTIONS.map((option) => ({ ...option }));

const getDefaultChoiceOptions = (): QuestionOption[] => DEFAULT_CHOICE_OPTIONS.map((option) => ({ ...option }));

const QuestionBank: React.FC = () => {
  const { toast, showToast, hideToast } = useToast();
  const confirm = useConfirm();
  const defaultKnowledge = getDefaultKnowledgeSelection();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');

  const [selectedKnowledgePoint, setSelectedKnowledgePoint] = useState<string | null>(null);

  const [selectedQuestion, setSelectedQuestion] = useState<Question | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editorState, setEditorState] = useState<QuestionFormState>({
    questionText: '',
    questionType: 'single',
    knowledgePrimary: defaultKnowledge.primary,
    knowledgeSecondary: defaultKnowledge.secondary,
    options: getDefaultChoiceOptions(),
    correctAnswers: [],
  });
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState<number | null>(null);

  const secondaryKnowledgeOptions = useMemo(
    () => KNOWLEDGE_POINT_GROUPS[editorState.knowledgePrimary] ?? [],
    [editorState.knowledgePrimary],
  );

  const handleDeleteQuestion = async (questionId: number) => {
    const confirmed = await confirm.showConfirm(
      '删除题目',
      '确定要永久删除这道题目吗？此操作不可撤销。',
      'danger'
    );
    if (!confirmed) return;

    setIsDeleting(questionId);
    try {
      await apiClient.delete(`/question-bank/questions/${questionId}`);
      setQuestions((prev) => prev.filter((q) => q.question_id !== questionId));
      showToast('题目删除成功', 'success');
    } catch (err: any) {
      showToast(`删除失败: ${err.message}`, 'error');
    } finally {
      setIsDeleting(null);
    }
  };

  useEffect(() => {
    const handler = window.setTimeout(() => {
      setDebouncedSearchTerm(searchTerm.trim().toLowerCase());
    }, 250);

    return () => window.clearTimeout(handler);
  }, [searchTerm]);

  useEffect(() => {
    fetchQuestions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchQuestions = async () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    setError(null);
    try {
      const response = await apiClient.get('/question-bank/questions');
      if (Array.isArray(response)) {
        setQuestions(response as Question[]);
        showToast('题库刷新成功', 'success');
      } else {
        setQuestions([]);
      }
    } catch (err: any) {
      setError(err.message || '获取题库失败');
      setQuestions([]);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const allSecondaryKnowledgePoints = useMemo(() => {
    const points = new Set<string>();
    questions.forEach((question) => {
      if (question.knowledge_point) {
        const parts = question.knowledge_point.split('-');
        if (parts.length > 1) {
          const secondaryPoint = parts[parts.length - 1];
          if (secondaryPoint) {
            points.add(secondaryPoint);
          }
        }
      }
    });
    return Array.from(points).sort();
  }, [questions]);

  const filteredQuestions = useMemo(() => {
    let results = questions;

    if (selectedKnowledgePoint) {
      results = results.filter((question) => {
        if (!question.knowledge_point) return false;
        const parts = question.knowledge_point.split('-');
        return parts.length > 1 && parts[parts.length - 1] === selectedKnowledgePoint;
      });
    }

    if (!debouncedSearchTerm) return results;

    return results.filter((question) => {
      const content = question.question_text.toLowerCase();
      const knowledge = (question.knowledge_point || '').toLowerCase();
      const creator = (question.creator_name || '').toLowerCase();
      return (
        content.includes(debouncedSearchTerm) ||
        knowledge.includes(debouncedSearchTerm) ||
        creator.includes(debouncedSearchTerm)
      );
    });
  }, [questions, debouncedSearchTerm, selectedKnowledgePoint, allSecondaryKnowledgePoints]);

  const primaryKnowledgeOptions = useMemo(() => PRIMARY_KNOWLEDGE_POINTS, []);

  const statistics = useMemo(() => {
    const total = questions.length;
    const single = questions.filter((q) => q.question_type === 'Single Choice').length;
    const multiple = questions.filter((q) => q.question_type === 'Multiple Choice').length;
    const booleanCount = questions.filter((q) => q.question_type === 'True/False').length;
    return { total, single, multiple, booleanCount };
  }, [questions]);

  const openPreview = (question: Question) => {
    setSelectedQuestion(question);
    setIsPreviewOpen(true);
  };

  const closePreview = () => {
    setSelectedQuestion(null);
    setIsPreviewOpen(false);
  };

  const normalizeOptions = (question: Question, formType: QuestionFormType): QuestionOption[] => {
    if (formType === 'boolean') {
      if (Array.isArray(question.options) && question.options.length >= 2) {
        return question.options.map((value, index) => ({
          key: index === 0 ? 'true' : 'false',
          value,
        }));
      }
      return getDefaultBooleanOptions();
    }

    if (question.options && !Array.isArray(question.options)) {
      const normalized = Object.entries(question.options).map(([key, value]) => ({ key, value }));
      while (normalized.length < 2) {
        const nextKey = String.fromCharCode(65 + normalized.length);
        normalized.push({ key: nextKey, value: '' });
      }
      return normalized;
    }

    return getDefaultChoiceOptions();
  };

  const openEditor = (question: Question) => {
    const formType = API_TYPE_TO_FORM_TYPE[question.question_type];
    const options = normalizeOptions(question, formType);
    const correctAnswers = question.correct_answers ?? [];
    const { primary, secondary } = parseKnowledgePoint(question.knowledge_point ?? null);

    setEditingQuestion(question);
    setEditorState({
      questionText: question.question_text,
      knowledgePrimary: primary,
      knowledgeSecondary: secondary,
      questionType: formType,
      options,
      correctAnswers,
    });
    setIsEditorOpen(true);
  };

  const closeEditor = () => {
    setEditingQuestion(null);
    setIsEditorOpen(false);
    const defaults = getDefaultKnowledgeSelection();
    setEditorState({
      questionText: '',
      questionType: 'single',
      knowledgePrimary: defaults.primary,
      knowledgeSecondary: defaults.secondary,
      options: getDefaultChoiceOptions(),
      correctAnswers: [],
    });
    setIsSaving(false);
  };

  const openCreate = () => {
    setEditingQuestion(null);
    const defaults = getDefaultKnowledgeSelection();
    setEditorState({
      questionText: '',
      questionType: 'single',
      knowledgePrimary: defaults.primary,
      knowledgeSecondary: defaults.secondary,
      options: getDefaultChoiceOptions(),
      correctAnswers: [],
    });
    setIsEditorOpen(true);
  };

  const handleTypeChange = (type: QuestionFormType) => {
    setEditorState((prev) => ({
      ...prev,
      questionType: type,
      options: type === 'boolean' ? getDefaultBooleanOptions() : getDefaultChoiceOptions(),
      correctAnswers: [],
    }));
  };

  const handlePrimaryKnowledgeChange = (primary: string) => {
    setEditorState((prev) => {
      const secondaryOptions = KNOWLEDGE_POINT_GROUPS[primary] ?? [];
      const nextSecondary = secondaryOptions.includes(prev.knowledgeSecondary)
        ? prev.knowledgeSecondary
        : secondaryOptions[0] ?? '';
      return {
        ...prev,
        knowledgePrimary: primary,
        knowledgeSecondary: nextSecondary,
      };
    });
  };

  const handleSecondaryKnowledgeChange = (secondary: string) => {
    setEditorState((prev) => ({
      ...prev,
      knowledgeSecondary: secondary,
    }));
  };

  const handleOptionChange = (index: number, value: string) => {
    setEditorState((prev) => {
      const options = [...prev.options];
      const baseOption = options[index] ?? { key: String.fromCharCode(65 + index), value: '' };
      options[index] = { ...baseOption, value };
      return { ...prev, options };
    });
  };

  const handleAddOption = () => {
    setEditorState((prev) => {
      if (prev.questionType === 'boolean' || prev.options.length >= 6) return prev;
      const existingKeys = prev.options.map((option) => option.key.charCodeAt(0));
      const nextCharCode = existingKeys.length ? Math.max(...existingKeys) + 1 : 65;
      const nextKey = String.fromCharCode(nextCharCode);
      return {
        ...prev,
        options: [...prev.options, { key: nextKey, value: '' }],
      };
    });
  };

  const handleRemoveOption = (index: number) => {
    setEditorState((prev) => {
      if (prev.questionType === 'boolean' || prev.options.length <= 2) return prev;
      const removedOption = prev.options[index];
      if (!removedOption) return prev;
      const nextOptions = prev.options.filter((_, i) => i !== index);
      const nextCorrect = prev.correctAnswers.filter((answer) => answer !== removedOption.key);
      return {
        ...prev,
        options: nextOptions,
        correctAnswers: nextCorrect,
      };
    });
  };

  const handleSingleChoiceSelect = (key: string) => {
    setEditorState((prev) => ({
      ...prev,
      correctAnswers: [key],
    }));
  };

  const handleMultipleChoiceToggle = (key: string) => {
    setEditorState((prev) => {
      const exists = prev.correctAnswers.includes(key);
      return {
        ...prev,
        correctAnswers: exists
          ? prev.correctAnswers.filter((answer) => answer !== key)
          : [...prev.correctAnswers, key],
      };
    });
  };

  const handleBooleanSelect = (value: string) => {
    setEditorState((prev) => ({
      ...prev,
      correctAnswers: [value],
    }));
  };

  const buildPayload = () => {
    const question_type = FORM_TYPE_TO_API_TYPE[editorState.questionType];
    const question_text = editorState.questionText.trim();
    const primary = editorState.knowledgePrimary.trim();
    const secondary = editorState.knowledgeSecondary.trim();
    const knowledge_point = primary && secondary ? `${primary}-${secondary}` : null;

    let options: Record<string, string> | string[] | undefined;
    if (editorState.questionType === 'boolean') {
      const cleaned = editorState.options.map((option) => option.value.trim()).filter(Boolean);
      options = cleaned.length >= 2 ? cleaned : DEFAULT_BOOLEAN_OPTIONS.map((option) => option.value);
    } else {
      options = editorState.options
        .filter((option) => option.value.trim())
        .reduce<Record<string, string>>((acc, option, index) => {
          const key = option.key || String.fromCharCode(65 + index);
          acc[key] = option.value.trim();
          return acc;
        }, {});
    }

    const correct_answers = editorState.questionType === 'boolean'
      ? editorState.correctAnswers.map((answer) => answer.trim()).filter((answer) => answer === '正确' || answer === '错误')
      : editorState.correctAnswers.filter(Boolean);

    return {
      question_type,
      question_text,
      knowledge_point,
      options,
      correct_answers,
    };
  };

  const canSubmit = () => {
    // 验证题目内容
    const questionValidation = validateQuestionText(editorState.questionText);
    if (!questionValidation.valid) return false;

    // 验证知识点
    if (
      !editorState.knowledgePrimary.trim() ||
      !editorState.knowledgeSecondary.trim()
    ) {
      return false;
    }

    // 验证正确答案
    if (editorState.correctAnswers.length === 0) return false;

    if (editorState.questionType !== 'boolean') {
      const filledOptions = editorState.options.filter((option) => option.value.trim());
      if (filledOptions.length < 2) return false;

      // 验证每个选项内容
      for (const option of filledOptions) {
        const optionValidation = validateQuestionOption(option.value);
        if (!optionValidation.valid) return false;
      }

      const filledKeys = new Set(filledOptions.map((option) => option.key));
      if (!editorState.correctAnswers.every((answer) => filledKeys.has(answer))) return false;
      if (editorState.questionType === 'single' && editorState.correctAnswers.length !== 1) return false;
    } else {
      if (!editorState.correctAnswers.every((answer) => answer === '正确' || answer === '错误')) return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    // 提交前验证题目内容
    const questionValidation = validateQuestionText(editorState.questionText);
    if (!questionValidation.valid) {
      showToast(questionValidation.error || '题目内容验证失败', 'error');
      return;
    }

    // 验证知识点
    if (
      !editorState.knowledgePrimary.trim() ||
      !editorState.knowledgeSecondary.trim()
    ) {
      showToast('请选择知识点', 'error');
      return;
    }

    // 验证选项（非判断题）
    if (editorState.questionType !== 'boolean') {
      const filledOptions = editorState.options.filter((option) => option.value.trim());
      for (const option of filledOptions) {
        const optionValidation = validateQuestionOption(option.value);
        if (!optionValidation.valid) {
          showToast(`选项 ${option.key}: ${optionValidation.error}`, 'error');
          return;
        }
      }

      if (filledOptions.length < 2) {
        showToast('请至少填写2个选项', 'error');
        return;
      }
    }

    // 验证正确答案
    if (editorState.correctAnswers.length === 0) {
      showToast('请选择正确答案', 'error');
      return;
    }

    if (editorState.questionType === 'single' && editorState.correctAnswers.length !== 1) {
      showToast('单选题只能有一个正确答案', 'error');
      return;
    }

    const payload = buildPayload();

    try {
      setIsSaving(true);
      if (editingQuestion) {
        const updated = await apiClient.put(`/question-bank/questions/${editingQuestion.question_id}`, payload);
        setQuestions((prev) =>
          prev.map((question) =>
            question.question_id === editingQuestion.question_id
              ? (updated as Question)
              : question,
          ),
        );
        showToast('题目更新成功', 'success');
      } else {
        await apiClient.post('/question-bank/questions', payload);
        await fetchQuestions();
        showToast('题目创建成功', 'success');
      }
      closeEditor();
    } catch (err: any) {
      showToast(err.message || (editingQuestion ? '更新题目失败' : '创建题目失败'), 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const renderCorrectAnswerEditor = () => {
    if (editorState.questionType === 'single') {
      return (
        <div className="space-y-2">
          {editorState.options.map((option, index) => {
            const optionKey = option.key || String.fromCharCode(65 + index);
            return (
              <label key={optionKey} className="flex items-center space-x-2 text-sm">
                <input
                  type="radio"
                  name="single-answer"
                  className="text-blue-600 focus:ring-blue-500"
                  value={optionKey}
                  checked={editorState.correctAnswers.includes(optionKey)}
                  onChange={() => handleSingleChoiceSelect(optionKey)}
                  disabled={!option.value.trim()}
                />
                <span className="text-gray-700">{option.value || `选项${optionKey}`}</span>
              </label>
            );
          })}
        </div>
      );
    }

    if (editorState.questionType === 'multiple') {
      return (
        <div className="space-y-2">
          {editorState.options.map((option, index) => {
            const optionKey = option.key || String.fromCharCode(65 + index);
            return (
              <label key={optionKey} className="flex items-center space-x-2 text-sm">
                <input
                  type="checkbox"
                  className="text-blue-600 focus:ring-blue-500"
                  value={optionKey}
                  checked={editorState.correctAnswers.includes(optionKey)}
                  onChange={() => handleMultipleChoiceToggle(optionKey)}
                  disabled={!option.value.trim()}
                />
                <span className="text-gray-700">{option.value || `选项${optionKey}`}</span>
              </label>
            );
          })}
        </div>
      );
    }

    return (
      <div className="space-y-2">
        {editorState.options.map((option) => (
          <label key={option.key} className="flex items-center space-x-2 text-sm">
            <input
              type="radio"
              name="boolean-answer"
              className="text-blue-600 focus:ring-blue-500"
              value={option.value}
              checked={editorState.correctAnswers.includes(option.value)}
              onChange={() => handleBooleanSelect(option.value)}
            />
            <span className="text-gray-700">{option.value}</span>
          </label>
        ))}
      </div>
    );
  };

  const getTypeBadge = (questionType: QuestionTypeApi) => {
    const map: Record<QuestionTypeApi, { label: string; className: string }> = {
      'Single Choice': { label: '单选题', className: 'bg-blue-100 text-blue-800' },
      'Multiple Choice': { label: '多选题', className: 'bg-green-100 text-green-800' },
      'True/False': { label: '判断题', className: 'bg-orange-100 text-orange-800' },
    };
    return map[questionType];
  };

  const formatCorrectAnswers = (question: Question) => {
    if (question.question_type === 'True/False') {
      return question.correct_answers.join('、');
    }

    if (question.options && !Array.isArray(question.options)) {
      const optionMap = question.options as Record<string, string>;
      return question.correct_answers
        .map((key) => (optionMap[key] ? `${key}.${optionMap[key]}` : key))
        .join('、');
    }

    return question.correct_answers.join('、');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between md:space-x-4 space-y-3 md:space-y-0">
        <h1 className="text-2xl font-bold text-gray-900">题库管理</h1>
        <Button onClick={fetchQuestions} variant="outline" disabled={isRefreshing}>
          <RefreshCcw size={16} className={isRefreshing ? 'mr-2 animate-spin' : 'mr-2'} />
          刷新题库
        </Button>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <input
            type="text"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="搜索题目内容、知识点或创建者..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <div className="mt-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium text-gray-700">知识点筛选:</span>
            <button
              type="button"
              onClick={() => setSelectedKnowledgePoint(null)}
              className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                !selectedKnowledgePoint
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              全部
            </button>
            <div className="h-5 w-px bg-gray-200" />
            {allSecondaryKnowledgePoints.map((secondary) => (
              <button
                key={secondary}
                type="button"
                onClick={() => setSelectedKnowledgePoint(secondary)}
                className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                  selectedKnowledgePoint === secondary
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {secondary}
              </button>
            ))}
          </div>
        </div>
        {error && (
          <div className="mt-4 flex items-center space-x-2 text-sm text-red-600">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="text-center">
            <p className="text-3xl font-bold text-blue-600">{statistics.total}</p>
            <p className="text-sm text-gray-600">总题目数</p>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="text-center">
            <p className="text-3xl font-bold text-blue-600">{statistics.single}</p>
            <p className="text-sm text-gray-600">单选题</p>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="text-center">
            <p className="text-3xl font-bold text-green-600">{statistics.multiple}</p>
            <p className="text-sm text-gray-600">多选题</p>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="text-center">
            <p className="text-3xl font-bold text-orange-600">{statistics.booleanCount}</p>
            <p className="text-sm text-gray-600">判断题</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">题目列表</h2>
          <Button onClick={openCreate}>
            <Plus size={16} className="mr-2" />
            新建题目
          </Button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">序号</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">题目内容</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">类型</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">知识点</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">创建者</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">操作</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                    正在加载题库...
                  </td>
                </tr>
              ) : filteredQuestions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                    {questions.length === 0 ? '题库暂无数据，请稍后重试。' : '未找到符合搜索条件的题目。'}
                  </td>
                </tr>
              ) : (
                filteredQuestions.map((question, index) => {
                  const badge = getTypeBadge(question.question_type);
                  return (
                    <tr key={question.question_id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm text-gray-500 align-top">{index + 1}</td>
                      <td className="px-6 py-4 text-sm text-gray-900 align-top min-w-[300px] whitespace-normal">
                        {question.question_text}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700 align-top whitespace-nowrap">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${badge.className}`}>
                          {badge.label}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700 align-top whitespace-nowrap">
                        {question.knowledge_point || '—'}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500 align-top whitespace-nowrap">
                        {question.creator_name || '—'}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700 align-top">
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => openPreview(question)}
                            className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors flex items-center cursor-pointer whitespace-nowrap"
                          >
                            <Eye size={14} className="mr-1" />
                            <span>预览</span>
                          </button>
                          <button
                            onClick={() => openEditor(question)}
                            className="px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors flex items-center cursor-pointer whitespace-nowrap"
                          >
                            <Edit2 size={14} className="mr-1" />
                            <span>编辑</span>
                          </button>
                          <button
                            onClick={() => handleDeleteQuestion(question.question_id)}
                            disabled={isDeleting === question.question_id}
                            className="px-3 py-1.5 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors flex items-center cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                          >
                            {isDeleting === question.question_id ? '删除中...' : '删除'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal
        isOpen={isPreviewOpen && !!selectedQuestion}
        onClose={closePreview}
        title="题目预览"
        size="medium"
      >
        {selectedQuestion && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">{selectedQuestion.question_text}</h2>

            {selectedQuestion.question_type !== 'True/False' && selectedQuestion.options && !Array.isArray(selectedQuestion.options) && (
              <div className="space-y-2">
                {Object.entries(selectedQuestion.options).map(([key, value]) => (
                  <div key={key} className="flex items-start space-x-2 text-sm text-gray-700">
                    <span className="font-medium text-gray-900">{key}.</span>
                    <span>{value}</span>
                  </div>
                ))}
              </div>
            )}

            {Array.isArray(selectedQuestion.options) && (
              <div className="space-y-2">
                {selectedQuestion.options.map((value, index) => (
                  <div key={index} className="flex items-start space-x-2 text-sm text-gray-700">
                    <span className="font-medium text-gray-900">选项{index + 1}.</span>
                    <span>{value}</span>
                  </div>
                ))}
              </div>
            )}

            <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-sm text-green-700">
              <span className="font-semibold">正确答案：</span>
              {formatCorrectAnswers(selectedQuestion)}
            </div>
          </div>
        )}
      </Modal>

      <Modal
        isOpen={isEditorOpen}
        onClose={closeEditor}
        title={editingQuestion ? '编辑题目' : '创建题目'}
        size="large"
      >
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              题目内容 <span className="text-red-500">*</span>
            </label>
            <textarea
              value={editorState.questionText}
              onChange={(event) => setEditorState((prev) => ({ ...prev, questionText: event.target.value }))}
              rows={3}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="请输入题目内容"
              minLength={10}
              maxLength={500}
              required
            />
            <p className="mt-1 text-xs text-gray-500">
              10-500个字符
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">题目类型</label>
              <select
                value={editorState.questionType}
                onChange={(event) => handleTypeChange(event.target.value as QuestionFormType)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="single">单选题</option>
                <option value="multiple">多选题</option>
                <option value="boolean">判断题</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                关联知识点 <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <select
                  value={editorState.knowledgePrimary}
                  onChange={(event) => handlePrimaryKnowledgeChange(event.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                >
                  <option value="">请选择类别</option>
                  {primaryKnowledgeOptions.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
                <select
                  value={editorState.knowledgeSecondary}
                  onChange={(event) => handleSecondaryKnowledgeChange(event.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                  disabled={secondaryKnowledgeOptions.length === 0}
                >
                  <option value="">请选择知识点</option>
                  {secondaryKnowledgeOptions.map((point) => (
                    <option key={point} value={point}>
                      {point}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {editorState.questionType !== 'boolean' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-700">选项设置</label>
                <button
                  type="button"
                  className="text-sm text-blue-600 hover:text-blue-700 cursor-pointer"
                  onClick={handleAddOption}
                >
                  添加选项
                </button>
              </div>
              <div className="space-y-2">
                {editorState.options.map((option, index) => (
                  <div key={option.key || index} className="flex items-center space-x-2">
                    <span className="w-10 text-sm text-gray-500">{option.key || String.fromCharCode(65 + index)}</span>
                    <input
                      type="text"
                      value={option.value}
                      onChange={(event) => handleOptionChange(index, event.target.value)}
                      className="flex-1 border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="请输入选项内容"
                      maxLength={100}
                    />
                    {editorState.options.length > 2 && (
                      <button
                        type="button"
                        className="text-sm text-red-600 hover:text-red-700 cursor-pointer"
                        onClick={() => handleRemoveOption(index)}
                      >
                        删除
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              正确答案 <span className="text-red-500">*</span>
            </label>
            <div className="bg-gray-50 rounded-lg border border-gray-200 p-4">
              {renderCorrectAnswerEditor()}
            </div>
            <p className="mt-1 text-xs text-gray-500">
              {editorState.questionType === 'single' && '请选择一个正确答案'}
              {editorState.questionType === 'multiple' && '可以选择多个正确答案'}
              {editorState.questionType === 'boolean' && '请选择正确或错误'}
            </p>
          </div>

          <div className="flex justify-end space-x-3">
            <Button variant="outline" onClick={closeEditor}>
              取消
            </Button>
            <Button onClick={handleSubmit} disabled={!canSubmit() || isSaving}>
              {isSaving ? '保存中...' : '保存修改'}
            </Button>
          </div>
        </div>
      </Modal>
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={hideToast}
          position="bottom-right"
        />
      )}
      <ConfirmDialog
        isOpen={confirm.isOpen}
        title={confirm.title}
        message={confirm.message}
        variant={confirm.variant}
        onConfirm={confirm.handleConfirm}
        onCancel={confirm.handleCancel}
      />
    </div>
  );
};

export default QuestionBank;
