import React, { useEffect, useMemo, useState } from 'react';
import { Eye, Edit2, RefreshCcw, Search, AlertCircle, Plus } from 'lucide-react';
import type { Question, QuestionTypeApi } from '@/views/teacher/types';
import Modal from '@/views/teacher/components/shadcn/TeacherModal';
import Button from '@/views/teacher/components/shadcn/TeacherButton';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { apiClient } from '@/utils/apiClient';
import { useToast } from '@/views/teacher/hooks/useToast';
import { ConfirmDialog } from '@/views/teacher/components/shadcn/TeacherConfirmDialog';
import { useConfirm } from '@/views/teacher/hooks/useConfirm';
import { QuestionEditorModal } from './QuestionEditorModal';

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

const QuestionBank: React.FC = () => {
  const { showToast } = useToast();
  const confirm = useConfirm();
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
  const [isDeleting, setIsDeleting] = useState<number | null>(null);

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

  const openEditor = (question: Question) => {
    setEditingQuestion(question);
    setIsEditorOpen(true);
  };

  const closeEditor = () => {
    setEditingQuestion(null);
    setIsEditorOpen(false);
  };

  const openCreate = () => {
    setEditingQuestion(null);
    setIsEditorOpen(true);
  };

  const handleEditorSuccess = (updatedQuestion: Question | null, isNew: boolean) => {
    if (isNew) {
      fetchQuestions(); // Reload all to be safe, or we could append if API returns full object
    } else if (updatedQuestion) {
      setQuestions((prev) =>
        prev.map((question) =>
          question.question_id === updatedQuestion.question_id
            ? updatedQuestion
            : question,
        ),
      );
    }
  };

  const getTypeBadge = (questionType: QuestionTypeApi) => {
    const map: Record<QuestionTypeApi, { label: string; className: string }> = {
      'Single Choice': { label: '单选题', className: 'bg-primary/10 text-primary' },
      'Multiple Choice': { label: '多选题', className: 'bg-success/10 text-success' },
      'True/False': { label: '判断题', className: 'bg-warning/10 text-warning' },
    };
    return map[questionType] || { label: '未知题型', className: 'bg-muted text-foreground' };
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
        <h1 className="text-2xl font-bold text-foreground">题库管理</h1>
        <Button onClick={fetchQuestions} variant="outline" disabled={isRefreshing}>
          <RefreshCcw size={16} className={isRefreshing ? 'mr-2 animate-spin' : 'mr-2'} />
          刷新题库
        </Button>
      </div>

      <div className="bg-card rounded-lg shadow-md p-6">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
          <Input
            type="text"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="搜索题目内容、知识点或创建者..."
            aria-label="搜索题目内容、知识点或创建者"
            className="pl-10 pr-4 rounded-lg"
          />
        </div>
        <div className="mt-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium text-foreground">知识点筛选:</span>
            <button
              type="button"
              onClick={() => setSelectedKnowledgePoint(null)}
              className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                !selectedKnowledgePoint
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-foreground hover:bg-muted'
              }`}
            >
              全部
            </button>
            <div className="h-5 w-px bg-muted" />
            {allSecondaryKnowledgePoints.map((secondary) => (
              <button
                key={secondary}
                type="button"
                onClick={() => setSelectedKnowledgePoint(secondary)}
                className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                  selectedKnowledgePoint === secondary
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-foreground hover:bg-muted'
                }`}
              >
                {secondary}
              </button>
            ))}
          </div>
        </div>
        {error && (
          <div className="mt-4 flex items-center space-x-2 text-sm text-destructive">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-card rounded-lg shadow-md p-6">
          <div className="text-center">
            <p className="text-3xl font-bold text-primary">{statistics.total}</p>
            <p className="text-sm text-muted-foreground">总题目数</p>
          </div>
        </div>
        <div className="bg-card rounded-lg shadow-md p-6">
          <div className="text-center">
            <p className="text-3xl font-bold text-primary">{statistics.single}</p>
            <p className="text-sm text-muted-foreground">单选题</p>
          </div>
        </div>
        <div className="bg-card rounded-lg shadow-md p-6">
          <div className="text-center">
            <p className="text-3xl font-bold text-success">{statistics.multiple}</p>
            <p className="text-sm text-muted-foreground">多选题</p>
          </div>
        </div>
        <div className="bg-card rounded-lg shadow-md p-6">
          <div className="text-center">
            <p className="text-3xl font-bold text-warning">{statistics.booleanCount}</p>
            <p className="text-sm text-muted-foreground">判断题</p>
          </div>
        </div>
      </div>

      <div className="bg-card rounded-lg shadow-md">
        <div className="px-6 py-4 border-b border-border flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">题目列表</h2>
          <Button onClick={openCreate}>
            <Plus size={16} className="mr-2" />
            新建题目
          </Button>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted">
              <TableRow>
                <TableHead className="px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider whitespace-nowrap">序号</TableHead>
                <TableHead className="px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">题目内容</TableHead>
                <TableHead className="px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">类型</TableHead>
                <TableHead className="px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">知识点</TableHead>
                <TableHead className="px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">创建者</TableHead>
                <TableHead className="px-6 py-3 text-center text-xs font-medium text-muted-foreground uppercase tracking-wider">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="bg-card">
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="px-6 py-8 text-center text-muted-foreground">
                    正在加载题库...
                  </TableCell>
                </TableRow>
              ) : filteredQuestions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="px-6 py-8 text-center text-muted-foreground">
                    {questions.length === 0 ? '题库暂无数据，请稍后重试。' : '未找到符合搜索条件的题目。'}
                  </TableCell>
                </TableRow>
              ) : (
                filteredQuestions.map((question, index) => {
                  const badge = getTypeBadge(question.question_type);
                  return (
                    <TableRow key={question.question_id}>
                      <TableCell className="px-6 py-4 text-sm text-muted-foreground align-top">{index + 1}</TableCell>
                      <TableCell className="px-6 py-4 text-sm text-foreground align-top min-w-[300px] whitespace-normal">
                        {question.question_text}
                      </TableCell>
                      <TableCell className="px-6 py-4 text-sm text-foreground align-top whitespace-nowrap">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${badge.className}`}>
                          {badge.label}
                        </span>
                      </TableCell>
                      <TableCell className="px-6 py-4 text-sm text-foreground align-top whitespace-nowrap">
                        {question.knowledge_point || '—'}
                      </TableCell>
                      <TableCell className="px-6 py-4 text-sm text-muted-foreground align-top whitespace-nowrap">
                        {question.creator_name || '—'}
                      </TableCell>
                      <TableCell className="px-6 py-4 text-sm text-foreground align-top">
                        <div className="flex items-center space-x-2">
                          <Button
                            onClick={() => openPreview(question)}
                            variant="outline"
                            size="sm"
                          >
                            <Eye size={14} className="mr-1" />
                            预览
                          </Button>
                          <Button
                            onClick={() => openEditor(question)}
                            size="sm"
                          >
                            <Edit2 size={14} className="mr-1" />
                            编辑
                          </Button>
                          <Button
                            onClick={() => handleDeleteQuestion(question.question_id)}
                            disabled={isDeleting === question.question_id}
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive"
                          >
                            {isDeleting === question.question_id ? '删除中...' : '删除'}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
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
            <h2 className="text-lg font-semibold text-foreground">{selectedQuestion.question_text}</h2>

            {selectedQuestion.question_type !== 'True/False' && selectedQuestion.options && !Array.isArray(selectedQuestion.options) && (
              <div className="space-y-2">
                {Object.entries(selectedQuestion.options).map(([key, value]) => (
                  <div key={key} className="flex items-start space-x-2 text-sm text-foreground">
                    <span className="font-medium text-foreground">{key}.</span>
                    <span>{value}</span>
                  </div>
                ))}
              </div>
            )}

            {Array.isArray(selectedQuestion.options) && (
              <div className="space-y-2">
                {selectedQuestion.options.map((value, index) => (
                  <div key={index} className="flex items-start space-x-2 text-sm text-foreground">
                    <span className="font-medium text-foreground">选项{index + 1}.</span>
                    <span>{value}</span>
                  </div>
                ))}
              </div>
            )}

            <div className="bg-success/10 border border-success/20 rounded-lg p-4 text-sm text-success">
              <span className="font-semibold">正确答案：</span>
              {formatCorrectAnswers(selectedQuestion)}
            </div>
          </div>
        )}
      </Modal>

      <QuestionEditorModal
        isOpen={isEditorOpen}
        onClose={closeEditor}
        editingQuestion={editingQuestion}
        onSuccess={handleEditorSuccess}
        showToast={showToast}
      />

      
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
