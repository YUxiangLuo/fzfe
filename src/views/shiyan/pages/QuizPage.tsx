import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, BookOpenCheck, CheckCircle2, ChevronRight, Loader2, XCircle } from 'lucide-react';
import { apiClient } from '../../../utils/apiClient';
import { useExperiment } from '../contexts/ExperimentContext.zustand';

type QuizKind = 'model' | 'plan';
type Accent = 'blue' | 'green';

interface Question {
  question_id: number;
  knowledge_point: string;
  question_type: 'Single Choice' | 'Multiple Choice' | 'True/False';
  question_text: string;
  options: Record<string, string> | string[];
}

export interface QuizAnswerDetail {
  question_id: number;
  quiz_type: 'quiz_about_model' | 'quiz_about_plan';
  knowledge_point: string | null;
  question_type: Question['question_type'];
  question_text: string;
  options: Record<string, string> | string[] | null;
  submitted_answer: string[];
  correct_answers: string[];
  answer_explanation: string | null;
  is_correct: boolean;
}

interface QuizPageProps {
  kind: QuizKind;
  title: string;
  description: string;
  accent: Accent;
  questionsEndpoint: string;
  submitButtonLabel: string;
  continueButtonLabel: string;
  continuePath: string;
  completedPatch: { quiz_about_model_completed?: boolean; quiz_about_plan_completed?: boolean };
}

const ACCENT_CLASSES: Record<Accent, {
  icon: string;
  selected: string;
  tag: string;
  button: string;
  loading: string;
}> = {
  blue: {
    icon: 'text-blue-600',
    selected: 'bg-blue-50 border-2 border-blue-500',
    tag: 'bg-blue-100 text-blue-700',
    button: 'bg-blue-600 hover:bg-blue-700',
    loading: 'text-blue-600',
  },
  green: {
    icon: 'text-green-600',
    selected: 'bg-green-50 border-2 border-green-500',
    tag: 'bg-green-100 text-green-700',
    button: 'bg-green-600 hover:bg-green-700',
    loading: 'text-green-600',
  },
};

const isBadRequestError = (error: unknown): boolean => {
  if (!error || typeof error !== 'object') return false;
  const maybeError = error as { status?: number; message?: string };
  if (maybeError.status === 400) return true;
  return typeof maybeError.message === 'string' && maybeError.message.includes('HTTP 400');
};

const getQuestionTypeLabel = (type: string) => {
  switch (type) {
    case 'Single Choice':
      return '单选题';
    case 'Multiple Choice':
      return '多选题';
    case 'True/False':
      return '判断题';
    default:
      return type;
  }
};

const getOptionsList = (
  options: Record<string, string> | string[],
): Array<{ key: string; value: string; label: string }> => {
  if (Array.isArray(options)) {
    return options.map((text, index) => ({
      key: String(index),
      value: text,
      label: text,
    }));
  }

  return Object.entries(options).map(([key, text]) => ({
    key,
    value: key,
    label: `${key}. ${text}`,
  }));
};

const formatAnswerValue = (
  value: string,
  options: Record<string, string> | string[] | null,
): string => {
  if (!options) return value;
  if (Array.isArray(options)) return value;
  if (Object.prototype.hasOwnProperty.call(options, value)) {
    return `${value}. ${options[value]}`;
  }

  const matchingOption = Object.entries(options).find(([, text]) => text === value);
  return matchingOption ? `${matchingOption[0]}. ${matchingOption[1]}` : value;
};

const formatAnswerList = (
  answers: string[],
  options: Record<string, string> | string[] | null,
): string => {
  if (answers.length === 0) return '未作答';
  return answers.map((answer) => formatAnswerValue(answer, options)).join('、');
};

const QuizResultView: React.FC<{
  title: string;
  accent: Accent;
  results: QuizAnswerDetail[];
  continueButtonLabel: string;
  onContinue: () => void;
}> = ({ title, accent, results, continueButtonLabel, onContinue }) => {
  const correctCount = results.filter((result) => result.is_correct).length;
  const totalCount = results.length;
  const score = totalCount > 0 ? Math.round((correctCount / totalCount) * 100) : 0;
  const accentClasses = ACCENT_CLASSES[accent];

  return (
    <div className="p-8">
      <div className="w-full max-w-4xl mx-auto">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4 flex items-center">
            <BookOpenCheck className={`w-8 h-8 mr-3 ${accentClasses.icon}`} />
            {title}
          </h1>
          <p className="text-lg text-gray-600">
            已提交答案，请查看每道题的答题结果，然后手动进入下一步。
          </p>
        </header>

        <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-gray-200 pb-6 mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">答题结果</h2>
              <p className="text-gray-600 mt-1">
                共 {totalCount} 题，答对 {correctCount} 题，得分 {score} 分
              </p>
            </div>
            <div className="text-4xl font-bold text-gray-900">{score}</div>
          </div>

          {results.length === 0 ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-5 text-amber-800">
              本测验已记录为完成，但暂无可展示的历史答题明细。请手动进入下一步。
            </div>
          ) : (
            <div className="space-y-6">
              {results.map((result, index) => (
                <article
                  key={`${result.quiz_type}-${result.question_id}-${index}`}
                  className={`rounded-lg border-2 p-5 ${
                    result.is_correct ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-semibold text-gray-900">
                        {index + 1}. {result.question_text}
                      </p>
                      <div className="flex items-center gap-3 mt-2">
                        <span className="text-sm text-gray-500">
                          ({getQuestionTypeLabel(result.question_type)})
                        </span>
                        {result.knowledge_point && (
                          <span className={`text-xs px-2 py-1 rounded ${accentClasses.tag}`}>
                            {result.knowledge_point}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className={`flex items-center font-semibold ${result.is_correct ? 'text-green-700' : 'text-red-700'}`}>
                      {result.is_correct ? (
                        <CheckCircle2 className="w-5 h-5 mr-1" />
                      ) : (
                        <XCircle className="w-5 h-5 mr-1" />
                      )}
                      {result.is_correct ? '正确' : '错误'}
                    </div>
                  </div>

                  <div className="mt-4 grid md:grid-cols-2 gap-3 text-sm">
                    <div className="rounded-md bg-white/80 border border-gray-200 p-3">
                      <div className="font-medium text-gray-600 mb-1">你的答案</div>
                      <div className="text-gray-900">{formatAnswerList(result.submitted_answer, result.options)}</div>
                    </div>
                    <div className="rounded-md bg-white/80 border border-gray-200 p-3">
                      <div className="font-medium text-gray-600 mb-1">正确答案</div>
                      <div className="text-gray-900">{formatAnswerList(result.correct_answers, result.options)}</div>
                    </div>
                  </div>

                  {!result.is_correct && result.answer_explanation && (
                    <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm">
                      <div className="font-medium text-amber-800 mb-1">答案解析</div>
                      <p className="text-amber-900 leading-6 whitespace-pre-wrap">{result.answer_explanation}</p>
                    </div>
                  )}
                </article>
              ))}
            </div>
          )}
        </section>

        <footer className="mt-8 text-center">
          <button
            onClick={onContinue}
            className={`w-full md:w-auto inline-flex items-center justify-center px-8 py-3 ${accentClasses.button} text-white rounded-lg font-semibold transition-all`}
          >
            {continueButtonLabel}
            <ChevronRight className="w-5 h-5 ml-2" />
          </button>
        </footer>
      </div>
    </div>
  );
};

export const QuizPage: React.FC<QuizPageProps> = ({
  kind,
  title,
  description,
  accent,
  questionsEndpoint,
  submitButtonLabel,
  continueButtonLabel,
  continuePath,
  completedPatch,
}) => {
  const navigate = useNavigate();
  const { state, updateState } = useExperiment();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<number, string[]>>({});
  const [results, setResults] = useState<QuizAnswerDetail[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const accentClasses = ACCENT_CLASSES[accent];
  const hasSubmitted = results !== null;
  const isQuizCompleted = kind === 'model'
    ? state.quiz_about_model_completed
    : state.quiz_about_plan_completed;

  const fetchQuestions = useCallback(async () => {
    const response = await apiClient.get<Question[]>(questionsEndpoint);
    setQuestions(response);
    setAnswers({});
    setResults(null);
  }, [questionsEndpoint]);

  useEffect(() => {
    if (results) return;

    let isCancelled = false;

    const loadQuiz = async () => {
      setIsLoading(true);
      setError(null);
      setSubmitError(null);

      try {
        if (isQuizCompleted) {
          if (!state.experiment_id) {
            throw new Error('实验ID不存在，无法加载已提交的答题结果');
          }

          const query = `experiment_id=${encodeURIComponent(String(state.experiment_id))}`;
          const submittedResults = await apiClient.get<QuizAnswerDetail[]>(`/quizzes/${kind}/results?${query}`);
          if (isCancelled) return;

          setResults(submittedResults);
          setQuestions([]);
          setAnswers({});
          return;
        }

        await fetchQuestions();
      } catch (err) {
        if (isCancelled) return;
        setError(err instanceof Error ? err.message : '加载题目失败，请刷新页面重试');
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    };

    void loadQuiz();

    return () => {
      isCancelled = true;
    };
  }, [fetchQuestions, isQuizCompleted, kind, results, state.experiment_id]);

  const unansweredQuestions = useMemo(
    () => questions.filter((q) => (answers[q.question_id]?.length ?? 0) === 0),
    [answers, questions],
  );

  const handleAnswerChange = (questionId: number, optionValue: string, questionType: string) => {
    if (hasSubmitted) return;

    setAnswers((prev) => {
      const current = prev[questionId] || [];

      if (questionType === 'Single Choice' || questionType === 'True/False') {
        return { ...prev, [questionId]: [optionValue] };
      }

      if (current.includes(optionValue)) {
        return { ...prev, [questionId]: current.filter(k => k !== optionValue) };
      }
      return { ...prev, [questionId]: [...current, optionValue] };
    });
  };

  const handleSubmitQuiz = async () => {
    if (!state.experiment_id) {
      setSubmitError('实验ID不存在，请刷新页面后重试');
      return;
    }

    if (unansweredQuestions.length > 0) {
      setSubmitError(`请完成所有题目后再提交（还有 ${unansweredQuestions.length} 道题未作答）`);
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const submitData = {
        experiment_id: state.experiment_id,
        answers: Object.entries(answers).map(([questionId, submitted_answer]) => ({
          question_id: parseInt(questionId, 10),
          submitted_answer,
        })),
      };

      const response = await apiClient.post<QuizAnswerDetail[]>('/quizzes/answers', submitData);
      setResults(response);
      await updateState(completedPatch, { skipSync: true });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      if (isBadRequestError(err)) {
        setSubmitError('提交失败：答案参数错误，请检查是否已完成全部作答后重试');
        return;
      }
      setSubmitError(err instanceof Error ? err.message : '提交失败，请重试');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className={`w-12 h-12 animate-spin ${accentClasses.loading} mx-auto mb-4`} />
          <p className="text-gray-600">正在加载题目...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 flex items-center justify-center min-h-screen">
        <div className="max-w-md">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
            <AlertTriangle className="w-12 h-12 text-red-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-red-800 mb-2">加载失败</h3>
            <p className="text-red-600 mb-4">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              刷新页面
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (results) {
    return (
      <QuizResultView
        title={title}
        accent={accent}
        results={results}
        continueButtonLabel={continueButtonLabel}
        onContinue={() => navigate(continuePath)}
      />
    );
  }

  return (
    <div className="p-8">
      <div className="w-full max-w-4xl mx-auto">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4 flex items-center">
            <BookOpenCheck className={`w-8 h-8 mr-3 ${accentClasses.icon}`} />
            {title}
          </h1>
          <p className="text-lg text-gray-600">{description}</p>
        </header>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 space-y-8">
          {questions.map((question, index) => {
            const optionsList = getOptionsList(question.options);
            const selectedAnswers = answers[question.question_id] || [];

            return (
              <div key={question.question_id} className="border-b border-gray-200 pb-6 last:border-b-0">
                <div className="mb-4">
                  <p className="font-semibold text-gray-800 mb-2">
                    {index + 1}. {question.question_text}
                  </p>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-gray-500">
                      ({getQuestionTypeLabel(question.question_type)})
                    </span>
                    <span className={`text-xs px-2 py-1 rounded ${accentClasses.tag}`}>
                      {question.knowledge_point}
                    </span>
                  </div>
                </div>
                <div className="space-y-3">
                  {optionsList.map((option) => {
                    const isSelected = selectedAnswers.includes(option.value);
                    const inputType = question.question_type === 'Multiple Choice' ? 'checkbox' : 'radio';

                    return (
                      <label
                        key={option.key}
                        className={`flex items-center p-3 rounded-lg cursor-pointer transition-colors ${
                          isSelected ? accentClasses.selected : 'border-2 border-gray-200 hover:bg-gray-50'
                        }`}
                      >
                        <input
                          type={inputType}
                          name={`question-${question.question_id}`}
                          checked={isSelected}
                          onChange={() =>
                            handleAnswerChange(question.question_id, option.value, question.question_type)
                          }
                          className={`${inputType === 'checkbox' ? 'h-4 w-4 rounded' : 'h-4 w-4'} ${accentClasses.icon} focus:ring-blue-500`}
                        />
                        <span className="ml-3 text-gray-700">{option.label}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {submitError && (
          <div className="mt-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center">
              <AlertTriangle className="w-5 h-5 text-red-600 mr-2" />
              <p className="text-red-600">{submitError}</p>
            </div>
          </div>
        )}

        <footer className="mt-8 text-center">
          <button
            onClick={handleSubmitQuiz}
            disabled={isSubmitting}
            className={`w-full md:w-auto inline-flex items-center justify-center px-8 py-3 ${accentClasses.button} text-white rounded-lg font-semibold transition-all disabled:bg-gray-400 disabled:cursor-not-allowed`}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                提交中...
              </>
            ) : (
              <>
                {submitButtonLabel}
                <ChevronRight className="w-5 h-5 ml-2" />
              </>
            )}
          </button>
        </footer>
      </div>
    </div>
  );
};
