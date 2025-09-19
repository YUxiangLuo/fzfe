import React, { useEffect, useMemo, useState } from "react";
import {
  FileText,
  Download,
  Star,
  MessageCircle,
  Loader,
  AlertTriangle,
} from "lucide-react";
import type { Class, ExperimentReport } from "../../types";
import Modal from "../Common/Modal";
import Button from "../Common/Button";
import { apiClient } from "../../../../utils/apiClient";
import { decodeToken } from "../../../../utils/auth";
import { DOWNLOAD_SERVER_BASE_URL } from "../../../../config/appConfig";

const extractFileName = (filePath: string | null) => {
  if (!filePath) return "在线填写";
  const parts = filePath.split(/[\\/]/);
  return parts[parts.length - 1] || filePath;
};

const buildDownloadUrl = (filePath: string) => {
  const filename = filePath.split("/").pop();
  return `${DOWNLOAD_SERVER_BASE_URL}/reports/${filename}`;
};

const ExperimentReports: React.FC = () => {
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
  const [selectedReport, setSelectedReport] = useState<ExperimentReport | null>(
    null,
  );
  const [tempScore, setTempScore] = useState("");
  const [tempComments, setTempComments] = useState("");
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

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
    const handler = window.setTimeout(() => {
      setDebouncedSearchTerm(searchTerm.trim());
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

  const reviewedReports = useMemo(
    () =>
      reports.filter(
        (report) => report.grade !== null && report.grade !== undefined,
      ),
    [reports],
  );

  const pendingReports = useMemo(
    () =>
      reports.filter(
        (report) => report.grade === null || report.grade === undefined,
      ),
    [reports],
  );

  const filteredReports = useMemo(() => {
    const query = debouncedSearchTerm.toLowerCase();
    if (!query) return reports;
    return reports.filter(
      (report) =>
        report.student_full_name.toLowerCase().includes(query) ||
        report.student_username.toLowerCase().includes(query),
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

  const handleReview = (report: ExperimentReport) => {
    setSelectedReport(report);
    setTempScore(
      report.grade !== null && report.grade !== undefined
        ? String(report.grade)
        : "",
    );
    setTempComments(report.feedback ?? "");
    setShowReviewModal(true);
  };

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
    if (!selectedReport) return;

    const payload: { grade?: number; feedback?: string } = {};
    if (tempScore.trim()) {
      const gradeValue = Number(tempScore);
      if (Number.isNaN(gradeValue) || gradeValue < 0 || gradeValue > 100) {
        alert("请填写 0-100 之间的分数");
        return;
      }
      payload.grade = gradeValue;
    }
    if (tempComments.trim()) {
      payload.feedback = tempComments.trim();
    }

    if (payload.grade === undefined && payload.feedback === undefined) {
      alert("请至少填写分数或评语");
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
          report.report_id === selectedReport.report_id
            ? { ...(updatedReport as ExperimentReport) }
            : report,
        ),
      );
      resetReviewState();
    } catch (err: any) {
      alert(err.message || "保存评阅结果失败");
    } finally {
      setIsSubmittingReview(false);
    }
  };

  const handleDownload = (report: ExperimentReport) => {
    if (!report.pdf_file_path) {
      alert("该报告暂未提供可下载的文件。");
      return;
    }

    const url = buildDownloadUrl(report.pdf_file_path);
    window.open(url, "_blank");
  };

  const handleClassChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedClassId(event.target.value);
  };

  const getStatusMeta = (report: ExperimentReport) => {
    if (report.grade !== null && report.grade !== undefined) {
      return { text: "已评阅", className: "bg-green-100 text-green-800" };
    }
    if (report.submitted_at) {
      return { text: "待评阅", className: "bg-yellow-100 text-yellow-800" };
    }
    return { text: "未提交", className: "bg-gray-100 text-gray-500" };
  };

  const renderReportsRows = () => {
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
      const submittedAt = report.submitted_at
        ? new Date(report.submitted_at).toLocaleString("zh-CN")
        : "—";
      return (
        <tr key={report.report_id} className="hover:bg-gray-50">
          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
            {index + 1}
          </td>
          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
            {report.student_full_name}
          </td>
          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
            {report.student_username}
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
                className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-all duration-200 shadow-sm hover:shadow-md"
              >
                <Star size={16} className="mr-2" />
                评阅
              </button>
              <button
                onClick={() => handleDownload(report)}
                className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                <Download size={16} className="mr-1" />
                下载
              </button>
            </div>
          </td>
        </tr>
      );
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between md:space-x-6 space-y-3 md:space-y-0">
        <h1 className="text-2xl font-bold text-gray-900">实验报告</h1>
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
            <input
              type="text"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="输入学号或姓名进行筛选"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 flex items-center space-x-3">
            <FileText className="w-8 h-8 text-blue-600" />
            <div>
              <p className="text-sm text-gray-600">总报告数</p>
              <p className="text-xl font-semibold text-gray-900">
                {reports.length}
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
          <div className="bg-yellow-50 border border-yellow-100 rounded-lg p-4 flex items-center space-x-3">
            <MessageCircle className="w-8 h-8 text-yellow-600" />
            <div>
              <p className="text-sm text-gray-600">待评阅</p>
              <p className="text-xl font-semibold text-gray-900">
                {pendingReports.length}
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
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">实验报告列表</h2>
        </div>
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
              {renderReportsRows()}
            </tbody>
          </table>
        </div>
      </div>

      <Modal
        isOpen={showReviewModal}
        onClose={resetReviewState}
        title="评阅报告"
        size="large"
      >
        {selectedReport && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-[600px]">
            <div className="space-y-4">
              <div className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
                <div>
                  <h3 className="font-medium text-gray-900">
                    {selectedReport.student_full_name} (
                    {selectedReport.student_username})
                  </h3>
                  <p className="text-sm text-gray-600">
                    {extractFileName(selectedReport.pdf_file_path)}
                  </p>
                </div>
                <Button
                  onClick={() => handleDownload(selectedReport)}
                  variant="outline"
                  size="sm"
                >
                  <Download size={16} className="mr-1" />
                  下载
                </Button>
              </div>
              <div className="h-96 bg-gray-100 rounded-lg flex items-center justify-center border-2 border-dashed border-gray-300">
                <div className="text-center">
                  <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500 font-medium">PDF 文档预览</p>
                  <p className="text-sm text-gray-400 mt-2">
                    实际系统中此处会显示 PDF 预览内容
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-6">
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
                    rows={6}
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
    </div>
  );
};

export default ExperimentReports;
