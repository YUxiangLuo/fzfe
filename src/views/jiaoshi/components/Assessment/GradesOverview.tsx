import React, { useEffect, useMemo, useState } from 'react';
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
  Download,
  AlertTriangle,
} from 'lucide-react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip as RechartsTooltip,
} from 'recharts';
import type { StudentGradeOverview, Class } from '../../types';
import { apiClient, API_BASE_URL } from '../../../../utils/apiClient';
import { decodeToken } from '../../../../utils/auth';
import { DOWNLOAD_SERVER_BASE_URL } from '../../../../config/appConfig';
import GradeCharts, { type GradeChartDatum } from '../../../shared/assessment/GradeCharts';
import Button from '../../../../shared/components/Button';

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

const formatScore = (value: number | null) => {
  if (value === null || Number.isNaN(value)) {
    return '—';
  }
  return value.toFixed(2);
};

const getEvaluationBadge = (grade: StudentGradeOverview) => {
  const status = getProgressStatus(grade);

  if (status === 'not-started') {
    return { text: '未进行实验', color: 'bg-gray-100 text-gray-600 border border-gray-200' };
  }
  if (status === 'in-progress') {
    return { text: '评分进行中', color: 'bg-amber-100 text-amber-800 border border-amber-200' };
  }

  const score = grade.final_score;
  if (score === null || Number.isNaN(score)) {
    return { text: '已完成评分', color: 'bg-blue-100 text-blue-800 border border-blue-200' };
  }
  if (score >= 90) return { text: '优秀', color: 'bg-blue-100 text-blue-800 border border-blue-200' };
  if (score >= 80) return { text: '良好', color: 'bg-green-100 text-green-800 border border-green-200' };
  if (score >= 70) return { text: '中等', color: 'bg-yellow-100 text-yellow-800 border border-yellow-200' };
  if (score >= 60) return { text: '及格', color: 'bg-purple-100 text-purple-800 border border-purple-200' };
  return { text: '不及格', color: 'bg-red-100 text-red-800 border border-red-200' };
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

type ProgressStatus = 'not-started' | 'in-progress' | 'completed';

const getProgressStatus = (grade: StudentGradeOverview): ProgressStatus => {
  if (grade.report_quality === null) {
    return grade.experiment_id === null ? 'not-started' : 'in-progress';
  }
  return 'completed';
};

type StatusVariant = 'completed' | 'progress' | 'idle';

const STATUS_STYLES: Record<StatusVariant, string> = {
  completed: 'bg-blue-50 text-blue-700 border border-blue-100',
  progress: 'bg-amber-50 text-amber-700 border border-amber-100',
  idle: 'bg-gray-50 text-gray-600 border border-gray-200',
};

const StatusChip: React.FC<{ variant: StatusVariant; label: string; value: number }> = ({ variant, label, value }) => (
  <span className={`px-3 py-1 rounded-full text-xs md:text-sm font-medium ${STATUS_STYLES[variant]}`}>
    {label}：{value} 人
  </span>
);

const GradesOverview: React.FC = () => {
  const [classes, setClasses] = useState<Class[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [grades, setGrades] = useState<StudentGradeOverview[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  
  const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: 'asc' | 'desc' } | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [exportedFileUrl, setExportedFileUrl] = useState<string | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);

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
          const firstClass = response[0];
          if (firstClass) {
            setSelectedClassId(String(firstClass.class_id));
          }
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
      return;
    }
    // Clear export state when class changes
    setExportedFileUrl(null);
    setExportError(null);

    const fetchGrades = async () => {
      setIsLoadingGrades(true);
      setError(null);
      try {
        const response = await apiClient.get<StudentGradeOverview[]>(`/classes/${selectedClassId}/grade-summaries`);
        setGrades(Array.isArray(response) ? response : []);
        if (!Array.isArray(response) || response.length === 0) {
          setError('该班级暂无成绩记录。');
        }
      } catch (err: any) {
        setGrades([]);
        if (err.message && err.message.includes("Grade weights for this class have not been set up")) {
          setError("无法计算成绩，因为当前班级尚未设置成绩权重。请先前往‘成绩权重’页面进行设置。");
        } else {
          setError(err?.message || '获取成绩数据失败。');
        }
      } finally {
        setIsLoadingGrades(false);
      }
    };

    fetchGrades();
  }, [selectedClassId]);

  const filteredGrades = useMemo(() => {
    if (!debouncedSearch) return grades;
    const query = debouncedSearch.toLowerCase();
    return grades.filter(
      (grade) =>
        grade.full_name.toLowerCase().includes(query) ||
        grade.username.toLowerCase().includes(query),
    );
  }, [grades, debouncedSearch]);

  const currentClass = useMemo(
    () =>
      classes.find((cls) => String(cls.class_id) === selectedClassId) ?? null,
    [classes, selectedClassId],
  );

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
          return direction === 'asc' ? aValue.localeCompare(bValue, 'zh-Hans-CN') : bValue.localeCompare(aValue, 'zh-Hans-CN');
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
            'completed': 2,
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

  const gradeInsights = useMemo(() => {
    const completed = grades.filter((grade) => getProgressStatus(grade) === 'completed');
    const inProgress = grades.filter((grade) => getProgressStatus(grade) === 'in-progress');
    const notStarted = grades.filter((grade) => getProgressStatus(grade) === 'not-started');

    const validScores = completed
      .map((grade) => grade.final_score)
      .filter((score): score is number => score !== null && !Number.isNaN(score));

    if (validScores.length === 0) {
      return {
        completedStudents: completed,
        completedCount: completed.length,
        inProgressCount: inProgress.length,
        notStartedCount: notStarted.length,
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
      notStartedCount: notStarted.length,
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

  const pendingCount = gradeInsights.inProgressCount + gradeInsights.notStartedCount;
  const pendingMessage =
    pendingCount > 0
      ? `提示：未进行实验或评分进行中的学生暂不纳入平均分、分布等统计（当前共 ${pendingCount} 人）。`
      : '提示：当前班级所有学生都已完成评分，统计数据包含全部学生。';

  const chartGrades = useMemo<GradeChartDatum[]>(
    () =>
      grades.map((grade) => ({
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

    setIsExporting(true);
    setExportError(null);
    setExportedFileUrl(null);
    try {
      const response = await apiClient.get<{ file_path: string }>(`/classes/${selectedClassId}/grade-export.csv`);

      if (!response || !response.file_path) {
        throw new Error('导出失败：服务器未返回文件地址');
      }

      const filename = response.file_path.split("/").pop();
      const fullUrl = `${DOWNLOAD_SERVER_BASE_URL}/exports/${filename}`;
      setExportedFileUrl(fullUrl);
    } catch (err: any) {
      const errorMessage = err?.message || '导出失败，请稍后重试。';
      setExportError(errorMessage);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-md p-6 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between md:space-x-4 space-y-3 md:space-y-0">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">成绩概览</h1>
            <p className="text-sm text-gray-500">查看班级整体成绩表现与分布</p>
          </div>
          <div className="flex items-center space-x-3">
            <select
              value={selectedClassId}
              onChange={(event) => setSelectedClassId(event.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              disabled={isLoadingClasses || classes.length === 0}
            >
              {classes.length === 0 ? (
                <option value="">{isLoadingClasses ? '加载班级...' : '暂无班级'}</option>
              ) : (
                classes.map((cls) => (
                  <option key={cls.class_id} value={cls.class_id}>{cls.class_name}</option>
                ))
              )}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
          <StatCard icon={Users} color="blue" title="班级人数" value={grades.length} />
          <StatCard icon={Award} color="green" title="平均总分" value={formatStatValue(gradeInsights.avgFinalGrade)} />
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
          <StatusChip variant="progress" label="评分进行中" value={gradeInsights.inProgressCount} />
          <StatusChip variant="idle" label="未进行实验" value={gradeInsights.notStartedCount} />
        </div>
        <div className="text-sm text-blue-700 bg-blue-50 border border-blue-100 rounded-lg px-4 py-3">
          {pendingMessage}
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-900">总分分布</h3>
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
                    <span>模型质量</span>
                    {renderSortIcon('model_quality')}
                  </button>
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <button
                    type="button"
                    onClick={() => handleSort('report_quality')}
                    className="inline-flex items-center space-x-1 text-gray-600 hover:text-blue-600 focus:outline-none"
                  >
                    <span>报告质量</span>
                    {renderSortIcon('report_quality')}
                  </button>
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <button
                    type="button"
                    onClick={() => handleSort('final_score')}
                    className="inline-flex items-center space-x-1 text-gray-600 hover:text-blue-600 focus:outline-none"
                  >
                    <span>总分</span>
                    {renderSortIcon('final_score')}
                  </button>
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <button
                    type="button"
                    onClick={() => handleSort('evaluation')}
                    className="inline-flex items-center space-x-1 text-gray-600 hover:text-blue-600 focus:outline-none"
                  >
                    <span>评价</span>
                    {renderSortIcon('evaluation')}
                  </button>
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {isLoadingGrades ? (
                <tr><td colSpan={9} className="text-center py-10"><Loader className="mx-auto animate-spin text-blue-500" /></td></tr>
              ) : sortedGrades.length === 0 ? (
                <tr><td colSpan={9} className="text-center py-10 text-gray-500">无数据显示。</td></tr>
              ) : (
                sortedGrades.map((grade, index) => {
                  const badge = getEvaluationBadge(grade);
                  return (
                    <tr key={grade.student_id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-gray-600">{index + 1}</td>
                      <td className="px-4 py-3 text-sm text-gray-900 font-medium">{grade.full_name}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{grade.username}</td>
                      <td className="px-4 py-3 text-sm text-gray-700">{formatScore(grade.exp_flow_score)}</td>
                      <td className="px-4 py-3 text-sm text-gray-700">{formatScore(grade.knowledge_test)}</td>
                      <td className="px-4 py-3 text-sm text-gray-700">{formatScore(grade.model_quality)}</td>
                      <td className="px-4 py-3 text-sm text-gray-700">{formatScore(grade.report_quality)}</td>
                      <td className="px-4 py-3 text-sm font-semibold text-gray-900">{formatScore(grade.final_score)}</td>
                      <td className="px-4 py-3 text-sm">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${badge.color}`}>{badge.text}</span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const StatCard: React.FC<{ icon: React.ElementType; color: string; title: string; value: string | number | null }> = ({
  icon: Icon,
  color,
  title,
  value,
}) => (
  <div className={`bg-${color}-50 border border-${color}-100 rounded-xl p-4`}>
    <div className="flex items-center space-x-3">
      <Icon className={`text-${color}-600`} size={20} />
      <div>
        <p className={`text-sm text-${color}-600`}>{title}</p>
        <p className={`text-2xl font-bold text-${color}-900`}>{value === null || value === undefined || value === '' ? '—' : value}</p>
      </div>
    </div>
  </div>
);

export default GradesOverview;
