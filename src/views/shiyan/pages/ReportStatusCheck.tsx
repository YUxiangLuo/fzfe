import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, FileText, RefreshCw, Loader2, Clock, Hash } from 'lucide-react';
import { apiClient } from '../../../utils/apiClient';
import { createAuthObjectUrl } from '../../../utils/authFile';
import { useExperiment } from '../contexts/ExperimentContext.zustand';
import Button from '../shared/components/common/Button';

// 接口定义
interface ExperimentInfo {
  experiment_id: number;
  status: string;
  current_step: number;
  start_time: string;
  last_activity_at: string;
  completion_time: string;
}

interface ReportInfo {
  report_id: number;
  experiment_id: number;
  student_id: number;
  report_content: string;
  pdf_file_path: string;
  status: 'rejected' | 'submitted' | 'graded';
  submitted_at: string;
  grade: number | null;
  feedback: string | null;
  graded_by: number;
}

interface ReportStatusResponse {
  is_rejected: boolean;
  experiment?: ExperimentInfo;
  report?: ReportInfo;
}

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const ReportStatusCheck: React.FC = () => {
  const navigate = useNavigate();
  const { createNewExperiment, setIsSubmitting } = useExperiment();
  
  const [loading, setLoading] = useState(true);
  const [statusData, setStatusData] = useState<ReportStatusResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isRestarting, setIsRestarting] = useState(false);
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null);
  const previewUrlRef = useRef<string | null>(null);

  useEffect(() => {
    const checkStatus = async () => {
      try {
        const response = await apiClient.get<ReportStatusResponse>('/my-latest-report-status');
        
        if (!response.is_rejected) {
          // 如果未被驳回，直接跳转到介绍页
          navigate('/introduction', { replace: true });
        } else {
          // 如果被驳回，显示详情
          setStatusData(response);
          setLoading(false);
        }
      } catch (err: any) {
        // 如果接口报错，为安全起见，也跳转到介绍页，或者显示错误
        // 这里选择显示错误以便调试，或者您可以选择 console.error 后跳转
        console.error("Failed to check report status:", err);
        setError("无法获取报告状态，请稍后重试。");
        setLoading(false);
      }
    };

    checkStatus();
  }, [navigate]);

  useEffect(() => {
    const loadPreview = async () => {
      const filePath = statusData?.report?.pdf_file_path;
      if (!filePath) {
        setPdfPreviewUrl((prev) => {
          if (prev) URL.revokeObjectURL(prev);
          return null;
        });
        previewUrlRef.current = null;
        return;
      }

      try {
        const objectUrl = await createAuthObjectUrl(filePath);
        setPdfPreviewUrl((prev) => {
          if (prev) URL.revokeObjectURL(prev);
          return objectUrl;
        });
        previewUrlRef.current = objectUrl;
      } catch (err) {
        console.error("Failed to load report preview:", err);
        setPdfPreviewUrl((prev) => {
          if (prev) URL.revokeObjectURL(prev);
          return null;
        });
        previewUrlRef.current = null;
      }
    };

    loadPreview();
  }, [statusData?.report?.pdf_file_path]);

  useEffect(() => {
    return () => {
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
        previewUrlRef.current = null;
      }
    };
  }, []);

  const handleRestartExperiment = async () => {
    try {
      setIsRestarting(true);
      setIsSubmitting(true);
      
      // 创建新实验
      await createNewExperiment();
      
      // 跳转到行业选择（步骤1）
      navigate('/industry');
    } catch (err) {
      console.error("Failed to restart experiment:", err);
      // 即使失败也允许用户进入，可能在 introduction 页处理
      navigate('/introduction');
    } finally {
      setIsSubmitting(false);
      setIsRestarting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center">
        <Loader2 className="w-10 h-10 text-blue-600 animate-spin mb-4" />
        <p className="text-gray-600">正在检查实验状态...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-xl shadow-sm border border-red-100 max-w-md w-full text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-gray-900 mb-2">出错了</h3>
          <p className="text-gray-600 mb-6">{error}</p>
          <Button onClick={() => navigate('/introduction')} variant="outline">
            直接进入实验首页
          </Button>
        </div>
      </div>
    );
  }

  if (!statusData || !statusData.report || !statusData.experiment) {
    return null; // Should not happen given logic above
  }

  const { report, experiment } = statusData;

  return (
    <div className="h-screen bg-gray-50 p-6 md:p-8 overflow-hidden">
      <div className="max-w-[1600px] mx-auto h-full grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* 左侧：PDF 预览 */}
        <div className="lg:col-span-7 h-full">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-1 h-full flex flex-col">
            <div className="p-4 border-b border-gray-100 flex justify-between items-center flex-shrink-0">
              <h2 className="font-bold text-gray-800">原始报告预览</h2>
              {report.pdf_file_path && (
                <a
                  href={pdfPreviewUrl || '#'}
                  target="_blank"
                  rel="noreferrer"
                  className="text-blue-600 hover:text-blue-700 text-sm font-medium hover:underline"
                >
                  下载 PDF
                </a>
              )}
            </div>
            <div className="flex-1 bg-gray-100 rounded-b-lg overflow-hidden relative">
              {report.pdf_file_path ? (
                <iframe
                  src={pdfPreviewUrl || ''}
                  className="w-full h-full border-none"
                  title="Report PDF"
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center text-gray-400">
                  无法预览 PDF 文件
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 右侧：信息与操作 (可滚动) */}
        <div className="lg:col-span-5 h-full overflow-y-auto space-y-6 pr-2">
          {/* 警告栏 */}
          <div className="bg-red-50 border border-red-200 rounded-xl p-6 shadow-sm">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-red-100 rounded-full flex-shrink-0">
                <AlertCircle className="w-8 h-8 text-red-600" />
              </div>
              <div className="flex-1">
                <h1 className="text-2xl font-bold text-red-900 mb-2">
                  您的上一份实验报告已被驳回
                </h1>
                <p className="text-red-800 mb-4">
                  请仔细阅读下方的驳回原因和原始报告，然后点击底部按钮重新进行实验。
                  <br />
                  <span className="text-sm opacity-80">* 重新开始实验将创建一个新的实验记录，您之前的进度已归档。</span>
                </p>

                <div className="bg-white/80 border border-red-200 rounded-lg p-4">
                  <h3 className="text-sm font-bold text-red-900 mb-1 flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    教师评语 / 驳回原因：
                  </h3>
                  <p className="text-gray-800 text-base leading-relaxed">
                    {report.feedback || "无具体评语"}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* 实验信息 */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Hash className="w-5 h-5 text-gray-500" />
              被驳回的实验信息
            </h2>
            <div className="space-y-4">
              <div className="flex justify-between border-b border-gray-100 pb-3">
                <span className="text-gray-500">实验 ID</span>
                <span className="font-mono font-medium text-gray-900">{experiment.experiment_id}</span>
              </div>
              <div className="flex justify-between border-b border-gray-100 pb-3">
                <span className="text-gray-500">提交时间</span>
                <span className="font-medium text-gray-900">{formatDate(report.submitted_at)}</span>
              </div>
              <div className="flex justify-between border-b border-gray-100 pb-3">
                <span className="text-gray-500">状态</span>
                <span className="px-2 py-1 bg-red-100 text-red-700 text-xs font-bold rounded">已驳回</span>
              </div>
            </div>
          </div>

          {/* 操作区 */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">下一步操作</h2>
            <p className="text-sm text-gray-600 mb-6">
              您需要重新完成实验流程并提交新的报告。建议您在开始前保存或下载左侧的旧报告作为参考。
            </p>
            <Button
              onClick={handleRestartExperiment}
              isLoading={isRestarting}
              disabled={isRestarting}
              className="w-full h-12 text-lg shadow-lg hover:shadow-xl transition-all"
            >
              <RefreshCw className="w-5 h-5 mr-2" />
              重新进行实验
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReportStatusCheck;
