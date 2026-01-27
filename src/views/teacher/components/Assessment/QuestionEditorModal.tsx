import React, { useState, useEffect, useMemo } from 'react';
import Modal from '@/views/teacher/components/common/Modal';
import Button from '@/views/teacher/components/common/Button';
import { apiClient } from '@/utils/apiClient';
import { validateQuestionText, validateQuestionOption } from '@/views/teacher/utils/validation';
import type { Question, QuestionTypeApi } from '@/views/teacher/types';

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

interface QuestionEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingQuestion: Question | null;
  onSuccess: (updatedQuestion: Question | null, isNew: boolean) => void;
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
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

export const QuestionEditorModal: React.FC<QuestionEditorModalProps> = ({
  isOpen,
  onClose,
  editingQuestion,
  onSuccess,
  showToast,
}) => {
  const defaultKnowledge = getDefaultKnowledgeSelection();
  const [editorState, setEditorState] = useState<QuestionFormState>({
    questionText: '',
    questionType: 'single',
    knowledgePrimary: defaultKnowledge.primary,
    knowledgeSecondary: defaultKnowledge.secondary,
    options: getDefaultChoiceOptions(),
    correctAnswers: [],
  });
  const [isSaving, setIsSaving] = useState(false);

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

  useEffect(() => {
    if (isOpen) {
      if (editingQuestion) {
        const formType = API_TYPE_TO_FORM_TYPE[editingQuestion.question_type];
        const options = normalizeOptions(editingQuestion, formType);
        const correctAnswers = editingQuestion.correct_answers ?? [];
        const { primary, secondary } = parseKnowledgePoint(editingQuestion.knowledge_point ?? null);

        setEditorState({
          questionText: editingQuestion.question_text,
          knowledgePrimary: primary,
          knowledgeSecondary: secondary,
          questionType: formType,
          options,
          correctAnswers,
        });
      } else {
        const defaults = getDefaultKnowledgeSelection();
        setEditorState({
          questionText: '',
          questionType: 'single',
          knowledgePrimary: defaults.primary,
          knowledgeSecondary: defaults.secondary,
          options: getDefaultChoiceOptions(),
          correctAnswers: [],
        });
      }
      setIsSaving(false);
    }
  }, [isOpen, editingQuestion]);

  const secondaryKnowledgeOptions = useMemo(
    () => KNOWLEDGE_POINT_GROUPS[editorState.knowledgePrimary] ?? [],
    [editorState.knowledgePrimary],
  );

  const primaryKnowledgeOptions = useMemo(() => PRIMARY_KNOWLEDGE_POINTS, []);

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
      ? editorState.correctAnswers
          .map((key) => DEFAULT_BOOLEAN_OPTIONS.find((opt) => opt.key === key)?.value ?? key)
          .map((v) => v.trim())
          .filter((answer) => answer === '正确' || answer === '错误')
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
    const questionValidation = validateQuestionText(editorState.questionText);
    if (!questionValidation.valid) return false;

    if (
      !editorState.knowledgePrimary.trim() ||
      !editorState.knowledgeSecondary.trim()
    ) {
      return false;
    }

    if (editorState.correctAnswers.length === 0) return false;

    if (editorState.questionType !== 'boolean') {
      const filledOptions = editorState.options.filter((option) => option.value.trim());
      if (filledOptions.length < 2) return false;

      for (const option of filledOptions) {
        const optionValidation = validateQuestionOption(option.value);
        if (!optionValidation.valid) return false;
      }

      const filledKeys = new Set(filledOptions.map((option) => option.key));
      if (!editorState.correctAnswers.every((answer) => filledKeys.has(answer))) return false;
      if (editorState.questionType === 'single' && editorState.correctAnswers.length !== 1) return false;
    } else {
      if (!editorState.correctAnswers.every((answer) => answer === 'true' || answer === 'false')) return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    const questionValidation = validateQuestionText(editorState.questionText);
    if (!questionValidation.valid) {
      showToast(questionValidation.error || '题目内容验证失败', 'error');
      return;
    }

    if (
      !editorState.knowledgePrimary.trim() ||
      !editorState.knowledgeSecondary.trim()
    ) {
      showToast('请选择知识点', 'error');
      return;
    }

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
      let result;
      if (editingQuestion) {
        result = await apiClient.put(`/question-bank/questions/${editingQuestion.question_id}`, payload);
        showToast('题目更新成功', 'success');
        onSuccess(result as Question, false);
      } else {
        await apiClient.post('/question-bank/questions', payload);
        showToast('题目创建成功', 'success');
        onSuccess(null, true);
      }
      onClose();
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
              value={option.key}
              checked={editorState.correctAnswers.includes(option.key)}
              onChange={() => handleBooleanSelect(option.key)}
            />
            <span className="text-gray-700">{option.value}</span>
          </label>
        ))}
      </div>
    );
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
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
          <Button variant="outline" onClick={onClose}>
            取消
          </Button>
          <Button onClick={handleSubmit} disabled={!canSubmit() || isSaving}>
            {isSaving ? '保存中...' : '保存修改'}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
