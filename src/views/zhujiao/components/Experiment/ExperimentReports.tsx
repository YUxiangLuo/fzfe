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

  const [assistantId, setAssistantId] = useState<number | null>(null);
  const [isLoadingClasses, setIsLoadingClasses] = useState(true);
  const [isLoadingReports, setIsLoadingReports] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [showReviewModal, setShowReviewModal] = useState(false);
  const [selectedReport, setSelectedReport] = useState<ExperimentReport | null>(
    null,
  );

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

  const resetViewState = () => {
    setShowReviewModal(false);
    setSelectedReport(null);
  };

  const handleReview = (report: ExperimentReport) => {
    setSelectedReport(report);
    setShowReviewModal(true);
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
    if (report.report_id === null) {
      return { text: "未提交", className: "bg-gray-100 text-gray-500" };
    }
    if (report.grade !== null && report.grade !== undefined) {
      return { text: "已评阅", className: "bg-green-100 text-green-800" };
    }
    return { text: "待评阅", className: "bg-yellow-100 text-yellow-800" };
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
        <tr key={report.student_id} className="hover:bg-gray-50">
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
                disabled={!report.report_id}
                className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-all duration-200 shadow-sm hover:shadow-md disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                <FileText size={16} className="mr-2" />
                查看
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
        onClose={resetViewState}
        title="查看报告"
        size="fullscreen"
      >
        {selectedReport && (
          <div className="h-full flex flex-col">
            <div className="flex-shrink-0 p-4 bg-gray-50 rounded-lg border border-gray-200 mb-4 flex justify-between items-center">
              <div>
                <h3 className="font-medium text-gray-900">
                  {selectedReport.student_full_name} ({selectedReport.student_username})
                </h3>
                <p className="text-sm text-gray-600">
                  {extractFileName(selectedReport.pdf_file_path)}
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
            <div className="flex-1 h-full bg-gray-100 rounded-lg border border-gray-200">
              {selectedReport.pdf_file_path ? (
                <embed
                  src={buildDownloadUrl(selectedReport.pdf_file_path)}
                  type="application/pdf"
                  width="100%"
                  height="100%"
                />
              ) : (
                <div className="h-full flex items-center justify-center text-center text-gray-500">
                  <div>
                    <FileText className="w-12 h-12 mx-auto mb-2" />
                    <p>该报告没有可预览的文件。</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default ExperimentReports;
