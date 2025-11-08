import React, { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock,
  Loader,
  PlayCircle,
  Search,
  Users,
  Activity,
} from "lucide-react";
import type { Class, StudentExperimentProgress, ExperimentStep, ExperimentTimelineEvent } from "../../types";
import { apiClient } from "../../../../utils/apiClient";
import { decodeToken } from "../../../../utils/auth";
import { UI_CONSTANTS } from "../../../../shared/constants/ui";

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
    badge: "bg-emerald-50 text-emerald-700 border border-emerald-200",
    dot: "bg-emerald-500",
  },
  "In Progress": {
    label: "进行中",
    badge: "bg-blue-50 text-blue-700 border border-blue-200",
    dot: "bg-blue-500",
  },
  "Not Started": {
    label: "实验已创建",
    badge: "bg-slate-50 text-slate-600 border border-slate-200",
    dot: "bg-slate-400",
  },
};

const getStatusConfig = (status: string) =>
  STATUS_CONFIG[status] ?? {
    label: status || "还未进行任何实验",
    badge: "bg-slate-50 text-slate-600 border border-slate-200",
    dot: "bg-slate-400",
  };

const ExperimentProgress: React.FC = () => {
  const [classes, setClasses] = useState<Class[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>("");
  const [studentProgress, setStudentProgress] = useState<StudentExperimentProgress[]>([]);

  const [expandedRows, setExpandedRows] = useState<number[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");

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

  const renderProgressRows = () => {
    if (!selectedClassId) {
      return (
        <tr>
          <td colSpan={8} className="py-12 text-center text-gray-500">
            请先选择一个班级查看学生的实验进度。
          </td>
        </tr>
      );
    }

    if (isLoadingProgress) {
      return (
        <tr>
          <td colSpan={8} className="py-12 text-center text-gray-500">
            <div className="flex items-center justify-center space-x-2">
              <Loader className="animate-spin" size={18} />
              <span>正在加载实验进度...</span>
            </div>
          </td>
        </tr>
      );
    }

    if (filteredStudents.length === 0) {
      return (
        <tr>
          <td colSpan={8} className="py-12 text-center text-gray-500">
            {studentProgress.length === 0 ? "该班级暂无学生或实验数据。" : "未找到符合条件的学生。"}
          </td>
        </tr>
      );
    }

    return filteredStudents.map((student, index) => {
      const { completionPercent, completedSteps, totalSteps, latestCompleted, currentStep } =
        getCompletionMeta(student);
      const isExpanded = expandedRows.includes(student.student_id);
      const statusConfig = getStatusConfig(student.status);

      return (
        <React.Fragment key={student.student_id}>
          <tr className="hover:bg-slate-50">
            <td className="w-12 text-center text-sm text-gray-500">{index + 1}</td>
            <td className="px-4 py-4 text-sm text-gray-900">
              <div className="flex items-center justify-between space-x-3">
                <div>
                  <div className="font-semibold">{student.full_name}</div>
                  <div className="text-xs text-gray-500">{student.username}</div>
                </div>
                <span className={`inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-medium ${statusConfig.badge}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${statusConfig.dot}`} />
                  <span>{statusConfig.label}</span>
                </span>
              </div>
            </td>
            <td className="px-4 py-4">
              <div className="flex items-center space-x-2">
                <div className="flex-1 h-2 rounded-full bg-slate-200">
                  <div
                    className={`h-2 rounded-full ${
                      completionPercent === 100 ? "bg-emerald-500" : "bg-blue-500"
                    }`}
                    style={{ width: `${completionPercent}%` }}
                  />
                </div>
                <span className="text-sm text-gray-600 w-12 text-right">{completionPercent}%</span>
              </div>
            </td>
            <td className="px-4 py-4 text-sm text-gray-700">
              {latestCompleted ? latestCompleted.label : "—"}
            </td>
            <td className="px-4 py-4 text-sm text-gray-700">
              {student.status === "Completed"
                ? "已完成全部节点"
                : currentStep
                ? currentStep.label
                : "—"}
            </td>
            <td className="px-4 py-4 text-sm text-gray-500 text-right">
              {completedSteps}/{totalSteps} 步
            </td>
            <td className="px-4 py-4 text-sm text-gray-500 text-right">
              {formatTime(student.last_activity_at)}
            </td>
            <td className="px-4 py-4 text-center">
              <button
                onClick={() => toggleRow(student.student_id)}
                className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 hover:text-blue-700 transition-all duration-200"
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
            </td>
          </tr>
          {isExpanded && (
            <tr className="bg-slate-50">
              <td colSpan={8} className="px-8 py-6 space-y-6">
                <StudentSummary student={student} />
                <StepOverview steps={student.steps ?? []} />
                <Timeline timeline={student.timeline ?? []} />
              </td>
            </tr>
          )}
        </React.Fragment>
      );
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">实验进度</h1>
          <p className="text-sm text-gray-500 mt-1">查看每位学生最近一次实验的完成情况与操作时间线。</p>
          {currentClass && (
            <p className="text-sm text-gray-500 mt-1">
              当前班级：<span className="font-medium text-gray-900">{currentClass.class_name}</span>
            </p>
          )}
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">选择班级</label>
            <select
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
              disabled={isLoadingClasses}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
            >
              {classes.length === 0 ? (
                <option value="" disabled>
                  {isLoadingClasses ? "加载中..." : "暂无班级"}
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
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">按学号/姓名搜索</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="输入学号或姓名"
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center space-x-2">
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
          accent="bg-blue-100 text-blue-600"
        />
        <SummaryCard
          icon={CheckCircle2}
          title="已完成"
          value={summaryStats.completed}
          description="已完成全部步骤"
          accent="bg-emerald-100 text-emerald-600"
        />
        <SummaryCard
          icon={PlayCircle}
          title="进行中"
          value={summaryStats.inProgress}
          description="正在执行实验流程"
          accent="bg-blue-100 text-blue-600"
        />
        <SummaryCard
          icon={Activity}
          title="平均完成度"
          value={`${summaryStats.averageCompletion}%`}
          description="所有学生的平均完成比例"
          accent="bg-purple-100 text-purple-600"
        />
      </div>

      <div className="bg-white rounded-lg shadow-md">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">学生实验进度</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="w-12 text-xs font-medium text-gray-500 uppercase tracking-wider">序号</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">学生</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">完成进度</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">最新完成</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">当前节点</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">完成步数</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">最近操作时间</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">操作</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">{renderProgressRows()}</tbody>
          </table>
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
  <div className="bg-white border border-gray-200 rounded-xl p-4 flex items-center space-x-4">
    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${accent}`}>
      <Icon size={18} />
    </div>
    <div>
      <p className="text-sm text-gray-500">{title}</p>
      <p className="text-2xl font-semibold text-gray-900">{value}</p>
      <p className="text-xs text-gray-400 mt-1">{description}</p>
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
  <div className="bg-white border border-gray-200 rounded-xl p-4">
    <p className="text-xs text-gray-500">{label}</p>
    {badgeClass ? (
      <span className={`inline-flex items-center px-2.5 py-1 mt-2 rounded-full text-xs font-medium ${badgeClass}`}>
        {value}
      </span>
    ) : (
      <p className="text-sm font-medium text-gray-900 mt-1">{value}</p>
    )}
  </div>
);

const StepOverview: React.FC<{ steps: ExperimentStep[] }> = ({ steps }) => (
  <div>
    <h4 className="text-sm font-semibold text-gray-900 mb-3">步骤完成情况</h4>
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
            ? "bg-emerald-500 text-white"
            : status === "started"
            ? "bg-blue-500 text-white"
            : "bg-slate-200 text-slate-500";

        return (
          <div
            key={stepDef.id}
            className={`rounded-xl border p-4 flex items-start space-x-3 bg-white ${
              status === "completed" ? "border-emerald-200" : "border-slate-200"
            }`}
          >
            <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${iconClass}`}>
              {icon}
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">{stepDef.label}</p>
              <p className="text-xs text-gray-500 mt-1">
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
      <h4 className="text-sm font-semibold text-gray-900 mb-3">操作时间线</h4>
      {sorted.length === 0 ? (
        <p className="text-sm text-gray-500">暂无操作记录。</p>
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
                className="flex items-start space-x-3 border border-gray-200 bg-white rounded-lg p-3"
              >
                <div
                  className={`mt-1 w-2 h-2 rounded-full ${
                    isCompleted ? "bg-emerald-500" : "bg-blue-500"
                  }`}
                />
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {isCompleted ? "完成" : "开始"} · {stepLabel}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
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
