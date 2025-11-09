import React, { useEffect, useMemo, useState } from 'react';
import {
  Search,
  Clock,
  Calendar,
  ChevronDown,
  ChevronRight,
  AlertTriangle,
  Loader,
} from 'lucide-react';
import type { Class, StudentExperimentLog } from '@/shared/types';
import { apiClient } from '@/utils/apiClient';
import { decodeToken } from '@/utils/auth';

interface StudentExperimentSummary {
  studentId: number;
  studentUsername: string;
  studentName: string;
  totalExperiments: number;
  totalDurationSeconds: number;
  averageDurationSeconds: number;
  lastActivityAt: string | null;
  experiments: StudentExperimentDetailSummary[];
}

interface StudentExperimentDetailSummary {
  experimentId: number;
  status: string;
  startTime: string | null;
  lastActivityAt: string | null;
  completionTime: string | null;
  durationSeconds: number;
  currentStep: number | null;
  highestCompletedStep: number | null;
  industry: string | null;
  company: string | null;
  product: string | null;
}

const ExperimentLogs: React.FC = () => {
  const [classes, setClasses] = useState<Class[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [rawLogs, setRawLogs] = useState<StudentExperimentLog[]>([]);

  const [teacherId, setTeacherId] = useState<number | null>(null);
  const [isLoadingClasses, setIsLoadingClasses] = useState(true);
  const [isLoadingStatuses, setIsLoadingStatuses] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [expandedRows, setExpandedRows] = useState<number[]>([]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      setError('未找到登录凭据，请重新登录。');
      setIsLoadingClasses(false);
      return;
    }
    const decoded = decodeToken(token);
    if (!decoded) {
      setError('登录信息已失效，请重新登录。');
      setIsLoadingClasses(false);
      return;
    }
    setTeacherId(decoded.sub);
  }, []);

  useEffect(() => {
    const handler = window.setTimeout(() => {
      setDebouncedSearchTerm(searchTerm.trim().toLowerCase());
    }, 300);

    return () => {
      window.clearTimeout(handler);
    };
  }, [searchTerm]);

  useEffect(() => {
    if (teacherId === null) return;

    const fetchClasses = async () => {
      setIsLoadingClasses(true);
      setError(null);
      try {
        const response = await apiClient.get(`/teachers/${teacherId}/classes`);
        const classList = Array.isArray(response) ? (response as Class[]) : [];
        setClasses(classList);
        const firstClass = classList[0];
        setSelectedClassId(firstClass ? String(firstClass.class_id) : '');
      } catch (err: any) {
        setError(err.message || '获取班级列表失败');
        setClasses([]);
        setSelectedClassId('');
      } finally {
        setIsLoadingClasses(false);
      }
    };

    fetchClasses();
  }, [teacherId]);

  useEffect(() => {
    setExpandedRows([]);
    setRawLogs([]);

    if (!selectedClassId) {
      return;
    }

    const fetchStatuses = async () => {
      setIsLoadingStatuses(true);
      setError(null);
      try {
        const response = await apiClient.get(`/classes/${selectedClassId}/experiment-runs`);
        const records = Array.isArray(response) ? (response as StudentExperimentLog[]) : [];
        setRawLogs(records);
      } catch (err: any) {
        setError(err.message || '获取实验日志失败');
        setRawLogs([]);
      } finally {
        setIsLoadingStatuses(false);
      }
    };

    fetchStatuses();
  }, [selectedClassId]);

  const summaries = useMemo<StudentExperimentSummary[]>(() => {
    const toDate = (value: string | null): Date | null => {
      if (!value) return null;
      const date = new Date(value);
      return Number.isNaN(date.getTime()) ? null : date;
    };

    const getLatestTimestamp = (detail: StudentExperimentDetailSummary): Date | null => {
      return (
        toDate(detail.lastActivityAt) ??
        toDate(detail.completionTime) ??
        toDate(detail.startTime)
      );
    };

    const toDurationSeconds = (value: number | null): number => {
      if (typeof value !== 'number' || Number.isNaN(value) || value <= 0) {
        return 0;
      }
      return value;
    };

    const summaries = rawLogs.map((log) => {
      const experiments = Array.isArray(log.experiments) ? log.experiments : [];
      const details: StudentExperimentDetailSummary[] = experiments.map((experiment) => ({
        experimentId: experiment.experiment_id,
        status: experiment.status,
        startTime: experiment.start_time,
        lastActivityAt: experiment.last_activity_at,
        completionTime: experiment.completion_time,
        durationSeconds: toDurationSeconds(experiment.total_active_duration_seconds),
        currentStep: experiment.current_step,
        highestCompletedStep: experiment.highest_completed_step,
        industry: experiment.selected_industry,
        company: experiment.selected_company,
        product: experiment.selected_product,
      }));

      const sortedDetails = details.sort((a, b) => {
        const aDate = getLatestTimestamp(a);
        const bDate = getLatestTimestamp(b);
        if (!aDate && !bDate) return 0;
        if (!aDate) return 1;
        if (!bDate) return -1;
        return bDate.getTime() - aDate.getTime();
      });

      const totalDurationSeconds = sortedDetails.reduce((sum, detail) => sum + detail.durationSeconds, 0);
      const totalExperiments = sortedDetails.length;
      const averageDurationSeconds = totalExperiments > 0 ? Math.round(totalDurationSeconds / totalExperiments) : 0;

      const latestActivity = sortedDetails.reduce<Date | null>((latest, detail) => {
        const candidate = getLatestTimestamp(detail);
        if (!candidate) return latest;
        if (!latest || candidate > latest) return candidate;
        return latest;
      }, null);

      return {
        studentId: log.student_id,
        studentUsername: log.username,
        studentName: log.full_name,
        totalExperiments,
        totalDurationSeconds,
        averageDurationSeconds,
        lastActivityAt: latestActivity ? latestActivity.toISOString() : null,
        experiments: sortedDetails,
      };
    });

    return summaries.sort((a, b) => a.studentName.localeCompare(b.studentName, 'zh-CN'));
  }, [rawLogs]);

  const filteredSummaries = useMemo(() => {
    if (!debouncedSearchTerm) return summaries;
    return summaries.filter((summary) =>
      summary.studentName.toLowerCase().includes(debouncedSearchTerm) ||
      summary.studentUsername.toLowerCase().includes(debouncedSearchTerm),
    );
  }, [summaries, debouncedSearchTerm]);

  const totalStudents = summaries.length;
  const totalExperiments = summaries.reduce((sum, summary) => sum + summary.totalExperiments, 0);
  const totalDurationSeconds = summaries.reduce((sum, summary) => sum + summary.totalDurationSeconds, 0);
  const averageDurationSeconds = totalStudents > 0 ? Math.round(totalDurationSeconds / totalStudents) : 0;

  const currentClassName = useMemo(() =>
    classes.find((cls) => String(cls.class_id) === selectedClassId)?.class_name ?? '—',
  [classes, selectedClassId]);

  const toggleRowExpansion = (studentId: number) => {
    setExpandedRows((prev) =>
      prev.includes(studentId)
        ? prev.filter((id) => id !== studentId)
        : [...prev, studentId],
    );
  };

  const formatDuration = (seconds: number) => {
    if (!seconds || seconds <= 0) return '—';
    const rounded = Math.max(1, Math.round(seconds));
    const hours = Math.floor(rounded / 3600);
    const minutes = Math.floor((rounded % 3600) / 60);
    const secs = rounded % 60;

    if (hours > 0) {
      return minutes > 0 ? `${hours}小时${minutes}分钟` : `${hours}小时`;
    }
    if (minutes > 0) {
      return secs > 0 ? `${minutes}分钟${secs}秒` : `${minutes}分钟`;
    }
    return `${secs}秒`;
  };

  const formatDateTime = (value: string | null) => {
    if (!value) return '—';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '—';
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day} ${hours}:${minutes}`;
  };

  const durationClass = 'text-base font-semibold text-gray-900';

  const mapStatusToDisplay = (status: string) => {
    switch (status) {
      case 'Completed':
        return { label: '已完成', color: 'text-green-700 bg-green-100' };
      case 'In Progress':
        return { label: '进行中', color: 'text-blue-700 bg-blue-100' };
      case 'Not Started':
      default:
        return { label: '未开始', color: 'text-gray-700 bg-gray-100' };
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between md:space-x-6 space-y-3 md:space-y-0">
        <h1 className="text-2xl font-bold text-gray-900">实验日志</h1>
        {selectedClassId && (
          <p className="text-sm text-gray-500">当前班级：{currentClassName}</p>
        )}
      </div>

      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">选择班级</label>
            <select
              value={selectedClassId}
              onChange={(event) => setSelectedClassId(event.target.value)}
              disabled={isLoadingClasses || classes.length === 0}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
            >
              {classes.length === 0 ? (
                <option value="" disabled>
                  {isLoadingClasses ? '正在加载班级...' : '暂无班级'}
                </option>
              ) : (
                classes.map((cls) => (
                  <option key={cls.class_id} value={cls.class_id}>
                    {cls.class_name}
                  </option>
                ))
              )}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">按学号/姓名搜索</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <input
                type="text"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="输入学号或姓名"
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center space-x-2">
          <AlertTriangle size={18} />
          <span>{error}</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center">
            <Clock className="w-8 h-8 text-blue-600 mr-3" />
            <div>
              <p className="text-sm text-gray-600">总学生数</p>
              <p className="text-2xl font-bold text-gray-900">{totalStudents}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center">
            <Calendar className="w-8 h-8 text-green-600 mr-3" />
            <div>
              <p className="text-sm text-gray-600">总实验次数</p>
              <p className="text-2xl font-bold text-gray-900">{totalExperiments}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center">
            <Clock className="w-8 h-8 text-purple-600 mr-3" />
            <div>
              <p className="text-sm text-gray-600">总时长</p>
              <p className="text-2xl font-bold text-gray-900">{formatDuration(totalDurationSeconds)}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center">
            <Clock className="w-8 h-8 text-orange-600 mr-3" />
            <div>
              <p className="text-sm text-gray-600">平均每生时长</p>
              <p className="text-2xl font-bold text-gray-900">{formatDuration(averageDurationSeconds)}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">学生实验日志</h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">序号</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">姓名</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">学号</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">实验次数</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">总时长</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">平均时长</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">最近活动</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">详情</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {!selectedClassId && (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-gray-500">
                    请先选择一个班级查看实验日志。
                  </td>
                </tr>
              )}

              {selectedClassId && isLoadingStatuses && (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-gray-500">
                    <div className="flex items-center justify-center space-x-2">
                      <Loader className="animate-spin" size={18} />
                      <span>正在加载实验日志...</span>
                    </div>
                  </td>
                </tr>
              )}

              {selectedClassId && !isLoadingStatuses && filteredSummaries.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-gray-500">
                    {debouncedSearchTerm ? '未找到符合搜索条件的学生。' : '该班级暂无实验日志记录。'}
                  </td>
                </tr>
              )}

              {selectedClassId && !isLoadingStatuses && filteredSummaries.map((summary, index) => {
                const isExpanded = expandedRows.includes(summary.studentId);
                return (
                  <React.Fragment key={summary.studentId}>
                    <tr className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm text-gray-600">{index + 1}</td>
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">{summary.studentName}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{summary.studentUsername}</td>
                      <td className="px-6 py-4 text-sm text-gray-900">{summary.totalExperiments}</td>
                      <td className="px-6 py-4 text-sm text-gray-900 font-semibold">
                        {formatDuration(summary.totalDurationSeconds)}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">{formatDuration(summary.averageDurationSeconds)}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{formatDateTime(summary.lastActivityAt)}</td>
                      <td className="px-6 py-4 text-center">
                        <button
                          onClick={() => toggleRowExpansion(summary.studentId)}
                          className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 hover:text-blue-700 transition-all duration-200"
                        >
                          {isExpanded ? (
                            <><ChevronDown size={14} className="mr-1" />收起</>
                          ) : (
                            <><ChevronRight size={14} className="mr-1" />展开</>
                          )}
                        </button>
                      </td>
                    </tr>

                    {isExpanded && (
                      <tr className="bg-slate-50">
                        <td colSpan={8} className="px-8 py-6">
                          <div className="space-y-4">
                            <h3 className="text-sm font-semibold text-gray-700">实验记录</h3>
                            <div className="space-y-3">
                              {summary.experiments.length === 0 ? (
                                <div className="text-sm text-gray-500">该学生暂无实验记录。</div>
                              ) : (
                                summary.experiments.map((experiment) => {
                                  const statusMeta = mapStatusToDisplay(experiment.status);
                                  return (
                                    <div key={`${summary.studentId}-${experiment.experimentId}`} className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
                                      <div className="flex flex-col space-y-4">
                                        <div className="flex flex-wrap items-center gap-3">
                                          <div className={`px-3 py-1 rounded-full text-sm font-medium ${statusMeta.color}`}>
                                            {statusMeta.label}
                                          </div>
                                          <span className="text-sm text-gray-500">
                                            实验 ID：<span className="font-medium text-gray-900">#{experiment.experimentId}</span>
                                          </span>
                                          {typeof experiment.currentStep === 'number' && (
                                            <span className="text-sm text-gray-500">
                                              当前步骤：<span className="font-medium text-gray-900">{experiment.currentStep}</span>
                                            </span>
                                          )}
                                          {typeof experiment.highestCompletedStep === 'number' && (
                                            <span className="text-sm text-gray-500">
                                              已完成步骤：<span className="font-medium text-gray-900">{experiment.highestCompletedStep}</span>
                                            </span>
                                          )}
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-gray-700">
                                          <div>
                                            <span className="text-gray-500">开始时间：</span>
                                            <span className="font-medium text-gray-900">{formatDateTime(experiment.startTime)}</span>
                                          </div>
                                          <div>
                                            <span className="text-gray-500">最近活跃：</span>
                                            <span className="font-medium text-gray-900">{formatDateTime(experiment.lastActivityAt)}</span>
                                          </div>
                                          <div>
                                            <span className="text-gray-500">完成时间：</span>
                                            <span className="font-medium text-gray-900">{formatDateTime(experiment.completionTime)}</span>
                                          </div>
                                          <div className={durationClass}>
                                            累计时长：{formatDuration(experiment.durationSeconds)}
                                          </div>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm text-gray-700">
                                          <div>
                                            <span className="text-gray-500">行业：</span>
                                            <span className="font-medium text-gray-900">{experiment.industry ?? '—'}</span>
                                          </div>
                                          <div>
                                            <span className="text-gray-500">企业：</span>
                                            <span className="font-medium text-gray-900">{experiment.company ?? '—'}</span>
                                          </div>
                                          <div>
                                            <span className="text-gray-500">产品：</span>
                                            <span className="font-medium text-gray-900">{experiment.product ?? '—'}</span>
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ExperimentLogs;
