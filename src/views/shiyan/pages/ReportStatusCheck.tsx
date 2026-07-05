import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, CheckCircle, FileText, Home, Hourglass, RefreshCw, Loader2, Hash } from 'lucide-react';
import { apiClient } from '../../../utils/apiClient';
import { useAuthObjectUrl } from '../../../hooks/useAuthObjectUrl';
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
  pdf_file_path: string | null;
  status: 'rejected' | 'submitted' | 'graded';
  submitted_at: string;
  grade: number | null;
  feedback: string | null;
  graded_by: number | null;
}

interface ReportStatusResponse {
  is_rejected: boolean;
  has_report?: boolean;
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

const FALLBACK_REPORT_STATUS_ERROR = '无法获取报告状态，请稍后重试。';

const getSafeReportStatusError = (_error: unknown): string => {
  return FALLBACK_REPORT_STATUS_ERROR;
};

const formatScore = (score: number | null) => {
  if (score === null || score === undefined) return '未记录';
  return Number.isInteger(score) ? String(score) : score.toFixed(1);
};

const ReportStatusCheck: React.FC = () => {
  const navigate = useNavigate();
  const { createNewExperiment, setIsSubmitting } = useExperiment();
  
  const [loading, setLoading] = useState(true);
  const [statusData, setStatusData] = useState<ReportStatusResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isRestarting, setIsRestarting] = useState(false);
  const pdfPreviewUrl = useAuthObjectUrl(statusData?.report?.pdf_file_path);

  useEffect(() => {
    const checkStatus = async () => {
      try {
        const response = await apiClient.get<ReportStatusResponse>('/my-latest-report-status');

        const hasReport = response.has_report ?? Boolean(response.report);
        if (!hasReport || !response.report || !response.experiment) {
          navigate('/introduction', { replace: true });
          return;
        }

        setStatusData(response);
        setLoading(false);
      } catch (err) {
        // 如果接口报错，为安全起见，也跳转到介绍页，或者显示错误
        // 这里选择显示错误以便调试，或者您可以选择 console.error 后跳转
        console.error("Failed to check report status:", err);
        setError(getSafeReportStatusError(err));
        setLoading(false);
      }
    };

    checkStatus();
  }, [navigate]);

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
  const isRejected = report.status === 'rejected';
  const isSubmitted = report.status === 'submitted';
  const isGraded = report.status === 'graded';

  const statusMeta = isRejected
    ? {
        Icon: AlertCircle,
        title: '您的上一份实验报告已被驳回',
        description: '请仔细阅读下方的驳回原因和原始报告，然后点击底部按钮重新进行实验。',
        note: '* 重新开始实验将创建一个新的实验记录，您之前的进度已归档。',
        panelClass: 'bg-red-50 border-red-200',
        iconClass: 'bg-red-100 text-red-600',
        titleClass: 'text-red-900',
        textClass: 'text-red-800',
        tagClass: 'bg-red-100 text-red-700',
        statusText: '已驳回',
      }
    : isSubmitted
    ? {
        Icon: Hourglass,
        title: '您的实验报告已提交',
        description: '报告已进入教师或助教的评阅队列。评分完成后，您可以在这里查看报告得分和评语。',
        note: null,
        panelClass: 'bg-blue-50 border-blue-200',
        iconClass: 'bg-blue-100 text-blue-600',
        titleClass: 'text-blue-900',
        textClass: 'text-blue-800',
        tagClass: 'bg-blue-100 text-blue-700',
        statusText: '待评分',
      }
    : {
        Icon: CheckCircle,
        title: '您的实验报告已评分',
        description: '教师或助教已完成报告评分。请查看下方的报告得分和评语。',
        note: null,
        panelClass: 'bg-emerald-50 border-emerald-200',
        iconClass: 'bg-emerald-100 text-emerald-600',
        titleClass: 'text-emerald-900',
        textClass: 'text-emerald-800',
        tagClass: 'bg-emerald-100 text-emerald-700',
        statusText: '已评分',
      };

  const StatusIcon = statusMeta.Icon;

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-[1600px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6 lg:h-[calc(100vh-4rem)]">
        {/* 左侧：PDF 预览 */}
        <div className="lg:col-span-7 min-h-[420px] lg:h-full">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-1 h-full flex flex-col">
            <div className="p-4 border-b border-gray-100 flex justify-between items-center flex-shrink-0">
              <h2 className="font-bold text-gray-800">报告预览</h2>
              {report.pdf_file_path && pdfPreviewUrl && (
                <a
                  href={pdfPreviewUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-blue-600 hover:text-blue-700 text-sm font-medium hover:underline"
                >
                  下载 PDF
                </a>
              )}
            </div>
            <div className="flex-1 bg-gray-100 rounded-b-lg overflow-hidden relative">
              {report.pdf_file_path && pdfPreviewUrl ? (
                <iframe
                  src={pdfPreviewUrl}
                  className="w-full h-full border-none"
                  title="Report PDF"
                />
              ) : report.pdf_file_path ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-500 gap-3">
                  <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                  <span>正在加载 PDF 预览...</span>
                </div>
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
          {/* 状态栏 */}
          <div className={`${statusMeta.panelClass} border rounded-xl p-6 shadow-sm`}>
            <div className="flex items-start gap-4">
              <div className={`${statusMeta.iconClass} p-3 rounded-full flex-shrink-0`}>
                <StatusIcon className="w-8 h-8" />
              </div>
              <div className="flex-1">
                <h1 className={`${statusMeta.titleClass} text-2xl font-bold mb-2`}>
                  {statusMeta.title}
                </h1>
                <p className={`${statusMeta.textClass} mb-4`}>
                  {statusMeta.description}
                  {statusMeta.note && (
                    <>
                      <br />
                      <span className="text-sm opacity-80">{statusMeta.note}</span>
                    </>
                  )}
                </p>

                {isGraded && (
                  <div className="bg-white/80 border border-emerald-200 rounded-lg p-4 mb-4">
                    <h3 className="text-sm font-bold text-emerald-900 mb-1">报告得分</h3>
                    <p className="text-3xl font-bold text-gray-900">
                      {formatScore(report.grade)}
                      {report.grade !== null && <span className="text-base font-medium text-gray-500 ml-1">/ 100</span>}
                    </p>
                  </div>
                )}

                {!isSubmitted && (
                  <div className="bg-white/80 border border-gray-200 rounded-lg p-4">
                    <h3 className={`${statusMeta.titleClass} text-sm font-bold mb-1 flex items-center gap-2`}>
                      <FileText className="w-4 h-4" />
                      {isRejected ? '教师评语 / 驳回原因：' : '教师评语：'}
                    </h3>
                    <p className="text-gray-800 text-base leading-relaxed">
                      {report.feedback || '暂无评语'}
                    </p>
                  </div>
                )}

                {isSubmitted && (
                  <div className="bg-white/80 border border-blue-200 rounded-lg p-4">
                    <h3 className="text-sm font-bold text-blue-900 mb-1 flex items-center gap-2">
                      <FileText className="w-4 h-4" />
                      评阅状态：
                    </h3>
                    <p className="text-gray-800 text-base leading-relaxed">
                      暂未评分，请等待教师或助教完成评阅。
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 实验信息 */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Hash className="w-5 h-5 text-gray-500" />
              报告信息
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
                <span className={`${statusMeta.tagClass} px-2 py-1 text-xs font-bold rounded`}>{statusMeta.statusText}</span>
              </div>
            </div>
          </div>

          {/* 操作区 */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">下一步操作</h2>
            {isRejected ? (
              <>
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
              </>
            ) : (
              <>
                <p className="text-sm text-gray-600 mb-6">
                  您可以进入实验首页查看实验说明，或根据页面提示继续后续操作。
                </p>
                <Button
                  onClick={() => navigate('/introduction')}
                  className="w-full h-12 text-lg shadow-lg hover:shadow-xl transition-all"
                >
                  <Home className="w-5 h-5 mr-2" />
                  进入实验首页
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReportStatusCheck;
