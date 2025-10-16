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
import type { Class, ClassExperimentStatus } from '../../types';
import { apiClient } from '../../../../utils/apiClient';
import { decodeToken } from '../../../../utils/auth';

interface StudentSessionSummary {
  status: ClassExperimentStatus['status'];
  startTime: string | null;
  endTime: string | null;
  durationMinutes: number;
}

interface StudentExperimentSummary {
  studentId: number;
  studentUsername: string;
  studentName: string;
  totalSessions: number;
  totalDurationMinutes: number;
  averageDurationMinutes: number;
  lastActivityAt: string | null;
  sessions: StudentSessionSummary[];
}

const FALLBACK_SESSION_MINUTES = 1;

const ExperimentLogs: React.FC = () => {
  const [classes, setClasses] = useState<Class[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [rawStatuses, setRawStatuses] = useState<ClassExperimentStatus[]>([]);

  const [assistantId, setAssistantId] = useState<number | null>(null);
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
    setAssistantId(decoded.sub);
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
    if (assistantId === null) return;

    const fetchClasses = async () => {
      setIsLoadingClasses(true);
      setError(null);
      try {
        const response = await apiClient.get(`/assistants/${assistantId}/classes`);
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
  }, [assistantId]);

  useEffect(() => {
    setExpandedRows([]);
    setRawStatuses([]);

    if (!selectedClassId) {
      return;
    }

    const fetchStatuses = async () => {
      setIsLoadingStatuses(true);
      setError(null);
      try {
        const response = await apiClient.get(`/classes/${selectedClassId}/experiment-status`);
        const records = Array.isArray(response) ? (response as ClassExperimentStatus[]) : [];
        setRawStatuses(records);
      } catch (err: any) {
        setError(err.message || '获取实验日志失败');
        setRawStatuses([]);
      } finally {
        setIsLoadingStatuses(false);
      }
    };

    fetchStatuses();
  }, [selectedClassId]);

  const summaries = useMemo<StudentExperimentSummary[]>(() => {
    const map = new Map<number, StudentExperimentSummary>();

    const ensureSummary = (status: ClassExperimentStatus) => {
      let summary = map.get(status.student_id);
      if (!summary) {
        summary = {
          studentId: status.student_id,
          studentUsername: status.student_username,
          studentName: status.student_full_name,
          totalSessions: 0,
          totalDurationMinutes: 0,
          averageDurationMinutes: 0,
          lastActivityAt: null,
          sessions: [],
        };
        map.set(status.student_id, summary);
      }
      return summary;
    };

    rawStatuses.forEach((status) => {
      const summary = ensureSummary(status);
      const start = status.start_time ? new Date(status.start_time) : null;
      const fallbackEnd = start ? new Date(start.getTime() + FALLBACK_SESSION_MINUTES * 60 * 1000) : null;
      const lastActivity = status.last_activity_at ? new Date(status.last_activity_at) : null;
      const completion = status.completion_time ? new Date(status.completion_time) : null;

      const end = lastActivity ?? completion ?? fallbackEnd;
      const duration = start && end ? Math.max(FALLBACK_SESSION_MINUTES, Math.round((end.getTime() - start.getTime()) / 60000)) : 0;

      const displayEnd = status.status === 'In Progress' ? (status.last_activity_at ? new Date(status.last_activity_at).toISOString() : fallbackEnd?.toISOString() ?? null) : (end ? end.toISOString() : status.completion_time);

      summary.sessions.push({
        status: status.status,
        startTime: status.start_time,
        endTime: displayEnd,
        durationMinutes: duration,
      });

      summary.totalSessions += 1;
      summary.totalDurationMinutes += duration;

      const candidateLastActivity = (end ?? completion ?? fallbackEnd)?.toISOString() ?? status.last_activity_at ?? status.completion_time ?? status.start_time;
      if (candidateLastActivity) {
        if (!summary.lastActivityAt || new Date(candidateLastActivity) > new Date(summary.lastActivityAt)) {
          summary.lastActivityAt = candidateLastActivity;
        }
      }
    });

    const result = Array.from(map.values()).map((summary) => {
      const sortedSessions = [...summary.sessions].sort((a, b) => {
        if (!a.startTime || !b.startTime) return 0;
        return new Date(b.startTime).getTime() - new Date(a.startTime).getTime();
      });

      const average = summary.totalSessions > 0 ? Math.round(summary.totalDurationMinutes / summary.totalSessions) : 0;

      return {
        ...summary,
        sessions: sortedSessions,
        averageDurationMinutes: average,
      };
    });

    return result.sort((a, b) => a.studentName.localeCompare(b.studentName, 'zh-CN'));
  }, [rawStatuses]);

  const filteredSummaries = useMemo(() => {
    if (!debouncedSearchTerm) return summaries;
    return summaries.filter((summary) =>
      summary.studentName.toLowerCase().includes(debouncedSearchTerm) ||
      summary.studentUsername.toLowerCase().includes(debouncedSearchTerm),
    );
  }, [summaries, debouncedSearchTerm]);

  const totalStudents = summaries.length;
  const totalSessions = summaries.reduce((sum, summary) => sum + summary.totalSessions, 0);
  const totalDurationMinutes = summaries.reduce((sum, summary) => sum + summary.totalDurationMinutes, 0);
  const averageDurationMinutes = totalStudents > 0 ? Math.round(totalDurationMinutes / totalStudents) : 0;

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

  const formatDuration = (minutes: number) => {
    if (minutes <= 0) return '—';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}小时${mins}分钟` : `${mins}分钟`;
  };

  const formatDateTime = (value: string | null) => {
    if (!value) return '—';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '—';
    return date.toLocaleString('zh-CN');
  };

  const durationClass = 'text-base font-semibold text-gray-900';

  const mapStatusToDisplay = (status: ClassExperimentStatus['status']) => {
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
              <p className="text-2xl font-bold text-gray-900">{totalSessions}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center">
            <Clock className="w-8 h-8 text-purple-600 mr-3" />
            <div>
              <p className="text-sm text-gray-600">总时长</p>
              <p className="text-2xl font-bold text-gray-900">{formatDuration(totalDurationMinutes)}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center">
            <Clock className="w-8 h-8 text-orange-600 mr-3" />
            <div>
              <p className="text-sm text-gray-600">平均每生时长</p>
              <p className="text-2xl font-bold text-gray-900">{formatDuration(averageDurationMinutes)}</p>
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
                  <td colSpan={7} className="py-12 text-center text-gray-500">
                    请先选择一个班级查看实验日志。
                  </td>
                </tr>
              )}

              {selectedClassId && isLoadingStatuses && (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-gray-500">
                    <div className="flex items-center justify-center space-x-2">
                      <Loader className="animate-spin" size={18} />
                      <span>正在加载实验日志...</span>
                    </div>
                  </td>
                </tr>
              )}

              {selectedClassId && !isLoadingStatuses && filteredSummaries.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-gray-500">
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
                      <td className="px-6 py-4 text-sm text-gray-900">{summary.totalSessions}</td>
                      <td className="px-6 py-4 text-sm text-gray-900 font-semibold">
                        {formatDuration(summary.totalDurationMinutes)}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">{formatDuration(summary.averageDurationMinutes)}</td>
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
                        <td colSpan={7} className="px-8 py-6">
                          <div className="space-y-4">
                            <h3 className="text-sm font-semibold text-gray-700">实验记录</h3>
                            <div className="space-y-3">
                              {summary.sessions.map((session, index) => {
                                // const sequenceLabel = `第${index + 1}次`;
                                const statusMeta = mapStatusToDisplay(session.status);
                                const showEndLabel = session.status === 'In Progress' ? '最近活跃' : '结束时间';

                                return (
                                  <div key={`${summary.studentId}-${index}`} className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
                                    <div className="flex flex-col md:flex-row md:items-center md:justify-between md:space-x-6 space-y-3 md:space-y-0">
                                      <div className="flex items-center space-x-4">
                                        {/* <div className={`px-4 py-2 rounded-full text-base font-semibold ${statusMeta.color}`}>
                                          {sequenceLabel}
                                        </div> */}
                                        <div className={`px-3 py-1 rounded-full text-sm font-medium ${statusMeta.color}`}>
                                          {statusMeta.label}
                                        </div>
                                      </div>
                                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-gray-700">
                                        <div>
                                          <span className="text-gray-500">开始时间：</span>
                                          <span className="font-medium text-gray-900">{formatDateTime(session.startTime)}</span>
                                        </div>
                                        <div>
                                          <span className="text-gray-500">{showEndLabel}：</span>
                                          <span className="font-medium text-gray-900">{formatDateTime(session.endTime)}</span>
                                        </div>
                                      </div>
                                      <div className={durationClass}>
                                        时长：{formatDuration(session.durationMinutes)}
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
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
