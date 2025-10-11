import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useExperiment } from "../contexts/ExperimentContext";
import { apiClient } from "../../../utils/apiClient";
import { DOWNLOAD_SERVER_BASE_URL } from "../../../config/appConfig";
import {
  BookOpen,
  Target,
  Users,
  Clock,
  Award,
  CheckCircle,
  Play,
  X,
  ArrowRight,
  ArrowLeft,
  Download,
  FileText,
  Loader2,
} from "lucide-react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

pdfjs.GlobalWorkerOptions.workerSrc = `${DOWNLOAD_SERVER_BASE_URL}/js/pdf.worker.min.mjs`;

interface Manual {
  file_name: string;
  file_path: string;
  description: string | null;
}

const Introduction: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { state: experimentState } = useExperiment();
  const [currentStep, setCurrentStep] = useState(0);
  const [manual, setManual] = useState<Manual | null>(null);
  const [loadingManual, setLoadingManual] = useState(true);

  // State for PDF viewer
  const [numPages, setNumPages] = useState<number | null>(null);
  const [pageNumber, setPageNumber] = useState(1);

  useEffect(() => {
    const fetchManual = async () => {
      try {
        setLoadingManual(true);
        const manualData = await apiClient.get("/manuals/active");
        setManual(manualData);
      } catch (error) {
        console.error("Failed to fetch experiment manual:", error);
        setManual({
          file_name: "默认实验手册.pdf",
          file_path: "",
          description: "无法加载实验手册，请联系管理员。",
        });
      } finally {
        setLoadingManual(false);
      }
    };
    fetchManual();
  }, []);

  const steps = [
    { id: 0, title: "实验概述", icon: BookOpen },
    { id: 1, title: "实验流程", icon: Target },
    { id: 2, title: "实验手册", icon: FileText },
  ];

  const fromState = location.state as { from?: string } | null;
  const rawFromPath = fromState?.from;
  const sanitizedFromPath =
    rawFromPath && !rawFromPath.startsWith("/introduction") ? rawFromPath : null;
  const returnPath = sanitizedFromPath ?? "/industry";
  const shouldReplaceOnReturn = Boolean(sanitizedFromPath);
  const isExperimentOngoing =
    experimentState.status !== "Not Started" ||
    experimentState.highest_completed_step > 0 ||
    experimentState.current_step > 1;

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      navigate(returnPath, { replace: shouldReplaceOnReturn });
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleExit = () => {
    navigate(returnPath, { replace: shouldReplaceOnReturn });
  };

  const getDownloadUrl = () => {
    if (!manual || !manual.file_path) return null;
    const filename = manual.file_path.split("/").pop();
    return `${DOWNLOAD_SERVER_BASE_URL}/manuals/${filename}`;
  };

  const handleDownloadPDF = () => {
    const downloadUrl = getDownloadUrl();
    if (downloadUrl) {
      window.open(downloadUrl, "_blank");
    }
  };

  function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
    setNumPages(numPages);
    setPageNumber(1);
  }

  function goToPrevPage() {
    setPageNumber((prev) => Math.max(prev - 1, 1));
  }

  function goToNextPage() {
    setPageNumber((prev) => Math.min(prev + 1, numPages || 1));
  }

  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return (
          <div className="space-y-8 animate-fade-in">
            <div className="text-center">
              <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
                面向企业多源需求融合预测的
                <br />
                <span className="text-blue-600">生产计划决策虚拟仿真系统</span>
              </h1>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                通过7个循序渐进的实验步骤，学习企业需求预测的核心理论与实践方法，掌握多种预测算法的应用场景与效果评估。
              </p>
            </div>
          </div>
        );

      case 1:
        return (
          <div className="space-y-8 animate-fade-in">
            <div className="text-center mb-8">
              <h2 className="text-4xl font-bold text-gray-900 mb-6">
                实验流程概览
              </h2>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                通过7个循序渐进的步骤，完整体验企业需求预测与生产计划决策的全过程
              </p>
            </div>
            <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100">
              <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-7 gap-4">
                {[
                  { step: 1, title: "选择行业", icon: "🏭" },
                  { step: 2, title: "选择企业", icon: "🏢" },
                  { step: 3, title: "选择产品", icon: "📱" },
                  { step: 4, title: "历史数据", icon: "📊" },
                  { step: 5, title: "预测模型", icon: "🤖" },
                  { step: 6, title: "结果评估", icon: "📈" },
                  { step: 7, title: "生产计划", icon: "📋" },
                ].map((item, index) => (
                  <div key={item.step} className="relative">
                    <div className="bg-gray-50 rounded-xl p-4 text-center hover:bg-blue-50 transition-colors">
                      <div className="text-3xl mb-3">{item.icon}</div>
                      <div className="text-xs font-medium text-blue-600 mb-2">
                        步骤 {item.step}
                      </div>
                      <div className="text-sm font-semibold text-gray-900">
                        {item.title}
                      </div>
                    </div>
                    {index < 6 && (
                      <div className="hidden lg:block absolute top-1/2 -right-2 w-4 h-0.5 bg-blue-300 transform -translate-y-1/2"></div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        );

      case 2:
        const downloadUrl = getDownloadUrl();
        return (
          <div className="space-y-8 animate-fade-in">
            <div className="text-center mb-12">
              <h2 className="text-4xl font-bold text-gray-900 mb-6">
                实验手册
              </h2>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                {loadingManual
                  ? "正在加载实验手册..."
                  : manual?.description ||
                    "详细的实验指导手册，包含理论知识、操作步骤和案例分析"}
              </p>
            </div>
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900">
                    {loadingManual ? "加载中..." : manual?.file_name}
                  </h3>
                  <button
                    onClick={handleDownloadPDF}
                    disabled={loadingManual || !downloadUrl}
                    className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400"
                  >
                    {loadingManual ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Download className="w-4 h-4" />
                    )}
                    <span>下载PDF</span>
                  </button>
                </div>
              </div>
              <div className="h-[60vh] bg-gray-100 flex items-center justify-center overflow-y-auto">
                {loadingManual ? (
                  <Loader2 className="w-10 h-10 text-gray-400 animate-spin" />
                ) : downloadUrl ? (
                  <Document
                    file={downloadUrl}
                    onLoadSuccess={onDocumentLoadSuccess}
                    loading={
                      <div className="flex items-center space-x-2 text-gray-600">
                        <Loader2 className="animate-spin" />
                        <span>加载PDF预览...</span>
                      </div>
                    }
                    error={
                      <div className="text-red-600">无法加载PDF文件。</div>
                    }
                  >
                    <Page pageNumber={pageNumber} />
                  </Document>
                ) : (
                  <div className="text-center text-red-600">
                    <FileText className="w-16 h-16 mx-auto mb-4" />
                    <p>无法获取实验手册文件。</p>
                  </div>
                )}
              </div>
              {numPages && (
                <div className="bg-gray-50 px-6 py-3 border-t border-gray-200 flex items-center justify-center space-x-4">
                  <button
                    onClick={goToPrevPage}
                    disabled={pageNumber <= 1}
                    className="px-4 py-2 bg-gray-200 rounded-lg disabled:opacity-50"
                  >
                    上一页
                  </button>
                  <p className="text-sm font-medium">
                    第 {pageNumber} 页 / 共 {numPages} 页
                  </p>
                  <button
                    onClick={goToNextPage}
                    disabled={pageNumber >= numPages}
                    className="px-4 py-2 bg-gray-200 rounded-lg disabled:opacity-50"
                  >
                    下一页
                  </button>
                </div>
              )}
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      <button
        onClick={handleExit}
        className="absolute top-6 right-6 p-2 text-gray-600 hover:text-gray-900 hover:bg-white rounded-lg transition-all z-10"
      >
        <X className="w-6 h-6" />
      </button>
      <div className="min-h-screen flex flex-col">
        <div className="bg-white border-b border-gray-200 px-8 pt-12 pb-4">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center justify-between mb-4">
              {steps.map((step, index) => {
                const Icon = step.icon;
                const isActive = index === currentStep;
                const isCompleted = index < currentStep;
                return (
                  <div key={step.id} className="flex items-center">
                    <div className="flex flex-col items-center">
                      <div
                        className={`w-12 h-12 rounded-full flex items-center justify-center border-2 transition-all ${isCompleted ? "bg-green-600 border-green-600 text-white" : isActive ? "bg-blue-600 border-blue-600 text-white" : "bg-gray-100 border-gray-300 text-gray-400"}`}
                      >
                        {isCompleted ? (
                          <CheckCircle className="w-6 h-6" />
                        ) : (
                          <Icon className="w-6 h-6" />
                        )}
                      </div>
                      <span
                        className={`mt-2 text-sm font-medium ${isActive ? "text-blue-600" : isCompleted ? "text-green-600" : "text-gray-500"}`}
                      >
                        {step.title}
                      </span>
                    </div>
                    {index < steps.length - 1 && (
                      <div
                        className={`flex-1 h-0.5 mx-4 ${index < currentStep ? "bg-green-600" : "bg-gray-300"}`}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="max-w-6xl mx-auto w-full">{renderStepContent()}</div>
        </div>
        <div className="bg-white border-t border-gray-200 px-8 py-6">
          <div className="max-w-6xl mx-auto flex justify-between items-center">
            <button
              onClick={handlePrev}
              disabled={currentStep === 0}
              className={`flex items-center space-x-2 px-6 py-3 rounded-lg font-medium transition-all ${currentStep === 0 ? "bg-gray-100 text-gray-400 cursor-not-allowed" : "bg-gray-200 text-gray-700 hover:bg-gray-300"}`}
            >
              <ArrowLeft className="w-5 h-5" />
              <span>上一步</span>
            </button>
            <span className="text-sm text-gray-500">
              {currentStep + 1} / {steps.length}
            </span>
            <button
              onClick={handleNext}
              className="flex items-center space-x-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-md transition-all font-medium"
            >
              <span>
                {currentStep === steps.length - 1
                  ? isExperimentOngoing
                    ? "返回实验"
                    : "开始实验"
                  : "下一步"}
              </span>
              {currentStep === steps.length - 1 ? (
                isExperimentOngoing ? (
                  <ArrowLeft className="w-5 h-5" />
                ) : (
                  <Play className="w-5 h-5" />
                )
              ) : (
                <ArrowRight className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Introduction;
