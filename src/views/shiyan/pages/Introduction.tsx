import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useExperiment } from "../contexts/ExperimentContext.zustand";
import { apiClient } from "../../../utils/apiClient";
import { useAuthObjectUrl } from "../../../hooks/useAuthObjectUrl";
import {
  BookOpen,
  Target,
  CheckCircle,
  Play,
  ArrowRight,
  ArrowLeft,
  FileText,
  Loader2,
  Factory,
  Building,
  Package,
  Database,
  Brain,
  LineChart,
  ClipboardList,
  LogOut, // Added LogOut icon
} from "lucide-react";
import Button from '../shared/components/common/Button';
import { useConfirm } from "../shared/contexts/ConfirmContext";
import { clearSessionAndRedirect } from "../../../utils/session";

interface Manual {
  file_name: string;
  file_path: string;
}

const TOTAL_EXPERIMENT_STEPS = 7;

// 实验步骤路由映射
const STEP_ROUTES: Record<number, string> = {
  1: "/industry",
  2: "/company",
  3: "/product",
  4: "/data",
  5: "/model",
  6: "/evaluation",
  7: "/production",
  8: "/report",
};

// 导航步骤配置
const NAVIGATION_STEPS = [
  { id: 0, title: "实验概述", icon: BookOpen },
  { id: 1, title: "实验流程", icon: Target },
  { id: 2, title: "实验手册", icon: FileText },
];

// 实验流程步骤配置
const EXPERIMENT_STEPS = [
  { step: 1, title: "选择行业", icon: Factory },
  { step: 2, title: "选择企业", icon: Building },
  { step: 3, title: "选择产品", icon: Package },
  { step: 4, title: "历史数据", icon: Database },
  { step: 5, title: "需求预测", icon: Brain },
  { step: 6, title: "结果评估", icon: LineChart },
  { step: 7, title: "生产计划", icon: ClipboardList },
];

const Introduction: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { state: experimentState, ui, createNewExperiment, setIsSubmitting } = useExperiment();
  const [currentStep, setCurrentStep] = useState(0);
  const [manual, setManual] = useState<Manual | null>(null);
  const [showResumeDialog, setShowResumeDialog] = useState(false);
  const manualPdfUrl = useAuthObjectUrl(manual?.file_path);
  const { confirm } = useConfirm();

  useEffect(() => {
    const fetchManual = async () => {
      try {
        const manualData = await apiClient.get<Manual>("/manuals/active");
        setManual(manualData);
      } catch (error) {
        console.error("Failed to fetch experiment manual:", error);
        setManual({
          file_name: "默认实验手册.pdf",
          file_path: "",
        });
      }
    };
    fetchManual();
  }, []);

  // Logout function
  const handleLogout = async () => {
    const isConfirmed = await confirm({
      title: "确认退出",
      message: "您确定要退出系统吗？",
      confirmText: "退出",
      cancelText: "取消",
      variant: "danger",
    });

    if (!isConfirmed) return;

    clearSessionAndRedirect();
  };

  // Logout function
  const handleLogoutNoConfirm = async () => {
    clearSessionAndRedirect();
  };

  // 计算返回路径
  const fromState = location.state as { from?: string } | null;
  const fromPath = fromState?.from;
  const isFromIntroduction = fromPath?.startsWith("/introduction");

  // 判断实验状态
  const hasStartTime = experimentState.start_time !== null;
  const isFromExperiment = fromPath !== undefined && !isFromIntroduction;

  // 开始新实验
  const startNewExperiment = async () => {
    try {
      setIsSubmitting(true);
      await createNewExperiment();
      navigate("/industry");
    } catch (error) {
      console.error("Failed to create experiment:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // 继续实验
  const continueExperiment = () => {
    const targetRoute =
      STEP_ROUTES[experimentState.current_step] || "/industry";
    navigate(targetRoute);
  };

  const handleNext = () => {
    if (currentStep < NAVIGATION_STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      // 在最后一步，处理"开始实验/继续实验/回到实验"逻辑
      if (!hasStartTime) {
        // 情况1: start_time 为 null，开始新实验
        startNewExperiment();
      } else if (!isFromExperiment) {
        // 情况2: start_time 不为 null 且 fromPath 为 undefined（刚登录）
        setShowResumeDialog(true);
      } else {
        // 情况3: start_time 不为 null 且 fromPath 不为 undefined（从实验中来的）
        navigate(fromPath);
      }
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  // 获取按钮文本
  const getButtonLabel = () => {
    if (currentStep < NAVIGATION_STEPS.length - 1) {
      return "下一步";
    }
    if (isFromExperiment) {
      return "回到实验";
    }
    return "开始实验";
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return (
          <div className="text-center animate-fade-in">
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
              面向企业多源需求融合预测的
              <br />
              <span className="text-blue-600">生产计划决策虚拟仿真系统</span>
            </h1>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              通过7个循序渐进的实验步骤，学习企业需求预测的核心理论与实践方法，掌握多种预测算法的应用场景与效果评估。
            </p>
          </div>
        );

      case 1:
        return (
          <div className="space-y-8 animate-fade-in">
            <div className="text-center">
              <h2 className="text-4xl font-bold text-gray-900 mb-6">
                实验流程概览
              </h2>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                通过7个循序渐进的步骤，完整体验企业需求预测与生产计划决策的全过程
              </p>
            </div>
            <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100">
              <div className="grid grid-cols-1 md:grid-cols-7 gap-4">
                {EXPERIMENT_STEPS.map((item, index) => {
                  const Icon = item.icon;
                  return (
                    <div key={item.step} className="relative">
                      <div className="bg-gray-50 rounded-xl p-4 text-center hover:bg-blue-50 transition-colors">
                        <div className="flex justify-center mb-3">
                          <Icon className="w-8 h-8 text-blue-600" />
                        </div>
                        <div className="text-xs font-medium text-blue-600 mb-2">
                          步骤 {item.step}
                        </div>
                        <div className="text-sm font-semibold text-gray-900">
                          {item.title}
                        </div>
                      </div>
                      {index < EXPERIMENT_STEPS.length - 1 && (
                        <div className="hidden md:block absolute top-1/2 -right-2 w-4 h-0.5 bg-blue-300 -translate-y-1/2"></div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        );

      case 2:
        return manualPdfUrl ? (
          <iframe
            src={manualPdfUrl}
            className="w-full h-full border-0"
            title="实验手册 PDF 预览"
          />
        ) : (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-10 h-10 text-gray-400 animate-spin" />
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      <div className="h-full flex flex-col">
        <div className="relative bg-white border-b border-gray-200 px-8 pt-12 pb-4"> {/* Added relative to parent for absolute positioning */}
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center justify-between mb-4">
              {NAVIGATION_STEPS.map((step, index) => {
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
                    {index < NAVIGATION_STEPS.length - 1 && (
                      <div
                        className={`flex-1 h-0.5 mx-4 ${index < currentStep ? "bg-green-600" : "bg-gray-300"}`}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
          {/* Top-right logout button */}
          <button
            onClick={handleLogout}
            className="absolute top-4 right-8 p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            title="退出登录"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
        <div
          className={`flex-1 ${currentStep === 2 ? "" : "flex items-center justify-center p-8"}`}
        >
          {currentStep === 2 ? (
            renderStepContent()
          ) : (
            <div className="max-w-6xl mx-auto w-full">
              {renderStepContent()}
            </div>
          )}
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
              {currentStep + 1} / {NAVIGATION_STEPS.length}
            </span>
            <Button
                  onClick={handleNext}
                  isLoading={ui.isSubmitting}
                  size="lg"
              >
                <span>{getButtonLabel()}</span>
                {currentStep === NAVIGATION_STEPS.length - 1 ? (
                  <Play className="w-5 h-5" />
                ) : (
                  <ArrowRight className="w-5 h-5" />
                )}
            </Button>
          </div>
        </div>
      </div>

      {/* 继续实验/开始新实验弹窗 */}
      {showResumeDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 overflow-hidden">
            <div className="bg-gradient-to-r from-blue-500 to-indigo-600 px-6 py-5">
              <h3 className="text-2xl font-bold text-white">
                检测到未完成的实验
              </h3>
            </div>
            <div className="p-6">
              <p className="text-gray-600 mb-4">
                我们检测到您有一个未完成的实验。您想继续之前的实验，还是开始一个新的实验？
              </p>

              {/* 实验信息 */}
              <div className="bg-gray-50 rounded-lg p-4 mb-6 space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">开始时间：</span>
                  <span className="font-medium text-gray-900">
                    {experimentState.start_time
                      ? new Date(experimentState.start_time).toLocaleString(
                          "zh-CN",
                          {
                            year: "numeric",
                            month: "2-digit",
                            day: "2-digit",
                            hour: "2-digit",
                            minute: "2-digit",
                          },
                        )
                      : "—"}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">最近活跃：</span>
                  <span className="font-medium text-gray-900">
                    {experimentState.last_activity_at
                      ? new Date(
                          experimentState.last_activity_at,
                        ).toLocaleString("zh-CN", {
                          year: "numeric",
                          month: "2-digit",
                          day: "2-digit",
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : "—"}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">当前进度：</span>
                  <span className="font-medium text-gray-900">
                    步骤 {experimentState.current_step} /{" "}
                    {TOTAL_EXPERIMENT_STEPS}
                  </span>
                </div>
              </div>

              <div className="flex flex-col gap-3">
                <button
                  onClick={() => {
                    setShowResumeDialog(false);
                    continueExperiment();
                  }}
                  className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors"
                >
                  继续未完成的实验
                </button>
                <button
                  onClick={() => {
                    setShowResumeDialog(false);
                    startNewExperiment();
                  }}
                  className="w-full px-6 py-3 bg-white text-gray-700 border-2 border-gray-300 rounded-lg hover:bg-gray-50 font-medium transition-colors"
                >
                  开始新的实验
                </button>
                {/* Logout button in the resume dialog */}
                <button
                  onClick={handleLogoutNoConfirm}
                  className="w-full px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium transition-colors mt-3"
                >
                  退出系统
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Introduction;
