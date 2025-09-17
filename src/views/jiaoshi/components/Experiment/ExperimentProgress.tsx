import React, { useEffect, useMemo, useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  Loader,
  Search,
  AlertTriangle,
  Clock,
  Flag,
} from "lucide-react";
import type { Class, Student, StepEvent, ClassStepEvent } from "../../types";
import { apiClient } from "../../../../utils/apiClient";
import { decodeToken } from "../../../../utils/auth";

interface StepProgress {
  id: string;
  label: string;
  order: number;
  completed: boolean;
  completedAt?: string;
}

// This serves as the base structure and ordering for the experiment steps.
const STEP_DEFINITIONS: Omit<StepProgress, "completed" | "completedAt">[] = [
  { id: "industry_selection", label: "选择行业", order: 1 },
  { id: "company_selection", label: "选择企业", order: 2 },
  { id: "product_selection", label: "选择产品", order: 3 },
  { id: "data_analysis", label: "历史数据", order: 4 },
  { id: "model_building", label: "预测模型", order: 5 },
  { id: "result_evaluation", label: "结果评估", order: 6 },
  { id: "production_planning", label: "生产计划", order: 7 },
];

const ExperimentProgress: React.FC = () => {
  const [classes, setClasses] = useState<Class[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>("");
  const [students, setStudents] = useState<Student[]>([]);
  const [progressByStudent, setProgressByStudent] = useState<
    Record<number, StepProgress[]>
  >({});
  const [expandedRows, setExpandedRows] = useState<number[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");

  const [teacherId, setTeacherId] = useState<number | null>(null);
  const [isLoadingClasses, setIsLoadingClasses] = useState(true);
  const [isLoadingStudents, setIsLoadingStudents] = useState(false);
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
        if (firstClass) {
          setSelectedClassId(String(firstClass.class_id));
        } else {
          setSelectedClassId("");
        }
      } catch (err: any) {
        setError(err.message || "获取班级列表失败");
      } finally {
        setIsLoadingClasses(false);
      }
    };
    fetchClasses();
  }, [teacherId]);

  useEffect(() => {
    const handler = window.setTimeout(() => {
      setDebouncedSearchTerm(searchTerm.trim());
    }, 300);

    return () => {
      window.clearTimeout(handler);
    };
  }, [searchTerm]);

  useEffect(() => {
    setExpandedRows([]);
    setProgressByStudent({});
    setStudents([]);

    if (!selectedClassId) {
      return;
    }

    const fetchData = async () => {
      setIsLoadingStudents(true);
      setIsLoadingProgress(true);
      setError(null);

      try {
        const [studentsResponse, progressResponse] = await Promise.all([
          apiClient.get(`/classes/${selectedClassId}/students`),
          apiClient.get(`/classes/${selectedClassId}/step-events`)
        ]);

        const studentList = Array.isArray(studentsResponse) ? (studentsResponse as Student[]) : [];
        setStudents(studentList);

        const allEvents = Array.isArray(progressResponse) ? (progressResponse as ClassStepEvent[]) : [];

        const eventsByStudent = allEvents.reduce((acc, event) => {
          const bucket = acc[event.student_id] ?? (acc[event.student_id] = []);
          bucket.push(event);
          return acc;
        }, {} as Record<number, StepEvent[]>);

        const newProgressMap: Record<number, StepProgress[]> = {};
        for (const student of studentList) {
          const studentEvents = eventsByStudent[student.user_id] || [];
          newProgressMap[student.user_id] = processStudentEvents(studentEvents);
        }
        setProgressByStudent(newProgressMap);

      } catch (err: any) {
        setError(err.message || "获取班级数据失败");
        setStudents([]);
        setProgressByStudent({});
      } finally {
        setIsLoadingStudents(false);
        setIsLoadingProgress(false);
      }
    };

    fetchData();
  }, [selectedClassId]);

  const filteredStudents = useMemo(() => {
    if (!debouncedSearchTerm) return students;
    const query = debouncedSearchTerm.toLowerCase();
    return students.filter(
      (student) =>
        student.username.toLowerCase().includes(query) || student.full_name.toLowerCase().includes(query),
    );
  }, [students, debouncedSearchTerm]);

  const currentClassName = useMemo(() => {
    return classes.find((cls) => String(cls.class_id) === selectedClassId)?.class_name ?? "—";
  }, [classes, selectedClassId]);

  const toggleRow = (studentId: number) => {
    setExpandedRows((prev) =>
      prev.includes(studentId)
        ? prev.filter((id) => id !== studentId)
        : [...prev, studentId],
    );
  };

  const renderProgressRows = () => {
    if (!selectedClassId) {
      return (
        <tr>
          <td colSpan={7} className="py-12 text-center text-gray-500">
            请先选择一个班级查看学生的实验进度。
          </td>
        </tr>
      );
    }

    if (isLoadingStudents || isLoadingProgress) {
      return (
        <tr>
          <td colSpan={7} className="py-12 text-center text-gray-500">
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
          <td colSpan={7} className="py-12 text-center text-gray-500">
            {students.length === 0 ? "该班级暂无学生。" : "未找到符合条件的学生。"}
          </td>
        </tr>
      );
    }

    return filteredStudents.map((student, index) => {
      const steps = progressByStudent[student.user_id] || STEP_DEFINITIONS.map(step => ({ ...step, completed: false }));
      const completedSteps = steps.filter((step) => step.completed).length;
      const completionPercent = Math.round((completedSteps / steps.length) * 100);
      const latestCompleted = [...steps].reverse().find((step) => step.completed);
      const inProgressStep = steps.find((step) => !step.completed);
      const isExpanded = expandedRows.includes(student.user_id);

      return (
        <React.Fragment key={student.user_id}>
          <tr className="hover:bg-slate-50">
            <td className="w-12 text-center text-sm text-gray-500">{index + 1}</td>
            <td className="px-4 py-4 text-sm text-gray-900 font-medium">
              <div className="flex items-center space-x-2">
                <span>{student.full_name}</span>
                <span className="text-xs text-gray-500">({student.username})</span>
              </div>
            </td>
            <td className="px-4 py-4">
              <div className="flex items-center space-x-2">
                <div className="flex-1 h-2 rounded-full bg-slate-200">
                  <div
                    className="h-2 rounded-full bg-blue-500"
                    style={{ width: `${completionPercent}%` }}
                  />
                </div>
                <span className="text-sm text-gray-600 w-12 text-right">{completionPercent}%</span>
              </div>
            </td>
            <td className="px-4 py-4 text-sm text-gray-700">{latestCompleted ? latestCompleted.label : "未开始"}</td>
            <td className="px-4 py-4 text-sm text-gray-700">{inProgressStep ? inProgressStep.label : "已完成"}</td>
            <td className="px-4 py-4 text-sm text-gray-500 text-right">{completedSteps}/{steps.length} 步</td>
            <td className="px-4 py-4 text-center">
              <button
                onClick={() => toggleRow(student.user_id)}
                className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 hover:text-blue-700 transition-all duration-200"
              >
                {isExpanded ? (
                  <><ChevronDown size={14} className="mr-1" />收起详情</>
                ) : (
                  <><ChevronRight size={14} className="mr-1" />展开详情</>
                )}
              </button>
            </td>
          </tr>
          {isExpanded && (
            <tr className="bg-slate-50">
              <td colSpan={7} className="px-8 py-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-2">
                  {steps.map((step) => (
                    <div
                      key={step.id}
                      className={`rounded-xl border p-4 flex items-start space-x-3 bg-white ${
                        step.completed ? "border-green-200" : "border-slate-200"
                      }`}
                    >
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          step.completed ? "bg-green-500 text-white" : "bg-slate-200 text-slate-500"
                        }`}
                      >
                        {step.completed ? <Flag size={18} /> : <Clock size={18} />}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{step.label}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          {step.completed ? `完成时间：${formatTime(step.completedAt)}` : "尚未完成"}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </td>
            </tr>
          )}
        </React.Fragment>
      );
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">实验进度</h1>
          {selectedClassId && <p className="text-sm text-gray-500 mt-1">当前班级：{currentClassName}</p>}
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
                <option value="" disabled>{isLoadingClasses ? "加载中..." : "暂无班级"}</option>
              ) : (
                classes.map((cls) => (
                  <option key={cls.class_id} value={cls.class_id}>{cls.class_name}</option>
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
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">最新节点</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">当前节点</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">完成步数</th>
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

function processStudentEvents(events: StepEvent[]): StepProgress[] {
  const completedEvents = new Map<number, StepEvent>();
  for (const event of events) {
    if (event.event_type === "COMPLETED") {
      completedEvents.set(event.step_order, event);
    }
  }

  return STEP_DEFINITIONS.map((baseStep) => {
    const completedEvent = completedEvents.get(baseStep.order);
    return {
      ...baseStep,
      label: baseStep.label,
      completed: !!completedEvent,
      completedAt: completedEvent?.event_timestamp,
    };
  }).sort((a, b) => a.order - b.order);
}

function formatTime(value?: string) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return `${date.toLocaleDateString()} ${date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
}

export default ExperimentProgress;
