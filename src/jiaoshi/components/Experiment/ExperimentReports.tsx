import React, { useState } from "react";
import {
  FileText,
  Download,
  Eye,
  Star,
  MessageCircle,
  Download as DownloadIcon,
} from "lucide-react";
import type { ExperimentReport } from "../../types";
import Modal from "../Common/Modal";
import Button from "../Common/Button";

const ExperimentReports: React.FC = () => {
  const [reports, setReports] = useState<ExperimentReport[]>([
    {
      id: "1",
      studentId: "2022001",
      studentName: "张三",
      fileName: "张三_实验报告_2024030.pdf",
      submittedAt: "2024-03-01 15:30:00",
      status: "unreviewed",
    },
    {
      id: "2",
      studentId: "2022002",
      studentName: "李四",
      fileName: "李四_实验报告_20240302.pdf",
      submittedAt: "2024-03-02 10:45:00",
      status: "reviewed",
      score: 88,
      comments: "实验步骤清晰，数据分析较为准确，但结论部分需要更深入的思考。",
    },
    {
      id: "3",
      studentId: "2023001",
      studentName: "王五",
      fileName: "王五_实验报告_20240303.pdf",
      submittedAt: "2024-03-03 14:20:00",
      status: "reviewed",
      score: 92,
      comments: "优秀的实验报告，分析透彻，结论合理。",
    },
  ]);

  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [showScoreModal, setShowScoreModal] = useState(false);
  const [selectedReport, setSelectedReport] = useState<ExperimentReport | null>(
    null,
  );
  const [tempScore, setTempScore] = useState("");
  const [tempComments, setTempComments] = useState("");

  const handlePreview = (report: ExperimentReport) => {
    setSelectedReport(report);
    setShowPreviewModal(true);
  };

  const handleScoring = (report: ExperimentReport) => {
    setSelectedReport(report);
    setTempScore(report.score?.toString() || "");
    setTempComments(report.comments || "");
    setShowScoreModal(true);
  };

  const handleSaveScore = () => {
    if (!selectedReport) return;

    setReports((prev) =>
      prev.map((report) =>
        report.id === selectedReport.id
          ? {
              ...report,
              score: parseInt(tempScore),
              comments: tempComments,
              status: "reviewed" as const,
            }
          : report,
      ),
    );
    setShowScoreModal(false);
    setSelectedReport(null);
    setTempScore("");
    setTempComments("");
  };

  const handleDownload = (fileName: string) => {
    // 模拟文件下载
    alert(`正在下载文件: ${fileName}`);
  };

  const handleBatchReject = () => {
    const unreviewed = reports.filter((r) => r.status === "unreviewed");
    if (unreviewed.length === 0) {
      alert("没有待评阅的报告");
      return;
    }
    alert(`已批量驳回 ${unreviewed.length} 份未评阅的报告`);
  };

  const handleExportList = () => {
    alert("正在导出报告列表...");
  };

  const handleExportContent = () => {
    alert("正在导出报告内容...");
  };

  const getStatusColor = (status: string) => {
    return status === "reviewed"
      ? "bg-green-100 text-green-800"
      : "bg-yellow-100 text-yellow-800";
  };

  const getStatusText = (status: string) => {
    return status === "reviewed" ? "已评阅" : "未评阅";
  };

  const getScoreColor = (score?: number) => {
    if (!score) return "";
    if (score >= 90) return "text-green-600";
    if (score >= 80) return "text-blue-600";
    if (score >= 70) return "text-yellow-600";
    return "text-red-600";
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">实验报告</h1>
      </div>

      {/* 统计信息 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center">
            <FileText className="w-8 h-8 text-blue-600 mr-3" />
            <div>
              <p className="text-sm text-gray-600">总报告数</p>
              <p className="text-2xl font-bold text-gray-900">
                {reports.length}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center">
            <Star className="w-8 h-8 text-green-600 mr-3" />
            <div>
              <p className="text-sm text-gray-600">已评阅</p>
              <p className="text-2xl font-bold text-gray-900">
                {reports.filter((r) => r.status === "reviewed").length}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center">
            <MessageCircle className="w-8 h-8 text-yellow-600 mr-3" />
            <div>
              <p className="text-sm text-gray-600">未评阅</p>
              <p className="text-2xl font-bold text-gray-900">
                {reports.filter((r) => r.status === "unreviewed").length}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center">
            <Star className="w-8 h-8 text-purple-600 mr-3" />
            <div>
              <p className="text-sm text-gray-600">平均分</p>
              <p className="text-2xl font-bold text-gray-900">
                {Math.round(
                  reports
                    .filter((r) => r.score)
                    .reduce((sum, r) => sum + (r.score || 0), 0) /
                    reports.filter((r) => r.score).length,
                ) || "--"}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 报告列表 */}
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
              {reports.map((report, index) => (
                <tr key={report.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {index + 1}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {report.studentName}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {report.studentId}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    <button
                      onClick={() => handlePreview(report)}
                      className="text-blue-600 hover:text-blue-800 hover:underline"
                    >
                      {report.fileName}
                    </button>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {report.submittedAt}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 py-1 text-xs rounded-full ${getStatusColor(report.status)}`}
                    >
                      {getStatusText(report.status)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {report.score ? (
                      <span
                        className={`font-medium ${getScoreColor(report.score)}`}
                      >
                        {report.score}分
                      </span>
                    ) : (
                      <span className="text-gray-400">--</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handlePreview(report)}
                        className="text-blue-600 hover:text-blue-800"
                        title="预览"
                      >
                        <Eye size={16} />
                      </button>
                      <button
                        onClick={() => handleDownload(report.fileName)}
                        className="text-green-600 hover:text-green-800"
                        title="下载"
                      >
                        <Download size={16} />
                      </button>
                      <button
                        onClick={() => handleScoring(report)}
                        className="text-orange-600 hover:text-orange-800"
                        title="评分"
                      >
                        <Star size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 批量操作 */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex flex-wrap gap-3">
          <Button
            onClick={handleBatchReject}
            variant="outline"
            className="border-red-300 text-red-700 hover:bg-red-50"
          >
            批量驳回
          </Button>
          <Button
            onClick={handleExportList}
            variant="outline"
            className="border-blue-300 text-blue-700 hover:bg-blue-50"
          >
            <DownloadIcon size={16} className="mr-2" />
            导出报告列表
          </Button>
          <Button
            onClick={handleExportContent}
            variant="outline"
            className="border-green-300 text-green-700 hover:bg-green-50"
          >
            <DownloadIcon size={16} className="mr-2" />
            导出报告内容
          </Button>
        </div>
      </div>

      {/* 预览模态框 */}
      <Modal
        isOpen={showPreviewModal}
        onClose={() => setShowPreviewModal(false)}
        title="实验报告预览"
        size="large"
      >
        {selectedReport && (
          <div className="space-y-4">
            <div className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
              <div>
                <h3 className="font-medium text-gray-900">
                  {selectedReport.fileName}
                </h3>
                <p className="text-sm text-gray-600">
                  {selectedReport.studentName} ({selectedReport.studentId})
                </p>
              </div>
              <Button
                onClick={() => handleDownload(selectedReport.fileName)}
                variant="outline"
                size="sm"
              >
                <Download size={16} className="mr-1" />
                下载
              </Button>
            </div>
            <div className="h-96 bg-gray-100 rounded-lg flex items-center justify-center">
              <div className="text-center">
                <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">PDF 文档预览</p>
                <p className="text-sm text-gray-400 mt-2">
                  实际系统中此处会显示 PDF 预览内容
                </p>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* 评分模态框 */}
      <Modal
        isOpen={showScoreModal}
        onClose={() => {
          setShowScoreModal(false);
          setSelectedReport(null);
          setTempScore("");
          setTempComments("");
        }}
        title="评阅报告"
      >
        {selectedReport && (
          <div className="space-y-4">
            <div className="p-4 bg-gray-50 rounded-lg">
              <h3 className="font-medium text-gray-900">
                {selectedReport.fileName}
              </h3>
              <p className="text-sm text-gray-600">
                {selectedReport.studentName} ({selectedReport.studentId})
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                分数 (0-100分)
              </label>
              <input
                type="number"
                min="0"
                max="100"
                value={tempScore}
                onChange={(e) => setTempScore(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="请输入分数"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                评语
              </label>
              <textarea
                value={tempComments}
                onChange={(e) => setTempComments(e.target.value)}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                placeholder="请输入评语..."
              />
            </div>
            <div className="flex justify-end space-x-3 pt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setShowScoreModal(false);
                  setSelectedReport(null);
                  setTempScore("");
                  setTempComments("");
                }}
              >
                取消
              </Button>
              <Button onClick={handleSaveScore}>保存评阅</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default ExperimentReports;
