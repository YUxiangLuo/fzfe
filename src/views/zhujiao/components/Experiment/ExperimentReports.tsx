import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  FileText,
  Download,
  Star,
  MessageCircle,
  Loader,
  AlertTriangle,
  Search,
} from "lucide-react";
import type { Class, ExperimentReport } from "../../types";
import Modal from "../Common/Modal";
import Button from "../Common/Button";
import { API_BASE_URL, apiClient } from "../../../../utils/apiClient";
import { decodeToken } from "../../../../utils/auth";
import { DOWNLOAD_SERVER_BASE_URL } from "../../../../config/appConfig";
import { useToast } from "../../hooks/useToast";
import Toast from "../Common/Toast";

const extractFileName = (filePath: string | null) => {
  if (!filePath) return "在线填写";
  const parts = filePath.split(/[\\/\\\\]/);
  return parts[parts.length - 1] || filePath;
};

const buildDownloadUrl = (filePath: string) => {
  const filename = filePath.split("/").pop();
  return `${DOWNLOAD_SERVER_BASE_URL}/reports/${filename}`;
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
  const toast = useToast();
  const [classes, setClasses] = useState<Class[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>("");
  const [reports, setReports] = useState<ExperimentReport[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");

  const [assistantId, setAssistantId] = useState<number | null>(null);
  const [isLoadingClasses, setIsLoadingClasses] = useState(true);
  const [isLoadingReports, setIsLoadingReports] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [showReviewModal, setShowReviewModal] = useState(false);
  const [selectedReport, setSelectedReport] = useState<ExperimentReport | null>(
    null,
  );
  const [tempScore, setTempScore] = useState("");
  const [tempComments, setTempComments] = useState("");
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
    setAssistantId(decoded.sub);
  }, []);

  useEffect(() => {
    const handler = window.setTimeout(() => {
      setDebouncedSearchTerm(searchTerm.trim());
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
  }, [assistantId]);

  useEffect(() => {
    if (!selectedClassId) {
      setReports([]);
      return;
    }

    const fetchReports = async (classId: string) => {
      setIsLoadingReports(true);
      setError(null);
      try {
        const response = await apiClient.get(`/classes/${classId}/reports`);
        const reportList = Array.isArray(response)
          ? (response as ExperimentReport[])
          : [];
        setReports(reportList);
      } catch (err: any) {
        setError(err.message || "获取实验报告失败");
        setReports([]);
      } finally {
        setIsLoadingReports(false);
      }
    };

    fetchReports(selectedClassId);
  }, [selectedClassId]);

  const currentClassName = useMemo(() => {
    return (
      classes.find((cls) => String(cls.class_id) === selectedClassId)
        ?.class_name ?? "—"
    );
  }, [classes, selectedClassId]);

  const submittedReports = useMemo(
    () => reports.filter((report) => report.report_id !== null),
    [reports],
  );

  const unsubmittedReports = useMemo(
    () => reports.filter((report) => report.report_id === null),
    [reports],
  );

  const reviewedReports = useMemo(
    () =>
      submittedReports.filter(
        (report) => report.grade !== null && report.grade !== undefined,
      ),
    [submittedReports],
  );

  const pendingReports = useMemo(
    () =>
      submittedReports.filter(
        (report) => report.grade === null || report.grade === undefined,
      ),
    [submittedReports],
  );

  const filteredReports = useMemo(() => {
    const query = debouncedSearchTerm.toLowerCase();
    if (!query) return reports;
    return reports.filter(
      (report) =>
        report.full_name.toLowerCase().includes(query) ||
        report.username.toLowerCase().includes(query),
    );
  }, [reports, debouncedSearchTerm]);

  const averageScore = useMemo(() => {
    if (reviewedReports.length === 0) return "--";
    const total = reviewedReports.reduce(
      (sum, report) => sum + (report.grade ?? 0),
      0,
    );
    return Math.round(total / reviewedReports.length).toString();
  }, [reviewedReports]);

  const resetReviewState = () => {
    setShowReviewModal(false);
    setSelectedReport(null);
    setTempScore("");
    setTempComments("");
    setIsSubmittingReview(false);
  };

  const handleReview = useCallback((report: ExperimentReport) => {
    if (!report.report_id) return;
    setSelectedReport(report);
    setTempScore(
      report.grade !== null && report.grade !== undefined
        ? String(report.grade)
        : "",
    );
    setTempComments(report.feedback ?? "");
    setShowReviewModal(true);
  }, []);

  const isScoreValid = useMemo(() => {
    if (!tempScore.trim()) return true;
    const value = Number(tempScore);
    return !Number.isNaN(value) && value >= 0 && value <= 100;
  }, [tempScore]);

  const canSubmitReview = useMemo(() => {
    if (!selectedReport) return false;
    const hasGrade = tempScore.trim().length > 0;
    const hasFeedback = tempComments.trim().length > 0;
    if (!hasGrade && !hasFeedback) return false;
    return isScoreValid && !isSubmittingReview;
  }, [
    selectedReport,
    tempScore,
    tempComments,
    isScoreValid,
    isSubmittingReview,
  ]);

  const handleSaveReview = async () => {
    if (!selectedReport || !selectedReport.report_id) return;

    const payload: { grade?: number; feedback?: string } = {};
    if (tempScore.trim()) {
      const gradeValue = Number(tempScore);
      if (Number.isNaN(gradeValue) || gradeValue < 0 || gradeValue > 100) {
        toast.showToast("请填写 0-100 之间的分数", "error");
        return;
      }
      payload.grade = gradeValue;
    }
    if (tempComments.trim()) {
      payload.feedback = tempComments.trim();
    }

    if (payload.grade === undefined && payload.feedback === undefined) {
      toast.showToast("请至少填写分数或评语", "error");
      return;
    }

    try {
      setIsSubmittingReview(true);
      const updatedReport = await apiClient.put(
        `/reports/${selectedReport.report_id}`,
        payload,
      );
      setReports((prev) =>
        prev.map((report) =>
          report.user_id === selectedReport.user_id
            ? { ...(updatedReport as ExperimentReport) }
            : report,
        ),
      );
      resetReviewState();
      toast.showToast("评阅结果保存成功", "success");
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "保存评阅结果失败";
      toast.showToast(errorMessage, "error");
    } finally {
      setIsSubmittingReview(false);
    }
  };

  const handleDownload = useCallback((report: ExperimentReport) => {
    if (!report.pdf_file_path) {
      toast.showToast("该报告暂未提供可下载的文件", "error");
      return;
    }

    const url = buildDownloadUrl(report.pdf_file_path);
    window.open(url, "_blank");
  }, []);

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

  const getStatusMeta = useCallback((report: ExperimentReport) => {
    if (report.report_id === null) {
      return { text: "未提交", className: "bg-gray-100 text-gray-500" };
    }
    if (report.grade !== null && report.grade !== undefined) {
      return { text: "已评阅", className: "bg-green-100 text-green-800" };
    }
    return { text: "待评阅", className: "bg-yellow-100 text-yellow-800" };
  }, []);

  const tableBody = useMemo<React.ReactNode>(() => {
    if (!selectedClassId) {
      return (
        <tr>
          <td colSpan={8} className="py-12 text-center text-gray-500">
            请先选择一个班级查看实验报告。
          </td>
        </tr>
      );
    }

    if (isLoadingReports) {
      return (
        <tr>
          <td colSpan={8} className="py-12 text-center text-gray-500">
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
          <td colSpan={8} className="py-12 text-center text-gray-500">
            暂无学生提交实验报告。
          </td>
        </tr>
      );
    }

    if (filteredReports.length === 0) {
      return (
        <tr>
          <td colSpan={8} className="py-12 text-center text-gray-500">
            {debouncedSearchTerm
              ? "未找到匹配的学生，请调整搜索条件。"
              : "暂无学生提交实验报告。"}
          </td>
        </tr>
      );
    }

    return filteredReports.map((report, index) => {
      const { text: statusText, className: statusClass } =
        getStatusMeta(report);
      const fileName = extractFileName(report.pdf_file_path);
      const submittedAt = formatDateTime(report.submitted_at);
      return (
        <tr key={report.user_id} className="hover:bg-gray-50">
          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
            {index + 1}
          </td>
          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
            {report.full_name}
          </td>
          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
            {report.username}
          </td>
          <td className="px-6 py-4 text-sm text-gray-900">
            <div className="max-w-xs">
              <p className="truncate" title={fileName}>
                {fileName}
              </p>
            </div>
          </td>
          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
            {submittedAt}
          </td>
          <td className="px-6 py-4 whitespace-nowrap">
            <span className={`px-2 py-1 text-xs rounded-full ${statusClass}`}>
              {statusText}
            </span>
          </td>
          <td className="px-6 py-4 whitespace-nowrap text-sm">
            {report.grade !== null && report.grade !== undefined ? (
              <span className="font-medium text-blue-600">
                {report.grade}分
              </span>
            ) : (
              <span className="text-gray-400">--</span>
            )}
          </td>
          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
            <div className="flex items-center space-x-2">
              <button
                onClick={() => handleReview(report)}
                disabled={!report.report_id}
                className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-all duration-200 shadow-sm hover:shadow-md disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                <Star size={16} className="mr-2" />
                评阅
              </button>
              <button
                onClick={() => handleDownload(report)}
                disabled={!report.pdf_file_path}
                className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
              >
                <Download size={16} className="mr-1" />
                下载
              </button>
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
    getStatusMeta,
    handleReview,
    handleDownload,
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between md:space-x-6 space-y-3 md:space-y-0">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">实验报告</h1>
          <p className="text-sm text-gray-500 mt-1">这里显示的是学生最新提交的一份报告。</p>
        </div>
        {selectedClassId && (
          <p className="text-sm text-gray-500">当前班级：{currentClassName}</p>
        )}
      </div>

      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="w-full md:max-w-xs">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              选择班级
            </label>
            <select
              value={selectedClassId}
              onChange={handleClassChange}
              disabled={isLoadingClasses || classes.length === 0}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
            >
              {classes.length === 0 ? (
                <option value="" disabled>
                  {isLoadingClasses ? "正在加载班级..." : "暂无班级"}
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
          <div className="w-full md:flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              按学号/姓名搜索
            </label>
            <div className="relative">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                size={16}
              />
              <input
                type="text"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="输入学号或姓名进行筛选"
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-gray-50 border border-gray-100 rounded-lg p-4 flex items-center space-x-3">
            <FileText className="w-8 h-8 text-gray-600" />
            <div>
              <p className="text-sm text-gray-600">班级总人数</p>
              <p className="text-xl font-semibold text-gray-900">
                {reports.length}
              </p>
            </div>
          </div>
          <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 flex items-center space-x-3">
            <FileText className="w-8 h-8 text-blue-600" />
            <div>
              <p className="text-sm text-gray-600">已提交</p>
              <p className="text-xl font-semibold text-gray-900">
                {submittedReports.length}
              </p>
            </div>
          </div>
          <div className="bg-red-50 border border-red-100 rounded-lg p-4 flex items-center space-x-3">
            <FileText className="w-8 h-8 text-red-600" />
            <div>
              <p className="text-sm text-gray-600">未提交</p>
              <p className="text-xl font-semibold text-gray-900">
                {unsubmittedReports.length}
              </p>
            </div>
          </div>
          <div className="bg-yellow-50 border border-yellow-100 rounded-lg p-4 flex items-center space-x-3">
            <MessageCircle className="w-8 h-8 text-yellow-600" />
            <div>
              <p className="text-sm text-gray-600">待评阅</p>
              <p className="text-xl font-semibold text-gray-900">
                {pendingReports.length}
              </p>
            </div>
          </div>
          <div className="bg-green-50 border border-green-100 rounded-lg p-4 flex items-center space-x-3">
            <Star className="w-8 h-8 text-green-600" />
            <div>
              <p className="text-sm text-gray-600">已评阅</p>
              <p className="text-xl font-semibold text-gray-900">
                {reviewedReports.length}
              </p>
            </div>
          </div>
          <div className="bg-purple-50 border border-purple-100 rounded-lg p-4 flex items-center space-x-3">
            <Star className="w-8 h-8 text-purple-600" />
            <div>
              <p className="text-sm text-gray-600">平均分</p>
              <p className="text-xl font-semibold text-gray-900">
                {averageScore}
              </p>
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

      <div className="bg-white rounded-lg shadow-md">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">实验报告列表</h2>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2 text-sm text-gray-500">
              <FileText size={16} />
              <span>共 {filteredReports.length} 条记录</span>
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
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  序号
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  姓名
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  学号
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  文件名
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  提交时间
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  状态
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  分数
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  操作
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {tableBody}
            </tbody>
          </table>
        </div>
      </div>

      <Modal
        isOpen={showReviewModal}
        onClose={resetReviewState}
        title="评阅报告"
        size="fullscreen"
      >
        {selectedReport && (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-full">
            {/* PDF Preview Area */}
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

            {/* Review Controls Area */}
            <div className="lg:col-span-1 space-y-6 bg-gray-50 p-6 rounded-lg border border-gray-200 overflow-y-auto">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="font-medium text-gray-900">
                    {selectedReport.full_name}
                  </h3>
                  <p className="text-sm text-gray-600">
                    ({selectedReport.username})
                  </p>
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

              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <h4 className="text-lg font-semibold text-blue-900 mb-2">
                  评阅操作
                </h4>
                <p className="text-sm text-blue-700">
                  请仔细查看左侧内容后进行评分或填写反馈。
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    分数 (0-100)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={tempScore}
                    onChange={(event) => setTempScore(event.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg"
                    placeholder="请输入分数"
                  />
                  {!isScoreValid && (
                    <p className="mt-1 text-sm text-red-600">
                      分数需在 0-100 之间。
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    评语
                  </label>
                  <textarea
                    value={tempComments}
                    onChange={(event) => setTempComments(event.target.value)}
                    rows={8}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                    placeholder="请输入评语..."
                  />
                </div>
              </div>

              <div className="flex flex-col space-y-3 pt-4 border-t border-gray-200">
                <Button
                  onClick={handleSaveReview}
                  className="w-full bg-green-600 hover:bg-green-700 text-white py-3"
                  disabled={!canSubmitReview}
                >
                  <Star size={18} className="mr-2" />
                  {isSubmittingReview ? "保存中..." : "保存评阅结果"}
                </Button>
                <Button
                  variant="outline"
                  onClick={resetReviewState}
                  className="w-full py-3"
                >
                  取消
                </Button>
              </div>
            </div>
          </div>
        )}
      </Modal>

      <Toast
        message={toast.message}
        type={toast.type}
        isVisible={toast.isVisible}
        onClose={toast.hideToast}
      />
    </div>
  );
};

export default ExperimentReports;
