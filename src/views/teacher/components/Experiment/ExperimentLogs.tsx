import React, { useEffect, useMemo, useState } from 'react';
import {
  Search,
  Clock,
  Calendar,
  ChevronDown,
  ChevronRight,
  AlertTriangle,
  Loader,
  ArrowUpDown,
  ChevronUp,
} from 'lucide-react';
import type { Class, StudentExperimentLog } from '@/views/teacher/types';
import { apiClient } from '@/utils/apiClient';
import { decodeToken } from '@/utils/auth';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

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

type SortKey = 'username' | 'totalExperiments' | 'totalDurationSeconds' | 'averageDurationSeconds';

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
  const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: 'asc' | 'desc' } | null>(null);

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

      const totalDurationSeconds = details.reduce((sum, detail) => sum + detail.durationSeconds, 0);
      const totalExperiments = details.length;
      const averageDurationSeconds = totalExperiments > 0 ? Math.round(totalDurationSeconds / totalExperiments) : 0;

      const latestActivity = details.reduce<Date | null>((latest, detail) => {
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
        experiments: details,
      };
    });

    return summaries;
  }, [rawLogs]);

  const filteredSummaries = useMemo(() => {
    if (!debouncedSearchTerm) return summaries;
    return summaries.filter((summary) =>
      summary.studentName.toLowerCase().includes(debouncedSearchTerm) ||
      summary.studentUsername.toLowerCase().includes(debouncedSearchTerm),
    );
  }, [summaries, debouncedSearchTerm]);

  const sortedSummaries = useMemo(() => {
    if (!sortConfig) return filteredSummaries;

    const next = [...filteredSummaries];
    const { key, direction } = sortConfig;
    const sortFactor = direction === 'asc' ? 1 : -1;

    next.sort((a, b) => {
      switch (key) {
        case 'username': {
          const aValue = a.studentUsername ?? '';
          const bValue = b.studentUsername ?? '';
          return aValue.localeCompare(bValue) * sortFactor;
        }
        case 'totalExperiments': {
          return (a.totalExperiments - b.totalExperiments) * sortFactor;
        }
        case 'totalDurationSeconds': {
          return (a.totalDurationSeconds - b.totalDurationSeconds) * sortFactor;
        }
        case 'averageDurationSeconds': {
          return (a.averageDurationSeconds - b.averageDurationSeconds) * sortFactor;
        }
        default:
          return 0;
      }
    });

    return next;
  }, [filteredSummaries, sortConfig]);

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
      return <ArrowUpDown className="w-3.5 h-3.5 text-muted-foreground" />;
    }
    return sortConfig.direction === 'desc' ? (
      <ChevronDown className="w-3.5 h-3.5 text-primary" />
    ) : (
      <ChevronUp className="w-3.5 h-3.5 text-primary" />
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

  const durationClass = 'text-base font-semibold text-foreground';

  const mapStatusToDisplay = (status: string) => {
    switch (status) {
      case 'Completed':
        return { label: '已完成', color: 'text-success bg-success/10' };
      case 'In Progress':
        return { label: '进行中', color: 'text-primary bg-primary/10' };
      case 'Not Started':
      default:
        return { label: '未开始', color: 'text-foreground bg-muted' };
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between md:space-x-6 space-y-3 md:space-y-0">
        <h1 className="text-2xl font-bold text-foreground">实验日志</h1>
        {selectedClassId && (
          <p className="text-sm text-muted-foreground">当前班级：{currentClassName}</p>
        )}
      </div>

      <div className="bg-card rounded-lg shadow-md p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label className="text-foreground mb-2">选择班级</Label>
            <Select
              value={selectedClassId}
              onValueChange={setSelectedClassId}
              disabled={isLoadingClasses || classes.length === 0}
            >
              <SelectTrigger className="w-full" aria-label="选择班级">
                <SelectValue
                  placeholder={isLoadingClasses ? '正在加载班级...' : classes.length === 0 ? '暂无班级' : '请选择班级'}
                />
              </SelectTrigger>
              <SelectContent>
                {classes.length === 0 ? (
                  <SelectItem value="__empty__" disabled>
                    {isLoadingClasses ? '正在加载班级...' : '暂无班级'}
                  </SelectItem>
                ) : (
                  classes.map((cls) => (
                    <SelectItem key={cls.class_id} value={String(cls.class_id)}>
                      {cls.class_name}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-foreground mb-2">按学号/姓名搜索</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
              <Input
                type="text"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="输入学号或姓名"
                className="pl-10 pr-4 rounded-lg"
              />
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-lg flex items-center space-x-2">
          <AlertTriangle size={18} />
          <span>{error}</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-card rounded-lg shadow-md p-6">
          <div className="flex items-center">
            <Clock className="w-8 h-8 text-primary mr-3" />
            <div>
              <p className="text-sm text-muted-foreground">总学生数</p>
              <p className="text-2xl font-bold text-foreground">{totalStudents}</p>
            </div>
          </div>
        </div>
        <div className="bg-card rounded-lg shadow-md p-6">
          <div className="flex items-center">
            <Calendar className="w-8 h-8 text-success mr-3" />
            <div>
              <p className="text-sm text-muted-foreground">总实验次数</p>
              <p className="text-2xl font-bold text-foreground">{totalExperiments}</p>
            </div>
          </div>
        </div>
        <div className="bg-card rounded-lg shadow-md p-6">
          <div className="flex items-center">
            <Clock className="w-8 h-8 text-accent-foreground mr-3" />
            <div>
              <p className="text-sm text-muted-foreground">总时长</p>
              <p className="text-2xl font-bold text-foreground">{formatDuration(totalDurationSeconds)}</p>
            </div>
          </div>
        </div>
        <div className="bg-card rounded-lg shadow-md p-6">
          <div className="flex items-center">
            <Clock className="w-8 h-8 text-warning mr-3" />
            <div>
              <p className="text-sm text-muted-foreground">平均每生时长</p>
              <p className="text-2xl font-bold text-foreground">{formatDuration(averageDurationSeconds)}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-card rounded-lg shadow-md">
        <div className="px-6 py-4 border-b border-border">
          <h2 className="text-lg font-semibold text-foreground">学生实验日志</h2>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted">
              <TableRow>
                <TableHead className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">序号</TableHead>
                <TableHead className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">姓名</TableHead>
                <TableHead className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  <button
                    type="button"
                    onClick={() => handleSort('username')}
                    className="inline-flex items-center space-x-1 text-muted-foreground hover:text-primary focus:outline-none"
                  >
                    <span>学号</span>
                    {renderSortIcon('username')}
                  </button>
                </TableHead>
                <TableHead className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  <button
                    type="button"
                    onClick={() => handleSort('totalExperiments')}
                    className="inline-flex items-center space-x-1 text-muted-foreground hover:text-primary focus:outline-none"
                  >
                    <span>实验次数</span>
                    {renderSortIcon('totalExperiments')}
                  </button>
                </TableHead>
                <TableHead className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  <button
                    type="button"
                    onClick={() => handleSort('totalDurationSeconds')}
                    className="inline-flex items-center space-x-1 text-muted-foreground hover:text-primary focus:outline-none"
                  >
                    <span>总时长</span>
                    {renderSortIcon('totalDurationSeconds')}
                  </button>
                </TableHead>
                <TableHead className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  <button
                    type="button"
                    onClick={() => handleSort('averageDurationSeconds')}
                    className="inline-flex items-center space-x-1 text-muted-foreground hover:text-primary focus:outline-none"
                  >
                    <span>平均时长</span>
                    {renderSortIcon('averageDurationSeconds')}
                  </button>
                </TableHead>
                <TableHead className="px-6 py-3 text-center text-xs font-medium text-muted-foreground uppercase tracking-wider">详情</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="bg-card">
              {!selectedClassId && (
                <TableRow>
                  <TableCell colSpan={7} className="py-12 text-center text-muted-foreground">
                    请先选择一个班级查看实验日志。
                  </TableCell>
                </TableRow>
              )}

              {selectedClassId && isLoadingStatuses && (
                <TableRow>
                  <TableCell colSpan={7} className="py-12 text-center text-muted-foreground">
                    <div className="flex items-center justify-center space-x-2">
                      <Loader className="animate-spin" size={18} />
                      <span>正在加载实验日志...</span>
                    </div>
                  </TableCell>
                </TableRow>
              )}

              {selectedClassId && !isLoadingStatuses && sortedSummaries.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="py-12 text-center text-muted-foreground">
                    {debouncedSearchTerm ? '未找到符合搜索条件的学生。' : '该班级暂无实验日志记录。'}
                  </TableCell>
                </TableRow>
              )}

              {selectedClassId && !isLoadingStatuses && sortedSummaries.map((summary, index) => {
                const isExpanded = expandedRows.includes(summary.studentId);
                return (
                  <React.Fragment key={summary.studentId}>
                    <TableRow>
                      <TableCell className="px-6 py-4 text-sm text-muted-foreground">{index + 1}</TableCell>
                      <TableCell className="px-6 py-4 text-sm font-medium text-foreground">{summary.studentName}</TableCell>
                      <TableCell className="px-6 py-4 text-sm text-muted-foreground">{summary.studentUsername}</TableCell>
                      <TableCell className="px-6 py-4 text-sm text-foreground">{summary.totalExperiments}</TableCell>
                      <TableCell className="px-6 py-4 text-sm text-foreground font-semibold">
                        {formatDuration(summary.totalDurationSeconds)}
                      </TableCell>
                      <TableCell className="px-6 py-4 text-sm text-foreground">{formatDuration(summary.averageDurationSeconds)}</TableCell>
                      <TableCell className="px-6 py-4 text-center">
                        <button
                          onClick={() => toggleRowExpansion(summary.studentId)}
                          className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-primary bg-primary/10 rounded-lg hover:bg-primary/10 hover:text-primary transition-all duration-200"
                        >
                          {isExpanded ? (
                            <><ChevronDown size={14} className="mr-1" />收起</>
                          ) : (
                            <><ChevronRight size={14} className="mr-1" />展开</>
                          )}
                        </button>
                      </TableCell>
                    </TableRow>

                    {isExpanded && (
                      <TableRow className="bg-muted">
                        <TableCell colSpan={7} className="px-8 py-6">
                          <div className="space-y-4">
                            <h3 className="text-sm font-semibold text-foreground">实验记录</h3>
                            <div className="space-y-3">
                              {summary.experiments.length === 0 ? (
                                <div className="text-sm text-muted-foreground">该学生暂无实验记录。</div>
                              ) : (
                                summary.experiments.slice().reverse().map((experiment) => {
                                  const statusMeta = mapStatusToDisplay(experiment.status);
                                  return (
                                    <div key={`${summary.studentId}-${experiment.experimentId}`} className="bg-card rounded-xl border border-border p-5 shadow-sm">
                                      <div className="flex flex-col space-y-4">
                                        <div className="flex flex-wrap items-center gap-3">
                                          <div className={`px-3 py-1 rounded-full text-sm font-medium ${statusMeta.color}`}>
                                            {statusMeta.label}
                                          </div>
                                          <span className="text-sm text-muted-foreground">
                                            实验 ID：<span className="font-medium text-foreground">#{experiment.experimentId}</span>
                                          </span>
                                          {typeof experiment.currentStep === 'number' && (
                                            <span className="text-sm text-muted-foreground">
                                              当前步骤：<span className="font-medium text-foreground">{experiment.currentStep}</span>
                                            </span>
                                          )}
                                          {typeof experiment.highestCompletedStep === 'number' && (
                                            <span className="text-sm text-muted-foreground">
                                              已完成步骤：<span className="font-medium text-foreground">{experiment.highestCompletedStep}</span>
                                            </span>
                                          )}
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-foreground">
                                          <div>
                                            <span className="text-muted-foreground">开始时间：</span>
                                            <span className="font-medium text-foreground">{formatDateTime(experiment.startTime)}</span>
                                          </div>
                                          <div>
                                            <span className="text-muted-foreground">最近活跃：</span>
                                            <span className="font-medium text-foreground">{formatDateTime(experiment.lastActivityAt)}</span>
                                          </div>
                                          <div>
                                            <span className="text-muted-foreground">完成时间：</span>
                                            <span className="font-medium text-foreground">{formatDateTime(experiment.completionTime)}</span>
                                          </div>
                                          <div className={durationClass}>
                                            累计时长：{formatDuration(experiment.durationSeconds)}
                                          </div>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm text-foreground">
                                          <div>
                                            <span className="text-muted-foreground">行业：</span>
                                            <span className="font-medium text-foreground">{experiment.industry ?? '—'}</span>
                                          </div>
                                          <div>
                                            <span className="text-muted-foreground">企业：</span>
                                            <span className="font-medium text-foreground">{experiment.company ?? '—'}</span>
                                          </div>
                                          <div>
                                            <span className="text-muted-foreground">产品：</span>
                                            <span className="font-medium text-foreground">{experiment.product ?? '—'}</span>
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })
                              )}
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </React.Fragment>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
};

export default ExperimentLogs;
