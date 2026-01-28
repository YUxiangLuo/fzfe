import React, { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Clock,
  Loader,
  PlayCircle,
  Search,
  Users,
  Activity,
  ArrowUpDown,
} from "lucide-react";
import type { Class, StudentExperimentProgress, ExperimentStep, ExperimentTimelineEvent } from "@/views/teacher/types";
import { apiClient } from "@/utils/apiClient";
import { decodeToken } from "@/utils/auth";
import { UI_CONSTANTS } from "@/views/teacher/constants/ui";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
const STEP_DEFINITIONS: { id: string; label: string; order: number }[] = [
  { id: "industry_selection", label: "选择行业", order: 1 },
  { id: "company_selection", label: "选择企业", order: 2 },
  { id: "product_selection", label: "选择产品", order: 3 },
  { id: "data_analysis", label: "历史数据", order: 4 },
  { id: "model_building", label: "预测模型", order: 5 },
  { id: "result_evaluation", label: "结果评估", order: 6 },
  { id: "production_planning", label: "生产计划", order: 7 },
];

const STATUS_CONFIG: Record<
  string,
  { label: string; badge: string; dot: string }
> = {
  "Completed": {
    label: "已完成",
    badge: "bg-success/10 text-success border border-success/20",
    dot: "bg-success",
  },
  "In Progress": {
    label: "进行中",
    badge: "bg-primary/10 text-primary border border-primary/20",
    dot: "bg-primary",
  },
  "Not Started": {
    label: "实验已创建",
    badge: "bg-muted text-muted-foreground border border-border",
    dot: "bg-muted",
  },
};

const getStatusConfig = (status: string) =>
  STATUS_CONFIG[status] ?? {
    label: status || "还未进行任何实验",
    badge: "bg-muted text-muted-foreground border border-border",
    dot: "bg-muted",
  };

type SortKey = "username" | "status" | "completion" | "steps";

const ExperimentProgress: React.FC = () => {
  const [classes, setClasses] = useState<Class[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>("");
  const [studentProgress, setStudentProgress] = useState<StudentExperimentProgress[]>([]);

  const [expandedRows, setExpandedRows] = useState<number[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: "asc" | "desc" } | null>(null);

  const [teacherId, setTeacherId] = useState<number | null>(null);
  const [isLoadingClasses, setIsLoadingClasses] = useState(true);
  const [isLoadingProgress, setIsLoadingProgress] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("token");
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
        const response = await apiClient.get(`/teachers/${teacherId}/classes`);
        const classList = Array.isArray(response) ? (response as Class[]) : [];
        setClasses(classList);
        const firstClass = classList[0];
        setSelectedClassId(firstClass ? String(firstClass.class_id) : "");
      } catch (err: any) {
        setError(err.message || "获取班级列表失败");
      } finally {
        setIsLoadingClasses(false);
      }
    };
    fetchClasses();
  }, [teacherId]);

  // P2-1: Use constant for debounce delay
  useEffect(() => {
    const handler = window.setTimeout(() => {
      setDebouncedSearchTerm(searchTerm.trim());
    }, UI_CONSTANTS.SEARCH_DEBOUNCE_DELAY);

    return () => {
      window.clearTimeout(handler);
    };
  }, [searchTerm]);

  useEffect(() => {
    setExpandedRows([]);
    setStudentProgress([]);

    if (!selectedClassId) {
      return;
    }

    const fetchData = async () => {
      setIsLoadingProgress(true);
      setError(null);

      try {
        const progressData = await apiClient.get<StudentExperimentProgress[]>(
          `/classes/${selectedClassId}/experiment-events`,
        );

        if (Array.isArray(progressData)) {
          const normalized = progressData.map((student) => ({
            ...student,
            steps: Array.isArray(student.steps) ? student.steps : [],
            timeline: Array.isArray(student.timeline) ? student.timeline : [],
          }));
          setStudentProgress(normalized);
        } else {
          setStudentProgress([]);
        }
      } catch (err: any) {
        setError(err.message || "获取班级进度数据失败");
        setStudentProgress([]);
      } finally {
        setIsLoadingProgress(false);
      }
    };

    fetchData();
  }, [selectedClassId]);

  const filteredStudents = useMemo(() => {
    if (!debouncedSearchTerm) return studentProgress;
    const query = debouncedSearchTerm.toLowerCase();
    return studentProgress.filter(
      (student) =>
        student.username.toLowerCase().includes(query) ||
        student.full_name.toLowerCase().includes(query),
    );
  }, [studentProgress, debouncedSearchTerm]);

  const currentClass = useMemo(
    () => classes.find((cls) => String(cls.class_id) === selectedClassId) ?? null,
    [classes, selectedClassId],
  );

  const summaryStats = useMemo(() => {
    if (studentProgress.length === 0) {
      return {
        total: 0,
        completed: 0,
        inProgress: 0,
        notStarted: 0,
        averageCompletion: 0,
      };
    }

    const total = studentProgress.length;
    const completed = studentProgress.filter((s) => s.status === "Completed").length;
    const inProgress = studentProgress.filter((s) => s.status === "In Progress").length;
    const notStarted = studentProgress.filter((s) => s.status === "Not Started").length;

    const completionPercents = studentProgress.map((student) => {
      const steps = student.steps ?? [];
      const completedSteps = steps.filter((step) => step?.completed_at).length;
      return Math.round((completedSteps / STEP_DEFINITIONS.length) * 100);
    });

    const averageCompletion = Math.round(
      completionPercents.reduce((acc, val) => acc + val, 0) / completionPercents.length,
    );

    return { total, completed, inProgress, notStarted, averageCompletion };
  }, [studentProgress]);

  const toggleRow = (studentId: number) => {
    setExpandedRows((prev) =>
      prev.includes(studentId)
        ? prev.filter((id) => id !== studentId)
        : [...prev, studentId],
    );
  };

  // P2-2: Optimize array operations - avoid multiple filter/sort operations
  const getCompletionMeta = useMemo(() => {
    return (student: StudentExperimentProgress) => {
      const steps = student.steps ?? [];
      const completedSteps = steps.filter((step) => step?.completed_at).length;
      const totalSteps = STEP_DEFINITIONS.length;
      const completionPercent = Math.round((completedSteps / totalSteps) * 100);

      // P2-2: Find latest completed step with single pass (O(n) instead of O(n log n))
      let latestCompletedStep: ExperimentStep | null = null;
      let highestStartedStep: ExperimentStep | null = null;

      for (const step of steps) {
        if (step?.completed_at) {
          if (!latestCompletedStep || (step.step_order ?? 0) > (latestCompletedStep.step_order ?? 0)) {
            latestCompletedStep = step;
          }
        } else if (step?.started_at) {
          if (!highestStartedStep || (step.step_order ?? 0) > (highestStartedStep.step_order ?? 0)) {
            highestStartedStep = step;
          }
        }
      }

      const latestCompleted = latestCompletedStep
        ? STEP_DEFINITIONS.find((def) => def.order === latestCompletedStep.step_order) ?? null
        : null;

      let currentStep = student.current_step
        ? STEP_DEFINITIONS.find((def) => def.order === student.current_step) ?? null
        : null;

      if (!currentStep && student.status !== "Completed" && highestStartedStep) {
        currentStep = STEP_DEFINITIONS.find((def) => def.order === highestStartedStep.step_order) ?? null;
      }

      return {
        completedSteps,
        totalSteps,
        completionPercent: Math.min(100, Math.max(0, completionPercent)),
        latestCompleted,
        currentStep,
      };
    };
  }, []); // Empty deps - pure function based on input

  const sortedStudents = useMemo(() => {
    if (!sortConfig) return filteredStudents;
    const { key, direction } = sortConfig;
    const factor = direction === "asc" ? 1 : -1;

    return [...filteredStudents].sort((a, b) => {
      switch (key) {
        case "username":
          return a.username.localeCompare(b.username, "zh-CN") * factor;
        case "status": {
          const order: Record<string, number> = { "Not Started": 0, "In Progress": 1, "Completed": 2 };
          const aOrder = order[a.status] ?? 99;
          const bOrder = order[b.status] ?? 99;
          if (aOrder === bOrder) return 0;
          return (aOrder - bOrder) * factor;
        }
        case "completion": {
          const metaA = getCompletionMeta(a);
          const metaB = getCompletionMeta(b);
          return (metaA.completionPercent - metaB.completionPercent) * factor;
        }
        case "steps": {
          const metaA = getCompletionMeta(a);
          const metaB = getCompletionMeta(b);
          return (metaA.completedSteps - metaB.completedSteps) * factor;
        }
        default:
          return 0;
      }
    });
  }, [filteredStudents, sortConfig, getCompletionMeta]);

  const handleSort = (key: SortKey) => {
    setSortConfig((prev) => {
      if (!prev || prev.key !== key) {
        return { key, direction: "desc" };
      }
      return {
        key,
        direction: prev.direction === "desc" ? "asc" : "desc",
      };
    });
  };

  const renderSortIcon = (key: SortKey) => {
    if (!sortConfig || sortConfig.key !== key) {
      return <ArrowUpDown className="w-3.5 h-3.5 text-muted-foreground" />;
    }
    return sortConfig.direction === "desc" ? (
      <ChevronDown className="w-3.5 h-3.5 text-primary" />
    ) : (
      <ChevronUp className="w-3.5 h-3.5 text-primary" />
    );
  };

  const renderProgressRows = () => {
    if (!selectedClassId) {
      return (
        <TableRow>
          <TableCell colSpan={8} className="py-12 text-center text-muted-foreground">
            请先选择一个班级查看学生的实验进度。
          </TableCell>
        </TableRow>
      );
    }

    if (isLoadingProgress) {
      return (
        <TableRow>
          <TableCell colSpan={8} className="py-12 text-center text-muted-foreground">
            <div className="flex items-center justify-center space-x-2">
              <Loader className="animate-spin" size={18} />
              <span>正在加载实验进度...</span>
            </div>
          </TableCell>
        </TableRow>
      );
    }

    if (filteredStudents.length === 0) {
      return (
        <TableRow>
          <TableCell colSpan={8} className="py-12 text-center text-muted-foreground">
            {studentProgress.length === 0 ? "该班级暂无学生或实验数据。" : "未找到符合条件的学生。"}
          </TableCell>
        </TableRow>
      );
    }

    return sortedStudents.map((student, index) => {
      const { completionPercent, completedSteps, totalSteps } = getCompletionMeta(student);
      const isExpanded = expandedRows.includes(student.student_id);
      const statusConfig = getStatusConfig(student.status);

      return (
        <React.Fragment key={student.student_id}>
          <TableRow>
            <TableCell className="w-12 text-center text-sm text-muted-foreground">{index + 1}</TableCell>
            <TableCell className="px-4 py-4 text-sm font-semibold text-foreground">{student.full_name}</TableCell>
            <TableCell className="px-4 py-4 text-sm text-muted-foreground">{student.username}</TableCell>
            <TableCell className="px-4 py-4 text-sm text-foreground">
              <span className={`inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-medium ${statusConfig.badge}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${statusConfig.dot}`} />
                <span>{statusConfig.label}</span>
              </span>
            </TableCell>
            <TableCell className="px-4 py-4">
              <div className="flex items-center space-x-2">
                <div className="flex-1 h-2 rounded-full bg-muted">
                  <div
                    className={`h-2 rounded-full ${
                      completionPercent === 100 ? "bg-success" : "bg-primary"
                    }`}
                    style={{ width: `${completionPercent}%` }}
                  />
                </div>
                <span className="text-sm text-muted-foreground w-12 text-right">{completionPercent}%</span>
              </div>
            </TableCell>
            <TableCell className="px-4 py-4 text-sm text-muted-foreground text-right">
              {completedSteps}/{totalSteps} 步
            </TableCell>
            <TableCell className="px-4 py-4 text-sm text-muted-foreground text-right">
              {formatTime(student.last_activity_at)}
            </TableCell>
            <TableCell className="px-4 py-4 text-center">
              <button
                onClick={() => toggleRow(student.student_id)}
                className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-primary bg-primary/10 rounded-lg hover:bg-primary/10 hover:text-primary transition-all duration-200"
              >
                {isExpanded ? (
                  <>
                    <ChevronDown size={14} className="mr-1" />
                    收起
                  </>
                ) : (
                  <>
                    <ChevronRight size={14} className="mr-1" />
                    详情
                  </>
                )}
              </button>
            </TableCell>
          </TableRow>
          {isExpanded && (
            <TableRow className="bg-muted">
              <TableCell colSpan={8} className="px-8 py-6 space-y-6">
                <StudentSummary student={student} />
                <StepOverview steps={student.steps ?? []} />
                <Timeline timeline={student.timeline ?? []} />
              </TableCell>
            </TableRow>
          )}
        </React.Fragment>
      );
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">实验进度</h1>
          <p className="text-sm text-muted-foreground mt-1">查看每位学生最近一次实验的完成情况与操作时间线。</p>
          {currentClass && (
            <p className="text-sm text-muted-foreground mt-1">
              当前班级：<span className="font-medium text-foreground">{currentClass.class_name}</span>
            </p>
          )}
        </div>
      </div>

      <div className="bg-card rounded-lg shadow-md p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label className="text-foreground mb-2">选择班级</Label>
            <Select
              value={selectedClassId}
              onValueChange={setSelectedClassId}
              disabled={isLoadingClasses}
            >
              <SelectTrigger className="w-full" aria-label="选择班级">
                <SelectValue
                  placeholder={isLoadingClasses ? "加载中..." : classes.length === 0 ? "暂无班级" : "请选择班级"}
                />
              </SelectTrigger>
              <SelectContent>
                {classes.length === 0 ? (
                  <SelectItem value="__empty__" disabled>
                    {isLoadingClasses ? "加载中..." : "暂无班级"}
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
          <div className="md:col-span-2">
            <Label className="text-foreground mb-2">按学号/姓名搜索</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
              <Input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="输入学号或姓名"
                className="pl-10 pr-4 rounded-lg"
              />
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-lg flex items-center space-x-2">
          <AlertTriangle size={16} />
          <span>{error}</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard
          icon={Users}
          title="学生总数"
          value={summaryStats.total}
          description="当前班级的总学生数"
          accent="bg-primary/10 text-primary"
        />
        <SummaryCard
          icon={CheckCircle2}
          title="已完成"
          value={summaryStats.completed}
          description="已完成全部步骤"
          accent="bg-success/10 text-success"
        />
        <SummaryCard
          icon={PlayCircle}
          title="进行中"
          value={summaryStats.inProgress}
          description="正在执行实验流程"
          accent="bg-primary/10 text-primary"
        />
        <SummaryCard
          icon={Activity}
          title="平均完成度"
          value={`${summaryStats.averageCompletion}%`}
          description="所有学生的平均完成比例"
          accent="bg-accent/10 text-accent-foreground"
        />
      </div>

      <div className="bg-card rounded-lg shadow-md">
        <div className="px-6 py-4 border-b border-border">
          <h2 className="text-lg font-semibold text-foreground">学生实验进度</h2>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted">
              <TableRow>
                <TableHead className="w-12 text-xs font-medium text-muted-foreground uppercase tracking-wider">序号</TableHead>
                <TableHead className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">姓名</TableHead>
                <TableHead className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  <button
                    type="button"
                    onClick={() => handleSort("username")}
                    className="inline-flex items-center space-x-1 text-muted-foreground hover:text-primary focus:outline-none"
                  >
                    <span>学号</span>
                    {renderSortIcon("username")}
                  </button>
                </TableHead>
                <TableHead className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  <button
                    type="button"
                    onClick={() => handleSort("status")}
                    className="inline-flex items-center space-x-1 text-muted-foreground hover:text-primary focus:outline-none"
                  >
                    <span>实验状态</span>
                    {renderSortIcon("status")}
                  </button>
                </TableHead>
                <TableHead className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  <button
                    type="button"
                    onClick={() => handleSort("completion")}
                    className="inline-flex items-center space-x-1 text-muted-foreground hover:text-primary focus:outline-none"
                  >
                    <span>完成进度</span>
                    {renderSortIcon("completion")}
                  </button>
                </TableHead>
                <TableHead className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  <button
                    type="button"
                    onClick={() => handleSort("steps")}
                    className="inline-flex items-center space-x-1 text-muted-foreground hover:text-primary focus:outline-none"
                  >
                    <span>完成步数</span>
                    {renderSortIcon("steps")}
                  </button>
                </TableHead>
                <TableHead className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">最近操作时间</TableHead>
                <TableHead className="px-4 py-3 text-center text-xs font-medium text-muted-foreground uppercase tracking-wider">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="bg-card">{renderProgressRows()}</TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
};

const SummaryCard: React.FC<{
  icon: React.ElementType;
  title: string;
  value: number | string;
  description: string;
  accent: string;
}> = ({ icon: Icon, title, value, description, accent }) => (
  <div className="bg-card border border-border rounded-xl p-4 flex items-center space-x-4">
    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${accent}`}>
      <Icon size={18} />
    </div>
    <div>
      <p className="text-sm text-muted-foreground">{title}</p>
      <p className="text-2xl font-semibold text-foreground">{value}</p>
      <p className="text-xs text-muted-foreground mt-1">{description}</p>
    </div>
  </div>
);

const StudentSummary: React.FC<{ student: StudentExperimentProgress }> = ({ student }) => {
  const statusConfig = {
    label: getStatusConfig(student.status).label,
    className: getStatusConfig(student.status).badge,
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <SummaryItem label="实验状态" value={statusConfig.label} badgeClass={statusConfig.className} />
      <SummaryItem label="开始时间" value={formatTime(student.start_time)} />
      <SummaryItem label="最近操作" value={formatTime(student.last_activity_at)} />
      <SummaryItem label="完成时间" value={formatTime(student.completion_time)} />
    </div>
  );
};

const SummaryItem: React.FC<{ label: string; value: string; badgeClass?: string }> = ({
  label,
  value,
  badgeClass,
}) => (
  <div className="bg-card border border-border rounded-xl p-4">
    <p className="text-xs text-muted-foreground">{label}</p>
    {badgeClass ? (
      <span className={`inline-flex items-center px-2.5 py-1 mt-2 rounded-full text-xs font-medium ${badgeClass}`}>
        {value}
      </span>
    ) : (
      <p className="text-sm font-medium text-foreground mt-1">{value}</p>
    )}
  </div>
);

const StepOverview: React.FC<{ steps: ExperimentStep[] }> = ({ steps }) => (
  <div>
    <h4 className="text-sm font-semibold text-foreground mb-3">步骤完成情况</h4>
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {STEP_DEFINITIONS.map((stepDef) => {
        const stepData = steps.find((step) => step.step_order === stepDef.order);
        const status = stepData?.completed_at
          ? "completed"
          : stepData?.started_at
          ? "started"
          : "pending";

        const icon =
          status === "completed" ? (
            <CheckCircle2 size={18} />
          ) : status === "started" ? (
            <PlayCircle size={18} />
          ) : (
            <Clock size={18} />
          );

        const iconClass =
          status === "completed"
            ? "bg-success text-primary-foreground"
            : status === "started"
            ? "bg-primary text-primary-foreground"
            : "bg-muted text-muted-foreground";

        return (
          <div
            key={stepDef.id}
            className={`rounded-xl border p-4 flex items-start space-x-3 bg-card ${
              status === "completed" ? "border-success/20" : "border-border"
            }`}
          >
            <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${iconClass}`}>
              {icon}
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">{stepDef.label}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {status === "completed"
                  ? `完成：${formatTime(stepData?.completed_at)}`
                  : status === "started"
                  ? `开始：${formatTime(stepData?.started_at)}`
                  : "尚未开始"}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  </div>
);

const Timeline: React.FC<{ timeline: ExperimentTimelineEvent[] }> = ({ timeline }) => {
  const sorted = [...timeline].sort(
    (a, b) =>
      new Date(a.event_timestamp).getTime() - new Date(b.event_timestamp).getTime(),
  );

  return (
    <div>
      <h4 className="text-sm font-semibold text-foreground mb-3">操作时间线</h4>
      {sorted.length === 0 ? (
        <p className="text-sm text-muted-foreground">暂无操作记录。</p>
      ) : (
        <div className="space-y-3 max-h-64 overflow-y-auto pr-2">
          {sorted.map((event) => {
            const stepLabel =
              STEP_DEFINITIONS.find((step) => step.order === event.step_order)?.label ??
              `步骤 ${event.step_order}`;
            const isCompleted = event.event_type === "COMPLETED";
            return (
              <div
                key={event.event_id}
                className="flex items-start space-x-3 border border-border bg-card rounded-lg p-3"
              >
                <div
                  className={`mt-1 w-2 h-2 rounded-full ${
                    isCompleted ? "bg-success" : "bg-primary"
                  }`}
                />
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {isCompleted ? "完成" : "开始"} · {stepLabel}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {formatTime(event.event_timestamp)}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

function formatTime(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day} ${hours}:${minutes}`;
}

export default ExperimentProgress;
