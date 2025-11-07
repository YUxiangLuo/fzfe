import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useExperiment } from '../contexts/ExperimentContext';
import { apiClient } from '../../../utils/apiClient';
import { BookOpenCheck, ChevronRight, Loader2, AlertTriangle } from 'lucide-react';

interface Question {
  question_id: number;
  knowledge_point: string;
  question_type: 'Single Choice' | 'Multiple Choice' | 'True/False';
  question_text: string;
  options: Record<string, string> | string[];
}

interface Answer {
  question_id: number;
  submitted_answer: string[];
}

const ModelQuiz: React.FC = () => {
  const navigate = useNavigate();
  const { state, updateState } = useExperiment();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<number, string[]>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    const fetchQuestions = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await apiClient.get<Question[]>('/quizzes/model/questions');
        setQuestions(response);
      } catch (err: any) {
        setError(err.message || '加载题目失败，请刷新页面重试');
      } finally {
        setIsLoading(false);
      }
    };

    fetchQuestions();
  }, []);

  const handleAnswerChange = (questionId: number, optionValue: string, questionType: string) => {
    setAnswers((prev) => {
      const current = prev[questionId] || [];

      if (questionType === 'Single Choice' || questionType === 'True/False') {
        // 单选和判断题：直接替换
        return { ...prev, [questionId]: [optionValue] };
      } else {
        // 多选题：切换选中状态
        if (current.includes(optionValue)) {
          return { ...prev, [questionId]: current.filter(k => k !== optionValue) };
        } else {
          return { ...prev, [questionId]: [...current, optionValue] };
        }
      }
    });
  };

  const handleSubmitQuiz = async () => {
    // 验证所有题目都已回答
    const unansweredQuestions = questions.filter(
      (q) => (answers[q.question_id]?.length ?? 0) === 0,
    );
    if (unansweredQuestions.length > 0) {
      setSubmitError(`请完成所有题目后再提交（还有 ${unansweredQuestions.length} 道题未作答）`);
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      // 构造提交数据
      const submitData = {
        experiment_id: state.experiment_id!,
        answers: Object.entries(answers).map(([questionId, submitted_answer]) => ({
          question_id: parseInt(questionId),
          submitted_answer,
        })),
      };

      await apiClient.post('/quizzes/answers', submitData);

      // 导航到生产计划页面
      navigate('/production');
    } catch (err: any) {
      setSubmitError(err.message || '提交失败，请重试');
    } finally {
      setIsSubmitting(false);
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
    } else {
      return Object.entries(options).map(([key, text]) => ({
        key,
        value: key,
        label: `${key}. ${text}`,
      }));
    }
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

  if (isLoading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
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

  return (
    <div className="p-8">
      <div className="w-full max-w-4xl mx-auto">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4 flex items-center">
            <BookOpenCheck className="w-8 h-8 mr-3 text-blue-600" />
            预测模型知识测验
          </h1>
          <p className="text-lg text-gray-600">
            在制定生产计划前，请完成以下测验，确保您已充分理解预测模型的基本原理。
          </p>
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
                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
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
                          isSelected ? 'bg-blue-50 border-2 border-blue-500' : 'border-2 border-gray-200 hover:bg-gray-50'
                        }`}
                      >
                        <input
                          type={inputType}
                          name={`question-${question.question_id}`}
                          checked={isSelected}
                          onChange={() =>
                            handleAnswerChange(question.question_id, option.value, question.question_type)
                          }
                          className={`${inputType === 'checkbox' ? 'h-4 w-4 rounded' : 'h-4 w-4'} text-blue-600 focus:ring-blue-500`}
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
            className="w-full md:w-auto inline-flex items-center justify-center px-8 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-all disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                提交中...
              </>
            ) : (
              <>
                提交答案，开始制定生产计划
                <ChevronRight className="w-5 h-5 ml-2" />
              </>
            )}
          </button>
        </footer>
      </div>
    </div>
  );
};

export default ModelQuiz;
