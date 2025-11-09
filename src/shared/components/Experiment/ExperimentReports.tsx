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
} from "lucide-react";
import type { Class, ExperimentReport } from "@/shared/types";
import Modal from "@/shared/components/common/Modal";
import Button from "@/shared/components/common/Button";
import { API_BASE_URL, apiClient } from "@/utils/apiClient";
import { decodeToken } from "@/utils/auth";
import { DOWNLOAD_SERVER_BASE_URL } from "@/config/appConfig";
import { useToast } from "@/shared/hooks/useToast";
import { Toast } from "@/shared/components/common/Toast";

const extractFileName = (filePath: string | null) => {
  if (!filePath) return "在线填写";
  const parts = filePath.split(/[\\/\\\\]/);
  return parts[parts.length - 1] || filePath;
};

const buildDownloadUrl = (filePath: string) => {
  const filename = filePath.split("/").pop();
  return `${DOWNLOAD_SERVER_BASE_URL}/reports/${filename}`;
};

const STATUS_META = {
  submitted: {
    label: "已评阅",
    badge: "bg-emerald-50 text-emerald-700 border border-emerald-200",
    dot: "bg-emerald-500",
  },
  pending: {
    label: "待评阅",
    badge: "bg-yellow-50 text-yellow-700 border border-yellow-200",
    dot: "bg-yellow-500",
  },
  draft: {
    label: "未提交",
    badge: "bg-slate-50 text-slate-600 border border-slate-200",
    dot: "bg-slate-400",
  },
} as const;

type StatusMeta = (typeof STATUS_META)[keyof typeof STATUS_META];

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
  const { toast, showToast, hideToast } = useToast();
  const [classes, setClasses] = useState<Class[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>("");
  const [reports, setReports] = useState<ExperimentReport[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");

  const [teacherId, setTeacherId] = useState<number | null>(null);
  const [isLoadingClasses, setIsLoadingClasses] = useState(true);
  const [isLoadingReports, setIsLoadingReports] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [showReviewModal, setShowReviewModal] = useState(false);
  const [selectedReport, setSelectedReport] = useState<ExperimentReport | null>(null);
  const [tempScore, setTempScore] = useState("");
  const [tempFeedback, setTempFeedback] = useState("");
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [isExportingReports, setIsExportingReports] = useState(false);
  const [exportedFileUrl, setExportedFileUrl] = useState<string | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);

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
      return { total: 0, submitted: 0, pendingReview: 0, reviewed: 0, averageGrade: "--" };
    }
    const submitted = reports.filter((report) => report.report_id !== null);
    const reviewed = submitted.filter((report) => report.grade !== null);
    const pendingReview = submitted.filter((report) => report.grade === null);
    const averageGrade = reviewed.length
      ? Math.round(reviewed.reduce((acc, report) => acc + (report.grade ?? 0), 0) / reviewed.length).toString()
      : "--";
    return {
      total: reports.length,
      submitted: submitted.length,
      pendingReview: pendingReview.length,
      reviewed: reviewed.length,
      averageGrade,
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

  const handleClassChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedClassId(event.target.value);
    setExportedFileUrl(null);
    setExportError(null);
  };

  const handleExportReports = useCallback(async () => {
    if (!selectedClassId || filteredReports.length === 0 || isExportingReports) return;
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
  }, [selectedClassId, filteredReports.length, isExportingReports]);

  const getReportStatus = useCallback((report: ExperimentReport): StatusMeta => {
    if (!report.report_id) return STATUS_META.draft;
    if (report.grade !== null && report.grade !== undefined) return STATUS_META.submitted;
    return STATUS_META.pending;
  }, []);

  const handleReview = useCallback((report: ExperimentReport) => {
    if (!report.report_id) return;
    setSelectedReport(report);
    setTempScore(report.grade !== null && report.grade !== undefined ? String(report.grade) : "");
    setTempFeedback(report.feedback ?? "");
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

  const canSubmitReview = useMemo(() => {
    if (!selectedReport) return false;
    const hasGrade = tempScore.trim().length > 0;
    const hasFeedback = tempFeedback.trim().length > 0;
    if (!hasGrade && !hasFeedback) return false;
    return isScoreValid && !isSubmittingReview;
  }, [selectedReport, tempScore, tempFeedback, isScoreValid, isSubmittingReview]);

  const resetReviewState = useCallback(() => {
    setShowReviewModal(false);
    setSelectedReport(null);
    setTempScore("");
    setTempFeedback("");
    setIsSubmittingReview(false);
  }, []);

  const handleSaveReview = async () => {
    if (!selectedReport || !selectedReport.report_id) return;

    const payload: { grade?: number; feedback?: string } = {};
    if (tempScore.trim()) {
      const scoreValue = Number(tempScore);
      if (Number.isNaN(scoreValue) || scoreValue < 0 || scoreValue > 100) {
        showToast("请填写 0-100 之间的分数", "error");
        return;
      }
      payload.grade = scoreValue;
    }
    if (tempFeedback.trim()) {
      payload.feedback = tempFeedback.trim();
    }

    if (payload.grade === undefined && payload.feedback === undefined) {
      showToast("请至少填写分数或评语", "error");
      return;
    }

    try {
      setIsSubmittingReview(true);
      const updatedReport = await apiClient.put(`/reports/${selectedReport.report_id}`, payload);
      setReports((prev) =>
        prev.map((report) =>
          report.user_id === selectedReport.user_id
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

  const tableBody = useMemo<React.ReactNode>(() => {
    if (!selectedClassId) {
      return (
        <tr>
          <td colSpan={7} className="py-12 text-center text-gray-500">
            请先选择一个班级查看实验报告。
          </td>
        </tr>
      );
    }

    if (isLoadingReports) {
      return (
        <tr>
          <td colSpan={7} className="py-12 text-center text-gray-500">
            <div className="flex items-center justify-center space-x-2">
              <Loader className="animate-spin" size={18} />
              <span>正在加载实验报告...</span>
            </div>
          </td>
        </tr>
      );
    }

    if (reports.length === 0) {
      return (
        <tr>
          <td colSpan={7} className="py-12 text-center text-gray-500">
            暂无学生可供显示。
          </td>
        </tr>
      );
    }

    if (filteredReports.length === 0) {
      return (
        <tr>
          <td colSpan={7} className="py-12 text-center text-gray-500">
            未找到匹配的学生，请调整搜索条件。
          </td>
        </tr>
      );
    }

    return filteredReports.map((report, index) => {
      const status = getReportStatus(report);
      const fileName = extractFileName(report.pdf_file_path);
      const submittedAt = formatDateTime(report.submitted_at);
      const hasReport = !!report.report_id;

      return (
        <tr key={report.user_id} className="hover:bg-gray-50">
          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{index + 1}</td>
          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
            <div className="flex items-center justify-between space-x-3">
              <div>
                <p className="font-semibold">{report.full_name}</p>
                <p className="text-xs text-gray-500">{report.username}</p>
              </div>
              <span className={`inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-medium ${status.badge}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
                <span>{status.label}</span>
              </span>
            </div>
          </td>
          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{submittedAt}</td>
          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
            {report.grade !== null && report.grade !== undefined ? (
              <span className="font-semibold text-blue-600">{report.grade} 分</span>
            ) : (
              <span className="text-gray-400">--</span>
            )}
          </td>
          <td className="px-6 py-4 text-sm text-gray-700">
            {report.feedback ? (
              <span className="inline-flex items-center text-blue-600">
                <MessageCircle size={14} className="mr-1" />
                <span className="truncate max-w-xs" title={report.feedback}>
                  {report.feedback}
                </span>
              </span>
            ) : (
              <span className="text-gray-400">—</span>
            )}
          </td>
          <td className="px-6 py-4 text-sm text-gray-700">
            {hasReport ? (
              <span className="truncate max-w-xs" title={fileName}>{fileName}</span>
            ) : (
              <span className="text-gray-400">—</span>
            )}
          </td>
          <td className="px-6 py-4 whitespace-nowrap text-sm">
            <div className="flex items-center space-x-2">
              <Button
                onClick={() => handleReview(report)}
                disabled={!hasReport}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300"
              >
                <Star size={16} className="mr-2" />
                评阅
              </Button>
              <Button
                onClick={() => handleDownload(report)}
                disabled={!report.pdf_file_path}
                variant="outline"
                className="disabled:text-gray-400 disabled:border-gray-300"
              >
                <Download size={16} className="mr-2" />
                下载
              </Button>
            </div>
          </td>
        </tr>
      );
    });
  }, [
    selectedClassId,
    isLoadingReports,
    reports,
    filteredReports,
    debouncedSearchTerm,
    getReportStatus,
    handleReview,
    handleDownload,
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between md:space-x-6 space-y-3 md:space-y-0">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">实验报告</h1>
          <p className="text-sm text-gray-500 mt-1">
            查看学生提交的实验报告、成绩与评语，支持在线评阅与下载。
          </p>
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
              onChange={handleClassChange}
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
          accent="bg-blue-100 text-blue-600"
        />
        <SummaryCard
          icon={CheckCircle2}
          title="已提交"
          value={summaryStats.submitted}
          description="已完成报告提交"
          accent="bg-emerald-100 text-emerald-600"
        />
        <SummaryCard
          icon={Clock}
          title="待评阅"
          value={summaryStats.pendingReview}
          description="已提交待老师评分"
          accent="bg-yellow-100 text-yellow-600"
        />
        <SummaryCard
          icon={Activity}
          title="平均得分"
          value={summaryStats.averageGrade}
          description="所有已评阅报告的平均分"
          accent="bg-purple-100 text-purple-600"
        />
      </div>

      <div className="bg-white rounded-lg shadow-md">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <h2 className="text-lg font-semibold text-gray-900">学生实验报告</h2>
            <div className="flex items-center space-x-2 text-sm text-gray-500">
              <FileText size={16} />
              <span>共 {filteredReports.length} 条记录</span>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            {exportedFileUrl ? (
              <a
                href={exportedFileUrl}
                download
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
              >
                <Download size={16} />
                <span>下载报告压缩包</span>
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
                    <span>正在导出...</span>
                  </>
                ) : (
                  <>
                    <Download size={16} />
                    <span>导出所有报告</span>
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
        {exportError && (
          <div className="px-6 py-3 bg-red-50 border-t border-red-200 text-red-700 flex items-center space-x-2">
            <AlertTriangle size={16} />
            <span>{exportError}</span>
          </div>
        )}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="w-12 text-xs font-medium text-gray-500 uppercase tracking-wider">序号</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">学生</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">提交时间</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">成绩</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">评语</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">报告文件</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">操作</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">{tableBody}</tbody>
          </table>
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
                  className="w-full h-full rounded-lg border border-gray-200"
                />
              ) : (
                <div className="h-full bg-gray-100 rounded-lg flex items-center justify-center border border-gray-200">
                  <div className="text-center text-gray-500">
                    <FileText className="w-12 h-12 mx-auto mb-2" />
                    <p>该报告没有可预览的文件。</p>
                  </div>
                </div>
              )}
            </div>
            <div className="lg:col-span-1 space-y-6 bg-gray-50 p-6 rounded-lg border border-gray-200 overflow-y-auto">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-gray-900">{selectedReport.full_name}</h3>
                  <p className="text-sm text-gray-600">{selectedReport.username}</p>
                  <p className="text-xs text-gray-500 mt-1">提交时间：{formatDateTime(selectedReport.submitted_at)}</p>
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

              <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3">
                <h4 className="text-sm font-medium text-blue-900">评阅提示</h4>
                <p className="text-xs text-blue-700 mt-1">请先在左侧预览报告，再填写分数与评语。</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">成绩（0-100）</label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={tempScore}
                  onChange={(event) => setTempScore(event.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base"
                  placeholder="请输入分数"
                />
                {!isScoreValid && <p className="mt-1 text-xs text-red-500">分数需在 0-100 之间</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">评语</label>
                <textarea
                  value={tempFeedback}
                  onChange={(event) => setTempFeedback(event.target.value)}
                  rows={6}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                  placeholder="请输入评语，可为空"
                />
              </div>

              <div className="flex flex-col space-y-3 pt-4 border-t border-gray-200">
                <Button
                  onClick={handleSaveReview}
                  disabled={!canSubmitReview}
                  className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300"
                >
                  {isSubmittingReview ? "保存中..." : "保存评阅结果"}
                </Button>
                <Button variant="outline" onClick={resetReviewState} className="w-full">
                  取消
                </Button>
              </div>
            </div>
          </div>
        )}
      </Modal>
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={hideToast}
          position="bottom-right"
        />
      )}
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

export default ExperimentReports;
