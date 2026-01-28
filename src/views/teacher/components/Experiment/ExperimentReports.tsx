import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  FileText,
  Download,
  Star,
  MessageCircle,
  Loader,
  AlertTriangle,
  Users,
  CheckCircle2,
  Activity,
  Clock,
  Search,
  ChevronDown,
  ChevronUp,
  ArrowUpDown,
  XCircle,
} from "lucide-react";
import type { Class, ExperimentReport } from "@/views/teacher/types";
import Modal from "@/views/teacher/components/shadcn/TeacherModal";
import Button from "@/views/teacher/components/shadcn/TeacherButton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { API_BASE_URL, apiClient } from "@/utils/apiClient";
import { decodeToken } from "@/utils/auth";
import { DOWNLOAD_SERVER_BASE_URL } from "@/config/appConfig";
import { useToast } from "@/views/teacher/hooks/useToast";
import { ConfirmDialog } from "@/views/teacher/components/shadcn/TeacherConfirmDialog";
import { useConfirm } from "@/views/teacher/hooks/useConfirm";

const buildDownloadUrl = (filePath: string) => {
  const filename = filePath.split("/").pop();
  return `${DOWNLOAD_SERVER_BASE_URL}/reports/${filename}`;
};

const STATUS_META = {
  submitted: {
    label: "已评阅",
    badge: "bg-success/10 text-success border border-success/20",
    dot: "bg-success",
  },
  pending: {
    label: "待评阅",
    badge: "bg-warning/10 text-warning border border-warning/20",
    dot: "bg-warning",
  },
  rejected: {
    label: "已驳回",
    badge: "bg-destructive/10 text-destructive border border-destructive/20",
    dot: "bg-destructive",
  },
  draft: {
    label: "未提交",
    badge: "bg-muted text-muted-foreground border border-border",
    dot: "bg-muted",
  },
} as const;

type StatusKey = keyof typeof STATUS_META;
type StatusMeta = (typeof STATUS_META)[StatusKey];

type SortKey = "status" | "username" | "submitted_at" | "grade";

const getReportStatusKey = (report: ExperimentReport): StatusKey => {
  if (!report.report_id) return "draft";
  if (report.status === "rejected") return "rejected";
  if (report.status === "graded") return "submitted"; // 'submitted' in STATUS_META maps to "已评阅" label
  if (report.status === "submitted") return "pending"; // 'pending' in STATUS_META maps to "待评阅" label
  
  // Default to pending if status is unknown but report_id exists
  return "pending";
};

const formatDateTime = (value: string | null) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day} ${hours}:${minutes}`;
};

const ExperimentReports: React.FC = () => {
  const { showToast } = useToast();
  const confirm = useConfirm();
  const [classes, setClasses] = useState<Class[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>("");
  const [reports, setReports] = useState<ExperimentReport[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: "asc" | "desc" } | null>(null);

  const [teacherId, setTeacherId] = useState<number | null>(null);
  const [isLoadingClasses, setIsLoadingClasses] = useState(true);
  const [isLoadingReports, setIsLoadingReports] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [showReviewModal, setShowReviewModal] = useState(false);
  const [selectedReport, setSelectedReport] = useState<ExperimentReport | null>(null);
  const [tempScore, setTempScore] = useState("");
  const [tempModelQualityScore, setTempModelQualityScore] = useState("");
  const [tempFeedback, setTempFeedback] = useState("");
  const [rejectReason, setRejectReason] = useState("");
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [showExpFlowScores, setShowExpFlowScores] = useState(false);
  const [expFlowScores, setExpFlowScores] = useState({
    exp_flow_demand_data_preparation: "",
    exp_flow_demand_descriptive_stats: "",
    exp_flow_demand_model_selection: "",
    exp_flow_demand_generate_results: "",
    exp_flow_production_inventory_calc: "",
    exp_flow_production_service_level: "",
    exp_flow_production_variable_calc: "",
    exp_flow_production_plan_creation: "",
  });
  const [isExportingReports, setIsExportingReports] = useState(false);
  const [exportedFileUrl, setExportedFileUrl] = useState<string | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);

  // New states for CSV export
  const [isExportingCsv, setIsExportingCsv] = useState(false);
  const [exportedCsvUrl, setExportedCsvUrl] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      setError("未找到登录凭据，请重新登录。");
      setIsLoadingClasses(false);
      return;
    }
    const decoded = decodeToken(token);
    if (!decoded || !decoded.sub) {
      setError("登录信息已失效，请重新登录。");
      setIsLoadingClasses(false);
      return;
    }
    setTeacherId(decoded.sub);
  }, []);

  useEffect(() => {
    const handler = window.setTimeout(() => setDebouncedSearchTerm(searchTerm.trim()), 300);
    return () => window.clearTimeout(handler);
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
        setSelectedClassId(firstClass ? String(firstClass.class_id) : "");
      } catch (err: any) {
        setError(err.message || "获取班级列表失败");
      } finally {
        setIsLoadingClasses(false);
      }
    };

    fetchClasses();
  }, [teacherId]);

  useEffect(() => {
    if (!selectedClassId) {
      setReports([]);
      return;
    }

    const fetchReports = async () => {
      setIsLoadingReports(true);
      setError(null);
      try {
        const response = await apiClient.get(`/classes/${selectedClassId}/reports`);
        const reportList = Array.isArray(response) ? (response as ExperimentReport[]) : [];
        setReports(reportList);
      } catch (err: any) {
        setError(err.message || "获取实验报告失败");
        setReports([]);
      } finally {
        setIsLoadingReports(false);
      }
    };

    fetchReports();
  }, [selectedClassId]);

  const currentClass = useMemo(
    () => classes.find((cls) => String(cls.class_id) === selectedClassId) ?? null,
    [classes, selectedClassId],
  );

  const summaryStats = useMemo(() => {
    if (reports.length === 0) {
      return {
        total: 0,
        submitted: 0,
        pendingReview: 0,
        reviewed: 0,
        averageGrade: "--",
        rejectedReportsCount: 0,
      };
    }

    // Categorize based on status
    const submittedReports = reports.filter(r => ['submitted', 'graded', 'rejected'].includes(r.status || ''));
    const pendingReports = reports.filter(r => r.status === 'submitted');
    const gradedReports = reports.filter(r => r.status === 'graded');
    const rejectedReports = reports.filter(r => r.status === 'rejected');

    const averageGrade = gradedReports.length
      ? Math.round(gradedReports.reduce((acc, report) => acc + (report.grade ?? 0), 0) / gradedReports.length).toString()
      : "--";

    return {
      total: reports.length,
      submitted: submittedReports.length,
      pendingReview: pendingReports.length,
      reviewed: gradedReports.length, // This is used for average calculation base, though not displayed directly in cards
      averageGrade,
      rejectedReportsCount: rejectedReports.length,
    };
  }, [reports]);

  const filteredReports = useMemo(() => {
    const query = debouncedSearchTerm.toLowerCase();
    if (!query) return reports;
    return reports.filter(
      (report) =>
        report.full_name.toLowerCase().includes(query) ||
        report.username.toLowerCase().includes(query),
    );
  }, [reports, debouncedSearchTerm]);

  const sortedReports = useMemo(() => {
    if (!sortConfig) return filteredReports;
    const next = [...filteredReports];
    const { key, direction } = sortConfig;
    const sortFactor = direction === "asc" ? 1 : -1;

    next.sort((a, b) => {
      switch (key) {
        case "status": {
          const order: Record<StatusKey, number> = { draft: 0, rejected: 1, pending: 2, submitted: 3 };
          const aKey = getReportStatusKey(a);
          const bKey = getReportStatusKey(b);
          if (aKey === bKey) return 0;
          return (order[aKey] - order[bKey]) * sortFactor;
        }
        case "username":
          return a.username.localeCompare(b.username, "zh-CN") * sortFactor;
        case "submitted_at": {
          const aTime = a.submitted_at ? new Date(a.submitted_at).getTime() : null;
          const bTime = b.submitted_at ? new Date(b.submitted_at).getTime() : null;
          if (aTime === null && bTime === null) return 0;
          if (aTime === null) return 1;
          if (bTime === null) return -1;
          return (aTime - bTime) * sortFactor;
        }
        case "grade": {
          const aHasGrade = a.grade !== null && a.grade !== undefined;
          const bHasGrade = b.grade !== null && b.grade !== undefined;
          if (!aHasGrade && !bHasGrade) return 0;
          if (!aHasGrade) return 1;
          if (!bHasGrade) return -1;
          return ((a.grade as number) - (b.grade as number)) * sortFactor;
        }
        default:
          return 0;
      }
    });

    return next;
  }, [filteredReports, sortConfig]);

  const handleClassChange = (value: string) => {
    setSelectedClassId(value);
    setExportedFileUrl(null);
    setExportedCsvUrl(null);
    setExportError(null);
  };

  const handleExportReports = useCallback(async () => {
    if (!selectedClassId || reports.length === 0 || isExportingReports) return;
    setIsExportingReports(true);
    setExportError(null);
    setExportedFileUrl(null);
    try {
      const response = await apiClient.get<{ file_path: string }>(`/classes/${selectedClassId}/report-archive`);

      if (!response || !response.file_path) {
        throw new Error("导出失败：服务器未返回文件地址");
      }

      const filename = response.file_path.split("/").pop();
      const fullUrl = `${DOWNLOAD_SERVER_BASE_URL}/exports/${filename}`;
      setExportedFileUrl(fullUrl);
    } catch (err: any) {
      const errorMessage = err.message || "导出实验报告失败，请稍后再试。";
      setExportError(errorMessage);
    } finally {
      setIsExportingReports(false);
    }
  }, [selectedClassId, reports.length, isExportingReports]);

  const handleExportCsv = useCallback(async () => {
    if (!selectedClassId || reports.length === 0 || isExportingCsv) return;
    setIsExportingCsv(true);
    setExportError(null);
    setExportedCsvUrl(null);
    try {
      const response = await apiClient.get<{ file_path: string }>(`/classes/${selectedClassId}/report-export.csv`);

      if (!response || !response.file_path) {
        throw new Error("导出失败：服务器未返回文件地址");
      }

      const filename = response.file_path.split("/").pop();
      const fullUrl = `${DOWNLOAD_SERVER_BASE_URL}/exports/${filename}`;
      setExportedCsvUrl(fullUrl);
    } catch (err: any) {
      const errorMessage = err.message || "导出 CSV 失败，请稍后再试。";
      setExportError(errorMessage);
    } finally {
      setIsExportingCsv(false);
    }
  }, [selectedClassId, reports.length, isExportingCsv]);

  const getReportStatus = useCallback((report: ExperimentReport): StatusMeta => {
    const key = getReportStatusKey(report);
    return STATUS_META[key];
  }, []);

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

  const handleReview = useCallback((report: ExperimentReport) => {
    if (!report.report_id) return;
    setSelectedReport(report);
    setTempScore(report.grade !== null && report.grade !== undefined ? String(report.grade) : "");
    setTempModelQualityScore(
      report.experiment_grade?.model_quality !== null && report.experiment_grade?.model_quality !== undefined
        ? String(report.experiment_grade.model_quality)
        : ""
    );
    setTempFeedback(report.feedback ?? "");
    setRejectReason(""); // Initialize reject reason

    // 初始化实验步骤评分
    const eg = report.experiment_grade;
    setExpFlowScores({
      exp_flow_demand_data_preparation: eg?.exp_flow_demand_data_preparation != null ? String(eg.exp_flow_demand_data_preparation) : "",
      exp_flow_demand_descriptive_stats: eg?.exp_flow_demand_descriptive_stats != null ? String(eg.exp_flow_demand_descriptive_stats) : "",
      exp_flow_demand_model_selection: eg?.exp_flow_demand_model_selection != null ? String(eg.exp_flow_demand_model_selection) : "",
      exp_flow_demand_generate_results: eg?.exp_flow_demand_generate_results != null ? String(eg.exp_flow_demand_generate_results) : "",
      exp_flow_production_inventory_calc: eg?.exp_flow_production_inventory_calc != null ? String(eg.exp_flow_production_inventory_calc) : "",
      exp_flow_production_service_level: eg?.exp_flow_production_service_level != null ? String(eg.exp_flow_production_service_level) : "",
      exp_flow_production_variable_calc: eg?.exp_flow_production_variable_calc != null ? String(eg.exp_flow_production_variable_calc) : "",
      exp_flow_production_plan_creation: eg?.exp_flow_production_plan_creation != null ? String(eg.exp_flow_production_plan_creation) : "",
    });

    setShowReviewModal(true);
  }, []);

  const handleDownload = useCallback((report: ExperimentReport) => {
    if (!report.pdf_file_path) {
      showToast("该报告暂未提供可下载的文件。", "info");
      return;
    }
    const url = buildDownloadUrl(report.pdf_file_path);
    window.open(url, "_blank");
  }, [showToast]);

  const isScoreValid = useMemo(() => {
    if (!tempScore.trim()) return true;
    const value = Number(tempScore);
    return !Number.isNaN(value) && value >= 0 && value <= 100;
  }, [tempScore]);

  const isModelQualityScoreValid = useMemo(() => {
    if (!tempModelQualityScore.trim()) return true;
    const value = Number(tempModelQualityScore);
    return !Number.isNaN(value) && value >= 0 && value <= 100;
  }, [tempModelQualityScore]);

  const areExpFlowScoresValid = useMemo(() => {
    for (const score of Object.values(expFlowScores)) {
      if (score.trim()) {
        const value = Number(score);
        if (Number.isNaN(value) || value < 0 || value > 100) {
          return false;
        }
      }
    }
    return true;
  }, [expFlowScores]);

  const canSubmitReview = useMemo(() => {
    if (!selectedReport) return false;
    const hasGrade = tempScore.trim().length > 0;
    const hasModelQuality = tempModelQualityScore.trim().length > 0;
    const hasFeedback = tempFeedback.trim().length > 0;
    const hasAnyExpFlowScore = Object.values(expFlowScores).some(score => score.trim().length > 0);
    if (!hasGrade && !hasModelQuality && !hasFeedback && !hasAnyExpFlowScore) return false;
    return isScoreValid && isModelQualityScoreValid && areExpFlowScoresValid && !isSubmittingReview;
  }, [selectedReport, tempScore, tempModelQualityScore, tempFeedback, expFlowScores, isScoreValid, isModelQualityScoreValid, areExpFlowScoresValid, isSubmittingReview]);

  const resetReviewState = useCallback(() => {
    setShowReviewModal(false);
    setSelectedReport(null);
    setTempScore("");
    setTempModelQualityScore("");
    setTempFeedback("");
    setRejectReason("");
    setIsSubmittingReview(false);
    setShowExpFlowScores(false);
    setExpFlowScores({
      exp_flow_demand_data_preparation: "",
      exp_flow_demand_descriptive_stats: "",
      exp_flow_demand_model_selection: "",
      exp_flow_demand_generate_results: "",
      exp_flow_production_inventory_calc: "",
      exp_flow_production_service_level: "",
      exp_flow_production_variable_calc: "",
      exp_flow_production_plan_creation: "",
    });
  }, []);

  const handleSaveReview = async () => {
    if (!selectedReport || !selectedReport.report_id) return;

    const payload: {
      grade?: number;
      feedback?: string;
      experiment_grade?: any;
      status?: string;
    } = {};

    if (tempScore.trim()) {
      const scoreValue = Number(tempScore);
      if (Number.isNaN(scoreValue) || scoreValue < 0 || scoreValue > 100) {
        showToast("实验报告得分需在 0-100 之间", "error");
        return;
      }
      payload.grade = scoreValue;
    }

    // 构建 experiment_grade 对象
    const experimentGrade: any = {};
    let hasExperimentGrade = false;

    if (tempModelQualityScore.trim()) {
      const modelQualityValue = Number(tempModelQualityScore);
      if (Number.isNaN(modelQualityValue) || modelQualityValue < 0 || modelQualityValue > 100) {
        showToast("模型选择得分需在 0-100 之间", "error");
        return;
      }
      experimentGrade.model_quality = modelQualityValue;
      hasExperimentGrade = true;
    }

    // 处理实验步骤评分
    for (const [key, value] of Object.entries(expFlowScores)) {
      if (value.trim()) {
        const scoreValue = Number(value);
        if (Number.isNaN(scoreValue) || scoreValue < 0 || scoreValue > 100) {
          showToast("实验步骤评分需在 0-100 之间", "error");
          return;
        }
        experimentGrade[key] = scoreValue;
        hasExperimentGrade = true;
      }
    }

    if (hasExperimentGrade) {
      payload.experiment_grade = experimentGrade;
    }

    if (tempFeedback.trim()) {
      payload.feedback = tempFeedback.trim();
    }

    if (payload.grade === undefined && payload.experiment_grade === undefined && payload.feedback === undefined) {
      showToast("请至少填写一项成绩或评语", "error");
      return;
    }

    // 只在提交了分数时才标记为已评阅，仅提交评语不改变状态
    if (payload.grade !== undefined || hasExperimentGrade) {
      payload.status = 'graded';
    }

    try {
      setIsSubmittingReview(true);
      const updatedReport = await apiClient.put(`/reports/${selectedReport.report_id}`, payload);
      setReports((prev) =>
        prev.map((report) =>
          report.report_id === selectedReport.report_id
            ? { ...(updatedReport as ExperimentReport) }
            : report,
        ),
      );
      showToast("评阅结果保存成功", "success");
      resetReviewState();
    } catch (err: any) {
      showToast(err.message || "保存评阅结果失败", "error");
    } finally {
      setIsSubmittingReview(false);
    }
  };

  const handleReject = async () => {
    if (!selectedReport || !selectedReport.report_id) return;

    if (!rejectReason.trim()) {
      showToast("驳回报告时必须填写驳回原因", "error");
      return;
    }

    // 确认对话框
    const confirmed = await confirm.showConfirm(
      "驳回报告",
      "确定要驳回该学生的实验报告吗？学生将需要重新提交。",
      "danger"
    );

    if (!confirmed) return;

    try {
      setIsSubmittingReview(true);
      const payload = {
        status: "rejected",
        feedback: rejectReason.trim(),
        grade: 0,
        experiment_grade: {
          model_quality: 0,
          exp_flow_demand_data_preparation: 0,
          exp_flow_demand_descriptive_stats: 0,
          exp_flow_demand_model_selection: 0,
          exp_flow_demand_generate_results: 0,
          exp_flow_production_inventory_calc: 0,
          exp_flow_production_service_level: 0,
          exp_flow_production_variable_calc: 0,
          exp_flow_production_plan_creation: 0,
          exp_flow_report_submission: 0,
        }
      };

      const updatedReport = await apiClient.put(`/reports/${selectedReport.report_id}`, payload);
      setReports((prev) =>
        prev.map((report) =>
          report.report_id === selectedReport.report_id
            ? { ...(updatedReport as ExperimentReport) }
            : report,
        ),
      );
      showToast("报告已驳回", "success");
      resetReviewState();
    } catch (err: any) {
      showToast(err.message || "驳回失败", "error");
    } finally {
      setIsSubmittingReview(false);
    }
  };

  const tableBody = useMemo<React.ReactNode>(() => {
    if (!selectedClassId) {
      return (
        <TableRow>
          <TableCell colSpan={9} className="py-12 text-center text-muted-foreground">
            请先选择一个班级查看实验报告。
          </TableCell>
        </TableRow>
      );
    }

    if (isLoadingReports) {
      return (
        <TableRow>
          <TableCell colSpan={9} className="py-12 text-center text-muted-foreground">
            <div className="flex items-center justify-center space-x-2">
              <Loader className="animate-spin" size={18} />
              <span>正在加载实验报告...</span>
            </div>
          </TableCell>
        </TableRow>
      );
    }

    if (reports.length === 0) {
      return (
        <TableRow>
          <TableCell colSpan={9} className="py-12 text-center text-muted-foreground">
            暂无学生可供显示。
          </TableCell>
        </TableRow>
      );
    }

    if (filteredReports.length === 0) {
      return (
        <TableRow>
          <TableCell colSpan={9} className="py-12 text-center text-muted-foreground">
            未找到匹配的学生，请调整搜索条件。
          </TableCell>
        </TableRow>
      );
    }

    return sortedReports.map((report, index) => {
      const status = getReportStatus(report);
      const submittedAt = formatDateTime(report.submitted_at);
      const hasReport = !!report.report_id;

      return (
        <TableRow key={report.report_id ?? `user-${report.user_id}`}>
          <TableCell className="px-6 py-4 whitespace-nowrap text-sm text-foreground">{index + 1}</TableCell>
          <TableCell className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
            <span className={`inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-medium ${status.badge}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
              <span>{status.label}</span>
            </span>
          </TableCell>
          <TableCell className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-foreground">{report.full_name}</TableCell>
          <TableCell className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">{report.username}</TableCell>
          <TableCell className="px-6 py-4 whitespace-nowrap text-sm text-foreground">{submittedAt}</TableCell>
          <TableCell className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
            {report.grade !== null && report.grade !== undefined ? (
              <span className="font-semibold text-foreground">{report.grade}</span>
            ) : (
              <span className="text-muted-foreground">--</span>
            )}
          </TableCell>
          <TableCell className="px-6 py-4 text-sm text-foreground">
            {report.feedback ? (
              <span className="inline-flex items-center text-foreground">
                <MessageCircle size={14} className="mr-1" />
                <span className="truncate max-w-xs" title={report.feedback}>
                  {report.feedback}
                </span>
              </span>
            ) : (
              <span className="text-muted-foreground">—</span>
            )}
          </TableCell>
          <TableCell className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
            {report.grader_name || <span className="text-muted-foreground">—</span>}
          </TableCell>
          <TableCell className="px-6 py-4 whitespace-nowrap text-sm">
            <div className="flex items-center space-x-2">
              <Button
                onClick={() => handleReview(report)}
                disabled={!hasReport}
                className="bg-primary hover:bg-primary/90 disabled:bg-muted"
              >
                <Star size={16} className="mr-2" />
                评阅
              </Button>
              <Button
                onClick={() => handleDownload(report)}
                disabled={!report.pdf_file_path}
                variant="outline"
                className="disabled:text-muted-foreground disabled:border-input"
              >
                <Download size={16} className="mr-2" />
                下载
              </Button>
            </div>
          </TableCell>
        </TableRow>
      );
    });
  }, [
    selectedClassId,
    isLoadingReports,
    reports,
    filteredReports,
    sortedReports,
    getReportStatus,
    handleReview,
    handleDownload,
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between md:space-x-6 space-y-3 md:space-y-0">
        <div>
          <h1 className="text-2xl font-bold text-foreground">实验报告</h1>
          <p className="text-sm text-muted-foreground mt-1">
            查看学生提交的实验报告、成绩与评语，支持在线评阅与下载。
          </p>
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
              onValueChange={handleClassChange}
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
          <AlertTriangle size={16} />
          <span>{error}</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard
          icon={Users}
          title="学生总数"
          value={summaryStats.total}
          description="班级内需要提交报告的学生"
          accent="bg-primary/10 text-primary"
        />
        <SummaryCard
          icon={CheckCircle2}
          title="已提交"
          value={summaryStats.submitted}
          description={
            <>
              已完成报告提交{' '}
              {summaryStats.rejectedReportsCount > 0 && (
                <span className="text-destructive">（含 {summaryStats.rejectedReportsCount} 份已驳回）</span>
              )}
            </>
          }
          accent="bg-success/10 text-success"
        />
        <SummaryCard
          icon={Clock}
          title="待评阅"
          value={summaryStats.pendingReview}
          description="已提交待老师评分"
          accent="bg-warning/10 text-warning"
        />
        <SummaryCard
          icon={Activity}
          title="报告平均得分"
          value={summaryStats.averageGrade}
          description="所有已评阅报告的平均分"
          accent="bg-accent/10 text-accent-foreground"
        />
      </div>

      <div className="bg-card rounded-lg shadow-md">
        <div className="px-6 py-4 border-b border-border flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <h2 className="text-lg font-semibold text-foreground">学生实验报告</h2>
            <div className="flex items-center space-x-2 text-sm text-muted-foreground">
              <FileText size={16} />
              <span>共 {filteredReports.length} 条记录</span>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            {exportedCsvUrl ? (
              <a
                href={exportedCsvUrl}
                download
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center space-x-2 px-4 py-2 bg-success text-primary-foreground rounded-lg hover:bg-success/90 transition-colors font-medium"
              >
                <Download size={16} />
                <span>下载报告列表</span>
              </a>
            ) : (
              <Button
                onClick={handleExportCsv}
                disabled={!selectedClassId || filteredReports.length === 0 || isExportingCsv}
                variant="outline"
                className="flex items-center space-x-2 bg-card"
              >
                {isExportingCsv ? (
                  <>
                    <Loader size={16} className="animate-spin" />
                    <span>生成报告列表...</span>
                  </>
                ) : (
                  <>
                    <FileText size={16} />
                    <span>导出报告列表</span>
                  </>
                )}
              </Button>
            )}

            {exportedFileUrl ? (
              <a
                href={exportedFileUrl}
                download
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center space-x-2 px-4 py-2 bg-success text-primary-foreground rounded-lg hover:bg-success/90 transition-colors font-medium"
              >
                <Download size={16} />
                <span>下载所有报告文件</span>
              </a>
            ) : (
              <Button
                onClick={handleExportReports}
                disabled={!selectedClassId || filteredReports.length === 0 || isExportingReports}
                variant="outline"
                className="flex items-center space-x-2"
              >
                {isExportingReports ? (
                  <>
                    <Loader size={16} className="animate-spin" />
                    <span>正在导出文件...</span>
                  </>
                ) : (
                  <>
                    <Download size={16} />
                    <span>导出所有报告文件</span>
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
        {exportError && (
          <div className="px-6 py-3 bg-destructive/10 border-t border-destructive/20 text-destructive flex items-center space-x-2">
            <AlertTriangle size={16} />
            <span>{exportError}</span>
          </div>
        )}
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted">
              <TableRow>
                <TableHead className="w-12 text-xs font-medium text-muted-foreground uppercase tracking-wider">序号</TableHead>
                <TableHead className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  <button
                    type="button"
                    onClick={() => handleSort("status")}
                    className="inline-flex items-center space-x-1 text-muted-foreground hover:text-primary focus:outline-none"
                  >
                    <span>评阅状态</span>
                    {renderSortIcon("status")}
                  </button>
                </TableHead>
                <TableHead className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">姓名</TableHead>
                <TableHead className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  <button
                    type="button"
                    onClick={() => handleSort("username")}
                    className="inline-flex items-center space-x-1 text-muted-foreground hover:text-primary focus:outline-none"
                  >
                    <span>学号</span>
                    {renderSortIcon("username")}
                  </button>
                </TableHead>
                <TableHead className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  <button
                    type="button"
                    onClick={() => handleSort("submitted_at")}
                    className="inline-flex items-center space-x-1 text-muted-foreground hover:text-primary focus:outline-none"
                  >
                    <span>提交时间</span>
                    {renderSortIcon("submitted_at")}
                  </button>
                </TableHead>
                <TableHead className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  <button
                    type="button"
                    onClick={() => handleSort("grade")}
                    className="inline-flex items-center space-x-1 text-muted-foreground hover:text-primary focus:outline-none"
                  >
                    <span>报告得分</span>
                    {renderSortIcon("grade")}
                  </button>
                </TableHead>
                <TableHead className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">评语</TableHead>
                <TableHead className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">评阅人</TableHead>
                <TableHead className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="bg-card">{tableBody}</TableBody>
          </Table>
        </div>
      </div>

      <Modal
        isOpen={showReviewModal}
        onClose={resetReviewState}
        title="评阅实验报告"
        size="fullscreen"
      >
        {selectedReport && (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-full">
            <div className="lg:col-span-3 h-full flex flex-col">
              {selectedReport.pdf_file_path ? (
                <iframe
                  src={buildDownloadUrl(selectedReport.pdf_file_path)}
                  title="report-preview"
                  className="w-full h-full rounded-lg border border-border"
                />
              ) : (
                <div className="h-full bg-muted rounded-lg flex items-center justify-center border border-border">
                  <div className="text-center text-muted-foreground">
                    <FileText className="w-12 h-12 mx-auto mb-2" />
                    <p>该报告没有可预览的文件。</p>
                  </div>
                </div>
              )}
            </div>
            <div className="lg:col-span-1 space-y-6 bg-muted p-6 rounded-lg border border-border overflow-y-auto">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-foreground">{selectedReport.full_name}</h3>
                  <p className="text-sm text-muted-foreground">{selectedReport.username}</p>
                  <p className="text-xs text-muted-foreground mt-1">提交时间：{formatDateTime(selectedReport.submitted_at)}</p>
                </div>
                <Button
                  onClick={() => handleDownload(selectedReport)}
                  variant="outline"
                  size="sm"
                  disabled={!selectedReport.pdf_file_path}
                >
                  <Download size={16} className="mr-1" />
                  下载
                </Button>
              </div>

              {selectedReport.status === "rejected" ? (
                <div className="flex flex-col flex-1 justify-center items-center space-y-6 py-10">
                  <div className="bg-destructive/10 p-4 rounded-full">
                    <XCircle size={48} className="text-destructive" />
                  </div>
                  <div className="text-center">
                    <h3 className="text-lg font-bold text-foreground">报告已驳回</h3>
                    <p className="text-sm text-muted-foreground mt-2 max-w-xs mx-auto">
                      该报告已被驳回，分数已归零。<br />
                      需等待学生重新提交后，方可再次评阅。
                    </p>
                  </div>
                  
                  {selectedReport.feedback && (
                    <div className="w-full bg-muted border border-border rounded-lg p-4 text-sm text-foreground">
                      <span className="font-semibold block mb-1 text-foreground">驳回原因：</span>
                      {selectedReport.feedback}
                    </div>
                  )}

                  <Button variant="outline" onClick={resetReviewState} className="w-full">
                    关闭
                  </Button>
                </div>
              ) : (
                <>
                  <div>
                    <Label className="text-foreground mb-2">实验报告得分（0-100）</Label>
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      value={tempScore}
                      onChange={(event) => setTempScore(event.target.value)}
                      className="rounded-lg text-base"
                      placeholder="请输入报告得分"
                    />
                    {!isScoreValid && <p className="mt-1 text-xs text-destructive">分数需在 0-100 之间</p>}
                  </div>

                  <div>
                    <Label className="text-foreground mb-2">模型选择得分（0-100）</Label>
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      value={tempModelQualityScore}
                      onChange={(event) => setTempModelQualityScore(event.target.value)}
                      className="rounded-lg text-base"
                      placeholder="请输入模型选择得分"
                    />
                    {!isModelQualityScoreValid && <p className="mt-1 text-xs text-destructive">分数需在 0-100 之间</p>}
                  </div>

                  {/* 实验步骤评分 - 可折叠 */}
                  <div className="border border-input rounded-lg">
                    <button
                      type="button"
                      onClick={() => setShowExpFlowScores(!showExpFlowScores)}
                      className="w-full flex items-center justify-between px-4 py-3 bg-muted hover:bg-muted rounded-lg transition-colors"
                    >
                      <span className="text-sm font-medium text-foreground">实验步骤评分（可选）</span>
                      {showExpFlowScores ? (
                        <ChevronUp size={18} className="text-muted-foreground" />
                      ) : (
                        <ChevronDown size={18} className="text-muted-foreground" />
                      )}
                    </button>

                    {showExpFlowScores && (
                      <div className="p-4 space-y-4 border-t border-input">
                        <div className="text-xs text-muted-foreground mb-3">
                          <p className="font-medium mb-1">需求预测任务：</p>
                        </div>

                        <div>
                          <Label className="text-muted-foreground mb-1 text-xs">（1）数据准备</Label>
                          <Input
                            type="number"
                            min={0}
                            max={100}
                            value={expFlowScores.exp_flow_demand_data_preparation}
                            onChange={(e) => setExpFlowScores(prev => ({ ...prev, exp_flow_demand_data_preparation: e.target.value }))}
                            className="rounded-lg text-sm"
                            placeholder="0-100"
                          />
                        </div>

                        <div>
                          <Label className="text-muted-foreground mb-1 text-xs">（2）描述性统计</Label>
                          <Input
                            type="number"
                            min={0}
                            max={100}
                            value={expFlowScores.exp_flow_demand_descriptive_stats}
                            onChange={(e) => setExpFlowScores(prev => ({ ...prev, exp_flow_demand_descriptive_stats: e.target.value }))}
                            className="rounded-lg text-sm"
                            placeholder="0-100"
                          />
                        </div>

                        <div>
                          <Label className="text-muted-foreground mb-1 text-xs">（3）预测模型选择</Label>
                          <Input
                            type="number"
                            min={0}
                            max={100}
                            value={expFlowScores.exp_flow_demand_model_selection}
                            onChange={(e) => setExpFlowScores(prev => ({ ...prev, exp_flow_demand_model_selection: e.target.value }))}
                            className="rounded-lg text-sm"
                            placeholder="0-100"
                          />
                        </div>

                        <div>
                          <Label className="text-muted-foreground mb-1 text-xs">（4）生成预测结果</Label>
                          <Input
                            type="number"
                            min={0}
                            max={100}
                            value={expFlowScores.exp_flow_demand_generate_results}
                            onChange={(e) => setExpFlowScores(prev => ({ ...prev, exp_flow_demand_generate_results: e.target.value }))}
                            className="rounded-lg text-sm"
                            placeholder="0-100"
                          />
                        </div>

                        <div className="text-xs text-muted-foreground mb-3 pt-3 border-t border-border">
                          <p className="font-medium mb-1">生产计划决策任务：</p>
                        </div>

                        <div>
                          <Label className="text-muted-foreground mb-1 text-xs">（1）库存变量参数计算</Label>
                          <Input
                            type="number"
                            min={0}
                            max={100}
                            value={expFlowScores.exp_flow_production_inventory_calc}
                            onChange={(e) => setExpFlowScores(prev => ({ ...prev, exp_flow_production_inventory_calc: e.target.value }))}
                            className="rounded-lg text-sm"
                            placeholder="0-100"
                          />
                        </div>

                        <div>
                          <Label className="text-muted-foreground mb-1 text-xs">（2）服务水平参数计算</Label>
                          <Input
                            type="number"
                            min={0}
                            max={100}
                            value={expFlowScores.exp_flow_production_service_level}
                            onChange={(e) => setExpFlowScores(prev => ({ ...prev, exp_flow_production_service_level: e.target.value }))}
                            className="rounded-lg text-sm"
                            placeholder="0-100"
                          />
                        </div>

                        <div>
                          <Label className="text-muted-foreground mb-1 text-xs">（3）生产变量参数计算</Label>
                          <Input
                            type="number"
                            min={0}
                            max={100}
                            value={expFlowScores.exp_flow_production_variable_calc}
                            onChange={(e) => setExpFlowScores(prev => ({ ...prev, exp_flow_production_variable_calc: e.target.value }))}
                            className="rounded-lg text-sm"
                            placeholder="0-100"
                          />
                        </div>

                        <div>
                          <Label className="text-muted-foreground mb-1 text-xs">（4）制定生产计划</Label>
                          <Input
                            type="number"
                            min={0}
                            max={100}
                            value={expFlowScores.exp_flow_production_plan_creation}
                            onChange={(e) => setExpFlowScores(prev => ({ ...prev, exp_flow_production_plan_creation: e.target.value }))}
                            className="rounded-lg text-sm"
                            placeholder="0-100"
                          />
                        </div>

                        {!areExpFlowScoresValid && (
                          <p className="text-xs text-destructive">所有步骤评分需在 0-100 之间</p>
                        )}
                      </div>
                    )}
                  </div>

                  <div>
                    <Label className="text-foreground mb-2">评语（评分时使用）</Label>
                    <Textarea
                      value={tempFeedback}
                      onChange={(event) => setTempFeedback(event.target.value)}
                      rows={4}
                      className="rounded-lg resize-none"
                      placeholder="请输入评语，可为空"
                    />
                  </div>

                  <div className="flex flex-col space-y-3 pt-4 border-t border-border">
                    <Button
                      onClick={handleSaveReview}
                      disabled={!canSubmitReview}
                      className="w-full bg-primary hover:bg-primary/90 disabled:bg-muted"
                    >
                      {isSubmittingReview ? "保存中..." : "保存评阅结果"}
                    </Button>

                    <Button variant="outline" onClick={resetReviewState} className="w-full">
                      取消
                    </Button>
                  </div>

                  {/* 驳回区域 - 放在最下方 */}
                  <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 space-y-3 mt-4">
                    <Label className="text-destructive">驳回原因（驳回时必填）</Label>
                    <Textarea
                      value={rejectReason}
                      onChange={(event) => setRejectReason(event.target.value)}
                      rows={3}
                      className="rounded-lg focus-visible:border-destructive focus-visible:ring-destructive/40 resize-none text-sm border-destructive/20"
                      placeholder="请输入具体的修改建议..."
                    />
                    <Button
                      onClick={handleReject}
                      disabled={isSubmittingReview || !rejectReason.trim()}
                      variant="outline"
                      className="w-full text-destructive border-destructive/20 hover:bg-destructive/10 hover:border-destructive/30"
                    >
                      驳回报告
                    </Button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </Modal>
      
      <ConfirmDialog
        isOpen={confirm.isOpen}
        title={confirm.title}
        message={confirm.message}
        variant={confirm.variant}
        onConfirm={confirm.handleConfirm}
        onCancel={confirm.handleCancel}
      />
    </div>
  );
};

const SummaryCard: React.FC<{
  icon: React.ElementType;
  title: string;
  value: number | string;
  description: React.ReactNode;
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

export default ExperimentReports;
