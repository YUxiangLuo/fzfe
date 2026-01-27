import React, { useEffect, useMemo, useState, useCallback } from 'react';
import {
  Users,
  Award,
  TrendingUp,
  TrendingDown,
  Search,
  Loader,
  ArrowUpDown,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  Download,
  AlertTriangle,
} from 'lucide-react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip as RechartsTooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from 'recharts';
import type { StudentGradeOverview, Class } from '@/views/teacher/types';
import { apiClient, API_BASE_URL } from '@/utils/apiClient';
import { decodeToken } from '@/utils/auth';
import { DOWNLOAD_SERVER_BASE_URL } from '@/config/appConfig';
import GradeCharts, { type GradeChartDatum } from '@/views/teacher/components/Assessment/GradeCharts';
import GradeRow from './GradeRow';
import Button from '@/views/teacher/components/common/Button';
import {
  getProgressStatus,
  getEvaluationBadge,
  type ProgressStatus,
  type StatusVariant
} from '@/views/teacher/utils/gradeStatus';

const ALL_CLASSES = 'all';

// Extended type with class information for display
interface StudentGradeWithClass extends StudentGradeOverview {
  class_id?: number;
  class_name?: string;
}

// Class summary for "All Classes" view
interface ClassSummary {
  class_id: number;
  class_name: string;
  total_students: number;
  graded_count: number;         // report_status = 'graded'
  submitted_count: number;       // report_status = 'submitted'
  rejected_count: number;        // report_status = 'rejected'
  not_submitted_count: number;   // report_status = null
  average_score: number | null;
  grades: StudentGradeOverview[];
}

const SCORE_SEGMENT_CONFIG = {
  excellent: {
    label: '≥ 90 (优秀)',
    className: 'bg-blue-500',
    hex: '#3b82f6',
  },
  good: {
    label: '80-89 (良好)',
    className: 'bg-green-500',
    hex: '#10b981',
  },
  average: {
    label: '70-79 (中等)',
    className: 'bg-yellow-500',
    hex: '#f59e0b',
  },
  pass: {
    label: '60-69 (及格)',
    className: 'bg-purple-500',
    hex: '#8b5cf6',
  },
  fail: {
    label: '< 60 (不及格)',
    className: 'bg-red-500',
    hex: '#ef4444',
  },
} as const;

type ScoreSegmentKey = keyof typeof SCORE_SEGMENT_CONFIG;

const FINAL_BREAKDOWN_LABELS: Record<'exp_flow' | 'knowledge_test' | 'model_quality' | 'report_quality', string> = {
  exp_flow: '实验流程',
  knowledge_test: '知识点测试',
  model_quality: '模型选择',
  report_quality: '实验报告',
};

const EXP_FLOW_FIELD_LABELS: Record<string, string> = {
  exp_flow_demand_data_preparation: '需求预测 - 数据准备',
  exp_flow_demand_descriptive_stats: '需求预测 - 描述性统计',
  exp_flow_demand_model_selection: '需求预测 - 模型选择',
  exp_flow_demand_generate_results: '需求预测 - 生成预测结果',
  exp_flow_production_inventory_calc: '生产计划 - 库存变量计算',
  exp_flow_production_service_level: '生产计划 - 服务水平计算',
  exp_flow_production_variable_calc: '生产计划 - 生产变量计算',
  exp_flow_production_plan_creation: '生产计划 - 制定计划',
  exp_flow_report_submission: '提交实验报告',
};

const formatScore = (value: number | null) => {
  if (value === null || Number.isNaN(value)) {
    return '—';
  }
  return value.toFixed(2);
};

const formatStatValue = (value: number | null) => {
  if (value === null || Number.isNaN(value)) {
    return null;
  }
  return value.toFixed(2);
};

type SortKey =
  | 'username'
  | 'exp_flow_score'
  | 'knowledge_test'
  | 'model_quality'
  | 'report_quality'
  | 'final_score'
  | 'evaluation';

const STATUS_STYLES: Record<StatusVariant, string> = {
  completed: 'bg-green-50 text-green-700 border border-green-100',
  waiting: 'bg-indigo-50 text-indigo-700 border border-indigo-100',
  progress: 'bg-amber-50 text-amber-700 border border-amber-100',
  idle: 'bg-gray-50 text-gray-600 border border-gray-200',
  rejected: 'bg-red-50 text-red-700 border border-red-100',
};

const StatusChip: React.FC<{ variant: StatusVariant; label: string; value: number }> = ({ variant, label, value }) => (
  <span className={`px-3 py-1 rounded-full text-xs md:text-sm font-medium ${STATUS_STYLES[variant]}`}>
    {label}：{value} 人
  </span>
);

const GradesOverview: React.FC = () => {
  const [classes, setClasses] = useState<Class[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [grades, setGrades] = useState<StudentGradeWithClass[]>([]);
  const [classSummaries, setClassSummaries] = useState<ClassSummary[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: 'asc' | 'desc' } | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [exportedFileUrl, setExportedFileUrl] = useState<string | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);
  const [expandedRows, setExpandedRows] = useState<number[]>([]);

  const [teacherId, setTeacherId] = useState<number | null>(null);
  const [isLoadingClasses, setIsLoadingClasses] = useState(true);
  const [isLoadingGrades, setIsLoadingGrades] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handler = window.setTimeout(() => {
      setDebouncedSearch(searchTerm.trim());
    }, 300);
    return () => window.clearTimeout(handler);
  }, [searchTerm]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      setError("未找到登录凭据，请重新登录。");
      setIsLoadingClasses(false);
      return;
    }
    const decoded = decodeToken(token);
    if (!decoded) {
      setError("登录信息已失效，请重新登录。");
      setIsLoadingClasses(false);
      return;
    }
    setTeacherId(decoded.sub);
  }, []);

  useEffect(() => {
    if (teacherId === null) return;

    const fetchClasses = async () => {
      setIsLoadingClasses(true);
      setError(null);
      try {
        const response = await apiClient.get<Class[]>(`/teachers/${teacherId}/classes`);
        if (Array.isArray(response) && response.length > 0) {
          setClasses(response);
          // Default to "All Classes"
          setSelectedClassId(ALL_CLASSES);
        } else {
          setClasses([]);
          setError("您当前没有管理的班级。");
        }
      } catch (err: any) {
        setError(err.message || '获取班级列表失败。');
      } finally {
        setIsLoadingClasses(false);
      }
    };

    fetchClasses();
  }, [teacherId]);

  useEffect(() => {
    if (!selectedClassId) {
      setGrades([]);
      setClassSummaries([]);
      setExpandedRows([]);
      return;
    }
    // Clear export state when class changes
    setExportedFileUrl(null);
    setExportError(null);

    let cancelled = false;

    const fetchGrades = async () => {
      setIsLoadingGrades(true);
      setError(null);
      try {
        if (selectedClassId === ALL_CLASSES) {
          // Fetch grades from all classes and create summaries
          const summaryPromises = classes.map(async (cls) => {
            try {
              const response = await apiClient.get<StudentGradeOverview[]>(`/classes/${cls.class_id}/grade-summaries`);
              const gradesArray = Array.isArray(response) ? response : [];

              // Calculate summary statistics by report status
              const gradedCount = gradesArray.filter((g) => g.report_status === 'graded').length;
              const submittedCount = gradesArray.filter((g) => g.report_status === 'submitted').length;
              const rejectedCount = gradesArray.filter((g) => g.report_status === 'rejected').length;
              const notSubmittedCount = gradesArray.filter((g) => !g.report_status).length;

              // Calculate average score from graded reports only
              const gradedReports = gradesArray.filter((g) => g.report_status === 'graded' && g.final_score !== null);
              const avgScore = gradedReports.length > 0
                ? gradedReports.reduce((sum, g) => sum + (g.final_score || 0), 0) / gradedReports.length
                : null;

              return {
                class_id: cls.class_id,
                class_name: cls.class_name,
                total_students: gradesArray.length,
                graded_count: gradedCount,
                submitted_count: submittedCount,
                rejected_count: rejectedCount,
                not_submitted_count: notSubmittedCount,
                average_score: avgScore,
                grades: gradesArray,
              } as ClassSummary;
            } catch (err: any) {
              console.warn(`Failed to fetch grades for class ${cls.class_name}:`, err.message);
              return {
                class_id: cls.class_id,
                class_name: cls.class_name,
                total_students: 0,
                graded_count: 0,
                submitted_count: 0,
                rejected_count: 0,
                not_submitted_count: 0,
                average_score: null,
                grades: [],
              } as ClassSummary;
            }
          });

          const summaries = await Promise.all(summaryPromises);
          if (cancelled) return;
          setClassSummaries(summaries);
          setGrades([]);
          setExpandedRows([]);

          if (summaries.every(s => s.total_students === 0)) {
            setError('暂无成绩记录。部分班级可能尚未设置成绩权重。');
          }
        } else {
          // Fetch grades from single class
          const response = await apiClient.get<StudentGradeOverview[]>(`/classes/${selectedClassId}/grade-summaries`);
          if (cancelled) return;
          const gradesWithClass = (Array.isArray(response) ? response : []).map(grade => {
            const cls = classes.find(c => String(c.class_id) === selectedClassId);
            return {
              ...grade,
              class_id: cls?.class_id,
              class_name: cls?.class_name,
            };
          });
          setGrades(gradesWithClass);
          setClassSummaries([]);
          setExpandedRows([]);
          if (gradesWithClass.length === 0) {
            setError('该班级暂无成绩记录。');
          }
        }
      } catch (err: any) {
        if (cancelled) return;
        setGrades([]);
        setClassSummaries([]);
        if (err.message && err.message.includes("Grade weights for this class have not been set up")) {
          setError("无法计算成绩，因为当前班级尚未设置成绩权重。请先前往'成绩权重'页面进行设置。");
        } else {
          setError(err?.message || '获取成绩数据失败。');
        }
      } finally {
        if (!cancelled) {
          setIsLoadingGrades(false);
        }
      }
    };

    fetchGrades();

    return () => {
      cancelled = true;
    };
  }, [selectedClassId, classes]);

  const filteredGrades = useMemo(() => {
    if (!debouncedSearch) return grades;
    const query = debouncedSearch.toLowerCase();
    return grades.filter(
      (grade) =>
        grade.full_name.toLowerCase().includes(query) ||
        grade.username.toLowerCase().includes(query),
    );
  }, [grades, debouncedSearch]);

  const sortedGrades = useMemo(() => {
    if (!sortConfig) return filteredGrades;
    const { key, direction } = sortConfig;

    const normalizeNumeric = (value: number | null) => {
      if (value === null || Number.isNaN(value)) {
        return direction === 'asc' ? Number.POSITIVE_INFINITY : Number.NEGATIVE_INFINITY;
      }
      return value;
    };

    const compare = (a: StudentGradeOverview, b: StudentGradeOverview) => {
      switch (key) {
        case 'username': {
          const aValue = a.username ?? '';
          const bValue = b.username ?? '';
          return direction === 'asc'
            ? aValue.localeCompare(bValue)
            : bValue.localeCompare(aValue);
        }
        case 'exp_flow_score': {
          const aValue = normalizeNumeric(a.exp_flow_score);
          const bValue = normalizeNumeric(b.exp_flow_score);
          return direction === 'asc' ? aValue - bValue : bValue - aValue;
        }
        case 'knowledge_test': {
          const aValue = normalizeNumeric(a.knowledge_test);
          const bValue = normalizeNumeric(b.knowledge_test);
          return direction === 'asc' ? aValue - bValue : bValue - aValue;
        }
        case 'model_quality': {
          const aValue = normalizeNumeric(a.model_quality);
          const bValue = normalizeNumeric(b.model_quality);
          return direction === 'asc' ? aValue - bValue : bValue - aValue;
        }
        case 'report_quality': {
          const aValue = normalizeNumeric(a.report_quality);
          const bValue = normalizeNumeric(b.report_quality);
          return direction === 'asc' ? aValue - bValue : bValue - aValue;
        }
        case 'final_score': {
          const aValue = normalizeNumeric(a.final_score);
          const bValue = normalizeNumeric(b.final_score);
          return direction === 'asc' ? aValue - bValue : bValue - aValue;
        }
        case 'evaluation': {
          const statusOrder: Record<ProgressStatus, number> = {
            'not-started': 0,
            'in-progress': 1,
            'waiting-evaluation': 2,
            'rejected': 3,
            'completed': 4,
          };
          const aStatus = getProgressStatus(a);
          const bStatus = getProgressStatus(b);
          if (statusOrder[aStatus] !== statusOrder[bStatus]) {
            return direction === 'asc'
              ? statusOrder[aStatus] - statusOrder[bStatus]
              : statusOrder[bStatus] - statusOrder[aStatus];
          }
          if (aStatus === 'completed' && bStatus === 'completed') {
            const aScore = normalizeNumeric(a.final_score);
            const bScore = normalizeNumeric(b.final_score);
            return direction === 'asc' ? aScore - bScore : bScore - aScore;
          }
          return 0;
        }
        default:
          return 0;
      }
    };

    const next = [...filteredGrades];
    next.sort(compare);
    return next;
  }, [filteredGrades, sortConfig]);

  const handleSort = (key: SortKey) => {
    setSortConfig((prev) => {
      if (!prev || prev.key !== key) {
        return { key, direction: 'desc' };
      }
      return {
        key,
        direction: prev.direction === 'desc' ? 'asc' : 'desc',
      };
    });
  };

  const renderSortIcon = (key: SortKey) => {
    if (!sortConfig || sortConfig.key !== key) {
      return <ArrowUpDown className="w-3.5 h-3.5 text-gray-400" />;
    }
    return sortConfig.direction === 'desc' ? (
      <ChevronDown className="w-3.5 h-3.5 text-blue-600" />
    ) : (
      <ChevronUp className="w-3.5 h-3.5 text-blue-600" />
    );
  };

  const currentClass = useMemo(
    () => {
      if (selectedClassId === ALL_CLASSES) return null;
      return classes.find((cls) => String(cls.class_id) === selectedClassId) ?? null;
    },
    [classes, selectedClassId],
  );

  const gradeInsights = useMemo(() => {
    // Initialize buckets
    const completed: StudentGradeWithClass[] = [];
    const waitingEvaluation: StudentGradeWithClass[] = [];
    const rejected: StudentGradeWithClass[] = [];
    const notStarted: StudentGradeWithClass[] = [];
    const inProgress: StudentGradeWithClass[] = [];

    // Single source of truth: Iterate and classify using getProgressStatus
    grades.forEach(grade => {
      const status = getProgressStatus(grade);
      switch (status) {
        case 'completed':
          completed.push(grade);
          break;
        case 'waiting-evaluation':
          waitingEvaluation.push(grade);
          break;
        case 'rejected':
          rejected.push(grade);
          break;
        case 'not-started':
          notStarted.push(grade);
          break;
        case 'in-progress':
          inProgress.push(grade);
          break;
      }
    });

    // Calculate statistics ONLY from completed (graded) reports
    const validScores = completed
      .map((grade) => grade.final_score)
      .filter((score): score is number => score !== null && !Number.isNaN(score));

    if (validScores.length === 0) {
      return {
        completedStudents: completed,
        completedCount: completed.length,
        inProgressCount: inProgress.length,
        waitingEvaluationCount: waitingEvaluation.length,
        notStartedCount: notStarted.length,
        rejectedCount: rejected.length,
        avgFinalGrade: null as number | null,
        highestGrade: null as number | null,
        lowestGrade: null as number | null,
        passRate: null as number | null,
      };
    }

    const sum = validScores.reduce((acc, score) => acc + score, 0);
    const passCount = validScores.filter((score) => score >= 60).length;

    return {
      completedStudents: completed,
      completedCount: completed.length,
      inProgressCount: inProgress.length,
      waitingEvaluationCount: waitingEvaluation.length,
      notStartedCount: notStarted.length,
      rejectedCount: rejected.length,
      avgFinalGrade: parseFloat((sum / validScores.length).toFixed(2)),
      highestGrade: validScores.length ? Math.max(...validScores) : null,
      lowestGrade: validScores.length ? Math.min(...validScores) : null,
      passRate: validScores.length ? Math.round((passCount / validScores.length) * 100) : null,
    };
  }, [grades]);

  const scoreDistribution = useMemo(() => {
    const counts: Record<ScoreSegmentKey, number> = {
      excellent: 0,
      good: 0,
      average: 0,
      pass: 0,
      fail: 0,
    };

    // Distribution is strictly based on graded students
    gradeInsights.completedStudents.forEach((grade) => {
      const score = grade.final_score;
      if (score === null || Number.isNaN(score)) {
        return;
      }
      if (score >= 90) counts.excellent += 1;
      else if (score >= 80) counts.good += 1;
      else if (score >= 70) counts.average += 1;
      else if (score >= 60) counts.pass += 1;
      else counts.fail += 1;
    });

    return (Object.entries(SCORE_SEGMENT_CONFIG) as [ScoreSegmentKey, (typeof SCORE_SEGMENT_CONFIG)[ScoreSegmentKey]][]).map(
      ([key, config]) => ({
        label: config.label,
        value: counts[key],
        className: config.className,
        hex: config.hex,
      }),
    );
  }, [gradeInsights]);

  const pieData = useMemo(
    () => scoreDistribution.filter((item) => item.value > 0),
    [scoreDistribution],
  );

  const gradedTotal = useMemo(
    () => scoreDistribution.reduce((sum, item) => sum + item.value, 0),
    [scoreDistribution],
  );

  const pendingCount =
    gradeInsights.inProgressCount +
    gradeInsights.waitingEvaluationCount +
    gradeInsights.notStartedCount +
    gradeInsights.rejectedCount;
  const pendingMessage =
    pendingCount > 0
      ? `提示：未进行实验、实验进行中、等待评分或已驳回的学生暂不纳入平均分、分布等统计（当前共 ${pendingCount} 人）。`
      : '提示：当前班级所有学生都已完成评分，统计数据包含全部学生。';

  const chartGrades = useMemo<GradeChartDatum[]>(
    () =>
      // Filter strictly for graded reports for charts
      grades
        .filter((grade) => grade.report_status === 'graded')
        .map((grade) => ({
          id: grade.student_id,
          fullName: grade.full_name,
          username: grade.username,
          finalScore: grade.final_score,
          expFlowScore: grade.exp_flow_score,
          knowledgeTest: grade.knowledge_test,
          modelQuality: grade.model_quality,
          reportQuality: grade.report_quality,
        })),
    [grades],
  );

  const handleExport = async () => {
    if (!selectedClassId) {
      setExportError('请先选择一个班级');
      return;
    }

    if (selectedClassId === ALL_CLASSES) {
      setExportError('导出功能暂不支持"全部班级"，请选择单个班级进行导出。');
      return;
    }

    setIsExporting(true);
    setExportError(null);
    setExportedFileUrl(null);
    try {
      const response = await apiClient.get<{ file_path: string }>(`/classes/${selectedClassId}/grade-export.csv`);

      if (!response || !response.file_path) {
        throw new Error('导出失败：服务器未返回文件地址');
      }

      const filename = response.file_path.split("/").pop();
      if (!filename) {
        throw new Error('导出失败：无效的文件名');
      }
      const fullUrl = `${DOWNLOAD_SERVER_BASE_URL}/exports/${filename}`;
      setExportedFileUrl(fullUrl);
    } catch (err: any) {
      const errorMessage = err?.message || '导出失败，请稍后重试。';
      setExportError(errorMessage);
    } finally {
      setIsExporting(false);
    }
  };

  const toggleRow = useCallback((studentId: number) => {
    setExpandedRows((prev) =>
      prev.includes(studentId) ? prev.filter((id) => id !== studentId) : [...prev, studentId],
    );
  }, []);

  // Render class comparison view (for "All Classes")
  const renderClassComparison = () => {
    if (isLoadingGrades) {
      return (
        <div className="flex justify-center py-20">
          <Loader className="animate-spin text-blue-500" size={40} />
        </div>
      );
    }

    // Prepare data for charts
    const barChartData = classSummaries
      .filter(s => s.average_score !== null)
      .map(s => ({
        name: s.class_name,
        平均分: parseFloat(s.average_score!.toFixed(2)),
      }));

    const submissionPieData = classSummaries.map((s, index) => ({
      name: s.class_name,
      已提交: s.graded_count + s.submitted_count + s.rejected_count,
      未提交: s.not_submitted_count,
      color: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'][index % 5],
    }));

    const studentCountPieData = classSummaries.map((s, index) => ({
      name: s.class_name,
      value: s.total_students,
      color: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'][index % 5],
    }));

    const completionStackData = classSummaries.map(s => ({
      name: s.class_name,
      已评分: s.graded_count,
      待评分: s.submitted_count,
      已驳回: s.rejected_count,
      未提交: s.not_submitted_count,
    }));

    const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4'];

    const CLASS_CARD_COLORS = [
      { bg: 'bg-blue-500', header: 'bg-blue-50', border: 'border-blue-200' },
      { bg: 'bg-green-500', header: 'bg-green-50', border: 'border-green-200' },
      { bg: 'bg-yellow-500', header: 'bg-yellow-50', border: 'border-yellow-200' },
      { bg: 'bg-red-500', header: 'bg-red-50', border: 'border-red-200' },
      { bg: 'bg-purple-500', header: 'bg-purple-50', border: 'border-purple-200' },
      { bg: 'bg-pink-500', header: 'bg-pink-50', border: 'border-pink-200' },
    ];

    return (
      <>
        {/* Summary Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {classSummaries.map((summary, index) => {
            const colorIndex = index % CLASS_CARD_COLORS.length;
            const colorScheme = CLASS_CARD_COLORS[colorIndex]!;
            const submittedTotal = summary.graded_count + summary.submitted_count + summary.rejected_count;
            
            return (
              <div
                key={summary.class_id}
                className={`bg-white rounded-lg shadow-md overflow-hidden hover:shadow-xl transition-all cursor-pointer border-2 ${colorScheme.border} transform hover:scale-105`}
                onClick={() => setSelectedClassId(String(summary.class_id))}
              >
                <div className={`px-6 py-4 ${colorScheme.header}`}>
                  <h3 className="text-xl font-bold text-gray-900">{summary.class_name}</h3>
                </div>
                <div className="p-6 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-3 bg-blue-50 rounded-lg border border-blue-100">
                      <p className="text-2xl font-bold text-blue-600">{summary.total_students}</p>
                      <p className="text-xs text-gray-600 mt-1">班级人数</p>
                    </div>
                    <div className="text-center p-3 bg-green-50 rounded-lg border border-green-100">
                      <p className="text-2xl font-bold text-green-600">{submittedTotal}</p>
                      <p className="text-xs text-gray-600 mt-1">已提交</p>
                      {summary.rejected_count > 0 && (
                        <p className="text-xs text-red-500 mt-0.5">（含 {summary.rejected_count} 份已驳回）</p>
                      )}
                    </div>
                  </div>
                  <div className="border-t-2 border-gray-100 pt-4">
                    <div className="text-center p-4 bg-purple-50 rounded-lg border border-purple-100">
                      <p className="text-4xl font-bold text-purple-900">
                        {summary.average_score !== null ? summary.average_score.toFixed(1) : '—'}
                      </p>
                      <p className="text-sm text-gray-600 mt-2 font-medium">平均分</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-sm pt-2">
                    <span className="text-gray-500">提交率</span>
                    <span className="font-bold text-gray-900">
                      {summary.total_students > 0
                        ? `${((submittedTotal / summary.total_students) * 100).toFixed(1)}%`
                        : '—'}
                    </span>
                  </div>
                  <div className="text-center pt-2 border-t border-gray-200">
                    <span className="text-xs text-blue-600 font-medium">点击查看详情 →</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Bar Chart - Average Scores */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
              <div className="w-1 h-6 bg-blue-600 mr-3 rounded"></div>
              各班级平均分对比
            </h3>
            {barChartData.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-10">暂无数据</p>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={barChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis
                    dataKey="name"
                    tick={{ fill: '#6b7280', fontSize: 12 }}
                    angle={-15}
                    textAnchor="end"
                    height={60}
                  />
                  <YAxis
                    tick={{ fill: '#6b7280', fontSize: 12 }}
                    domain={[0, 100]}
                  />
                  <RechartsTooltip
                    contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                    formatter={(value: number) => [`${value.toFixed(2)} 分`, '平均分']}
                  />
                  <Bar dataKey="平均分" fill="#3b82f6" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Stacked Bar Chart - Completion Status */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
              <div className="w-1 h-6 bg-green-600 mr-3 rounded"></div>
              各班级完成情况
            </h3>
            {completionStackData.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-10">暂无数据</p>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={completionStackData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis
                    dataKey="name"
                    tick={{ fill: '#6b7280', fontSize: 12 }}
                    angle={-15}
                    textAnchor="end"
                    height={60}
                  />
                  <YAxis tick={{ fill: '#6b7280', fontSize: 12 }} />
                  <RechartsTooltip
                    contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                    formatter={(value: number, name: string) => [`${value} 人`, name]}
                  />
                  <Legend
                    wrapperStyle={{ paddingTop: '20px' }}
                    iconType="circle"
                  />
                  <Bar dataKey="已评分" stackId="a" fill="#10b981" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="待评分" stackId="a" fill="#3b82f6" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="已驳回" stackId="a" fill="#f59e0b" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="未提交" stackId="a" fill="#9ca3af" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Pie Chart - Student Distribution */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
              <div className="w-1 h-6 bg-purple-600 mr-3 rounded"></div>
              各班级人数分布
            </h3>
            {studentCountPieData.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-10">暂无数据</p>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <RechartsTooltip
                    contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                    formatter={(value: number) => [`${value} 人`]}
                  />
                  <Pie
                    data={studentCountPieData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    label={(entry) => `${entry.name}: ${entry.value}人`}
                    labelLine={{ stroke: '#6b7280', strokeWidth: 1 }}
                  >
                    {studentCountPieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Donut Chart - Submission Rate */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
              <div className="w-1 h-6 bg-yellow-600 mr-3 rounded"></div>
              各班级提交率对比
            </h3>
            {submissionPieData.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-10">暂无数据</p>
            ) : (
              <div className="space-y-4">
                {submissionPieData.map((data, index) => {
                  const total = data.已提交 + data.未提交;
                  const rate = total > 0 ? (data.已提交 / total) * 100 : 0;
                  return (
                    <div key={index} className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium text-gray-700">{data.name}</span>
                        <span className="font-bold text-gray-900">{rate.toFixed(1)}%</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className="flex-1 h-6 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all flex items-center justify-end pr-2"
                            style={{
                              width: `${rate}%`,
                              backgroundColor: COLORS[index % COLORS.length]
                            }}
                          >
                            {rate > 15 && (
                              <span className="text-xs font-bold text-white">{data.已提交}</span>
                            )}
                          </div>
                        </div>
                        <span className="text-xs text-gray-500 w-16">
                          {data.已提交}/{total}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </>
    );
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-md p-6 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between md:space-x-4 space-y-3 md:space-y-0">
          <div className="flex items-center space-x-4">
            <h1 className="text-2xl font-bold text-gray-900">成绩概览</h1>
            <select
              value={selectedClassId}
              onChange={(event) => setSelectedClassId(event.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              disabled={isLoadingClasses || classes.length === 0}
            >
              {classes.length === 0 ? (
                <option value="">{isLoadingClasses ? '加载班级...' : '暂无班级'}</option>
              ) : (
                <>
                  <option value={ALL_CLASSES}>全部班级</option>
                  {classes.map((cls) => (
                    <option key={cls.class_id} value={cls.class_id}>{cls.class_name}</option>
                  ))}
                </>
              )}
            </select>
          </div>
          <p className="text-sm text-gray-500">
            {selectedClassId === ALL_CLASSES ? '查看各班级整体表现对比' : '查看班级整体成绩表现与分布'}
          </p>
        </div>

        {error && !isLoadingGrades && (
          <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded-lg text-sm">
            {error}
          </div>
        )}
      </div>

      {selectedClassId === ALL_CLASSES ? (
        renderClassComparison()
      ) : (
        <>
          <div className="bg-white rounded-lg shadow-md p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
          <StatCard icon={Users} color="blue" title="班级人数" value={grades.length} />
          <StatCard icon={Award} color="green" title="平均分" value={formatStatValue(gradeInsights.avgFinalGrade)} />
          <StatCard icon={TrendingUp} color="yellow" title="最高分" value={formatStatValue(gradeInsights.highestGrade)} />
          <StatCard icon={TrendingDown} color="red" title="最低分" value={formatStatValue(gradeInsights.lowestGrade)} />
          <StatCard
            icon={Award}
            color="purple"
            title="及格率"
            value={gradeInsights.passRate !== null ? `${gradeInsights.passRate}%` : null}
          />
        </div>

        <div className="flex flex-wrap gap-2">
          <StatusChip variant="completed" label="已完成评分" value={gradeInsights.completedCount} />
          <StatusChip variant="waiting" label="待评分" value={gradeInsights.waitingEvaluationCount} />
          <StatusChip variant="rejected" label="已驳回" value={gradeInsights.rejectedCount} />
          <StatusChip variant="progress" label="进行中" value={gradeInsights.inProgressCount} />
          <StatusChip variant="idle" label="未开始" value={gradeInsights.notStartedCount} />
        </div>
        <div className="text-sm text-blue-700 bg-blue-50 border border-blue-100 rounded-lg px-4 py-3">
          {pendingMessage}
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-900">最终得分分布</h3>
        {gradedTotal === 0 ? (
          <p className="mt-4 text-sm text-gray-500">目前尚无评分数据，待学生完成实验并评分后将显示分布情况。</p>
        ) : (
          <>
            <div className="mt-4 h-64">
              <ResponsiveContainer>
                <PieChart>
                  <RechartsTooltip formatter={(value: number) => `${value} 人`} />
                  <Pie
                    data={pieData}
                    dataKey="value"
                    nameKey="label"
                    innerRadius="40%"
                    outerRadius="75%"
                    paddingAngle={2}
                  >
                    {pieData.map((item) => (
                      <Cell key={item.label} fill={item.hex} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-sm text-gray-600">
              {pieData.map((item) => (
                <div key={item.label} className="flex items-center space-x-2">
                  <span
                    className="inline-block w-3 h-3 rounded-full"
                    style={{ backgroundColor: item.hex }}
                  />
                  <span className="font-medium text-gray-800">{item.label}</span>
                  <span className="text-gray-500">{item.value} 人</span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      <GradeCharts grades={chartGrades} />

      <div className="bg-white rounded-lg shadow-md p-6 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between md:space-x-4 space-y-3 md:space-y-0">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">学生成绩详情</h2>
            <p className="text-sm text-gray-500">共 {filteredGrades.length} 条记录</p>
          </div>
          <div className="flex flex-col md:flex-row md:items-center md:space-x-3 w-full md:w-auto">
            {exportedFileUrl ? (
              <a
                href={exportedFileUrl}
                download
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
              >
                <Download className="w-4 h-4 mr-2" />
                下载成绩 CSV
              </a>
            ) : (
              <Button
                onClick={handleExport}
                disabled={isExporting || !selectedClassId || isLoadingGrades}
                className="bg-blue-600 hover:bg-blue-700 disabled:cursor-not-allowed"
              >
                {isExporting ? (
                  <span className="flex items-center">
                    <Loader className="w-4 h-4 mr-2 animate-spin" />
                    正在导出...
                  </span>
                ) : (
                  <span className="flex items-center">
                    <Download className="w-4 h-4 mr-2" />
                    导出 CSV
                  </span>
                )}
              </Button>
            )}
            <div className="relative w-full md:w-80 mt-3 md:mt-0">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="搜索学生姓名或学号"
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {error && !isLoadingGrades && (
          <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded-lg text-sm">
            {error}
          </div>
        )}

        {exportError && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm flex items-center space-x-2">
            <AlertTriangle size={16} />
            <span>{exportError}</span>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  序号
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  姓名
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <button
                    type="button"
                    onClick={() => handleSort('username')}
                    className="inline-flex items-center space-x-1 text-gray-600 hover:text-blue-600 focus:outline-none"
                  >
                    <span>学号</span>
                    {renderSortIcon('username')}
                  </button>
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <button
                    type="button"
                    onClick={() => handleSort('exp_flow_score')}
                    className="inline-flex items-center space-x-1 text-gray-600 hover:text-blue-600 focus:outline-none"
                  >
                    <span>实验流程</span>
                    {renderSortIcon('exp_flow_score')}
                  </button>
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <button
                    type="button"
                    onClick={() => handleSort('knowledge_test')}
                    className="inline-flex items-center space-x-1 text-gray-600 hover:text-blue-600 focus:outline-none"
                  >
                    <span>知识测试</span>
                    {renderSortIcon('knowledge_test')}
                  </button>
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <button
                    type="button"
                    onClick={() => handleSort('model_quality')}
                    className="inline-flex items-center space-x-1 text-gray-600 hover:text-blue-600 focus:outline-none"
                  >
                    <span>模型选择</span>
                    {renderSortIcon('model_quality')}
                  </button>
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <button
                    type="button"
                    onClick={() => handleSort('report_quality')}
                    className="inline-flex items-center space-x-1 text-gray-600 hover:text-blue-600 focus:outline-none"
                  >
                    <span>实验报告</span>
                    {renderSortIcon('report_quality')}
                  </button>
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <button
                    type="button"
                    onClick={() => handleSort('final_score')}
                    className="inline-flex items-center space-x-1 text-gray-600 hover:text-blue-600 focus:outline-none"
                  >
                    <span>最终得分</span>
                    {renderSortIcon('final_score')}
                  </button>
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <button
                    type="button"
                    onClick={() => handleSort('evaluation')}
                    className="inline-flex items-center space-x-1 text-gray-600 hover:text-blue-600 focus:outline-none"
                  >
                    <span>状态</span>
                    {renderSortIcon('evaluation')}
                  </button>
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  详情
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {isLoadingGrades ? (
                <tr><td colSpan={10} className="text-center py-10"><Loader className="mx-auto animate-spin text-blue-500" /></td></tr>
              ) : sortedGrades.length === 0 ? (
                <tr><td colSpan={10} className="text-center py-10 text-gray-500">无数据显示。</td></tr>
              ) : (
                sortedGrades.map((grade, index) => (
                  <GradeRow
                    key={grade.student_id}
                    grade={grade}
                    index={index}
                    isExpanded={expandedRows.includes(grade.student_id)}
                    onToggle={toggleRow}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
        </>
      )}
    </div>
  );
};

const COLOR_VARIANTS = {
  blue: {
    bg: 'bg-blue-50',
    border: 'border-blue-100',
    text: 'text-blue-600',
    textBold: 'text-blue-900',
  },
  green: {
    bg: 'bg-green-50',
    border: 'border-green-100',
    text: 'text-green-600',
    textBold: 'text-green-900',
  },
  yellow: {
    bg: 'bg-yellow-50',
    border: 'border-yellow-100',
    text: 'text-yellow-600',
    textBold: 'text-yellow-900',
  },
  red: {
    bg: 'bg-red-50',
    border: 'border-red-100',
    text: 'text-red-600',
    textBold: 'text-red-900',
  },
  purple: {
    bg: 'bg-purple-50',
    border: 'border-purple-100',
    text: 'text-purple-600',
    textBold: 'text-purple-900',
  },
} as const;

type ColorVariant = keyof typeof COLOR_VARIANTS;

const StatCard: React.FC<{
  icon: React.ElementType;
  color: ColorVariant;
  title: string;
  value: string | number | null;
}> = ({ icon: Icon, color, title, value }) => {
  const colors = COLOR_VARIANTS[color];

  return (
    <div className={`${colors.bg} border ${colors.border} rounded-xl p-4`}>
      <div className="flex items-center space-x-3">
        <Icon className={colors.text} size={20} />
        <div>
          <p className={`text-sm ${colors.text}`}>{title}</p>
          <p className={`text-2xl font-bold ${colors.textBold}`}>
            {value === null || value === undefined || value === '' ? '—' : value}
          </p>
        </div>
      </div>
    </div>
  );
};

export default GradesOverview;
