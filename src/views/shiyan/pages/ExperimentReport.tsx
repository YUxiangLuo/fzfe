import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useExperiment } from '../contexts/ExperimentContext.zustand';
import { FileText, Save, Loader2, CheckCircle, X } from 'lucide-react';
import { apiClient } from '../../../utils/apiClient';
import { validateAnalyses } from '../utils/reportValidation';
import {
  buildExperimentReportMarkdown,
  buildReportViewModel,
  type ReportAnalysisValues,
  type ReportUserSummary,
} from '../utils/reportBuilder';

import { ExperimentOverview } from './report_components/ExperimentOverview';
import { ModelComparison } from './report_components/ModelComparison';
import { BestModelSelection } from './report_components/BestModelSelection';
import { PlanParameters } from './report_components/PlanParameters';
import { PlanDecisionResults } from './report_components/PlanDecisionResults';
import { CompletionModal, ValidationErrorModal } from './report_components/SubmissionModals';

const ExperimentReport: React.FC = () => {
  const { state, updateState, productSalesData } = useExperiment();
  const navigate = useNavigate();

  const [userInfo, setUserInfo] = useState<ReportUserSummary | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const [showValidationErrorModal, setShowValidationErrorModal] = useState(false);
  const [countdown, setCountdown] = useState(8);

  const [dataAnalysis, setDataAnalysis] = useState('');
  const [modelComparisonAnalysis, setModelComparisonAnalysis] = useState('');
  const [modelSelectionAnalysis, setModelSelectionAnalysis] = useState('');
  const [planParamsAnalysis, setPlanParamsAnalysis] = useState('');
  const [planDecisionAnalysis, setPlanDecisionAnalysis] = useState('');

  useEffect(() => {
    if (showCompletionModal) {
      localStorage.removeItem('token');
      setCountdown(8);
      const timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            window.location.href = '/login.html';
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [showCompletionModal]);

  useEffect(() => {
    window.scrollTo(0, 0);
    const fetchUserInfo = async () => {
      try {
        const profile = await apiClient.get<ReportUserSummary>('/users/me');
        setUserInfo(profile);
      } catch (error) {
        console.error('Failed to fetch user info:', error);
      }
    };
    void fetchUserInfo();
  }, []);

  const analysisSetters: Record<string, React.Dispatch<React.SetStateAction<string>>> = {
    data: setDataAnalysis,
    comparison: setModelComparisonAnalysis,
    selection: setModelSelectionAnalysis,
    params: setPlanParamsAnalysis,
    decision: setPlanDecisionAnalysis,
  };

  const analysisValues: ReportAnalysisValues = {
    data: dataAnalysis,
    comparison: modelComparisonAnalysis,
    selection: modelSelectionAnalysis,
    params: planParamsAnalysis,
    decision: planDecisionAnalysis,
  };

  const getAnalysisSetter = (key: string) => analysisSetters[key] || (() => {});
  const getAnalysisValue = (key: string) => analysisValues[key as keyof ReportAnalysisValues] || '';

  const reportViewModel = useMemo(
    () => buildReportViewModel(state, productSalesData),
    [productSalesData, state],
  );

  const handleSave = async () => {
    if (!state.experiment_id) {
      setSubmitError('实验ID不存在，无法提交报告');
      return;
    }
    if (!validateAnalyses(analysisValues)) {
      setShowValidationErrorModal(true);
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);
    setSubmitSuccess(false);

    try {
      const markdownContent = buildExperimentReportMarkdown({
        state,
        userInfo,
        analyses: analysisValues,
        viewModel: reportViewModel,
      });

      await apiClient.post<{ message: string; report_id: number; pdf_path: string }>(
        `/experiment-runs/${state.experiment_id}/report`,
        { report_content: markdownContent },
      );

      setSubmitSuccess(true);
      const now = new Date().toISOString();
      await updateState({ status: 'Completed', completion_time: now }, { skipSync: true });
      setShowCompletionModal(true);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      setSubmitError(errorMessage || '提交报告失败，请重试');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLogout = () => {
    window.location.href = '/login.html';
  };

  const renderValue = (value: string | number | null | undefined) => {
    return value ?? <span className="text-gray-400">N/A</span>;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-8">
        <header className="mb-8">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 flex items-center">
                <FileText className="w-9 h-9 mr-4 text-blue-600" />
                实验报告
              </h1>
              <p className="text-gray-600 mt-2">
                请根据实验结果，完成以下五个部分的分析，然后提交报告。
              </p>
            </div>
            <button
              onClick={() => navigate('/production')}
              disabled={showCompletionModal}
              className="p-2 text-gray-500 hover:bg-gray-200 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title="返回"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </header>

        <main className="space-y-8">
          <ExperimentOverview
            state={state}
            trainingData={reportViewModel.trainingData}
            evaluationData={reportViewModel.evaluationData}
            getAnalysisValue={getAnalysisValue}
            getAnalysisSetter={getAnalysisSetter}
            isSubmitting={isSubmitting}
            renderValue={renderValue}
          />
          <ModelComparison
            allModels={reportViewModel.allModels}
            getAnalysisValue={getAnalysisValue}
            getAnalysisSetter={getAnalysisSetter}
            isSubmitting={isSubmitting}
            renderValue={renderValue}
          />
          <BestModelSelection
            state={state}
            bestModelMetrics={reportViewModel.bestModelMetrics}
            getAnalysisValue={getAnalysisValue}
            getAnalysisSetter={getAnalysisSetter}
            isSubmitting={isSubmitting}
            renderValue={renderValue}
          />
          <PlanParameters
            state={state}
            getAnalysisValue={getAnalysisValue}
            getAnalysisSetter={getAnalysisSetter}
            isSubmitting={isSubmitting}
          />
          <PlanDecisionResults
            state={state}
            planSummary={reportViewModel.planSummary}
            getAnalysisValue={getAnalysisValue}
            getAnalysisSetter={getAnalysisSetter}
            isSubmitting={isSubmitting}
          />

          <div className="pt-8 flex justify-end">
            <button
              onClick={handleSave}
              disabled={isSubmitting || submitSuccess}
              className="inline-flex items-center justify-center px-8 py-4 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-all shadow-lg hover:shadow-xl disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  提交中...
                </>
              ) : submitSuccess ? (
                <>
                  <CheckCircle className="w-5 h-5 mr-2" />
                  已提交
                </>
              ) : (
                <>
                  <Save className="w-5 h-5 mr-2" />
                  保存并提交报告
                </>
              )}
            </button>
          </div>
          {submitError && <p className="text-right text-red-600 mt-4">{submitError}</p>}
        </main>
      </div>

      {showCompletionModal && <CompletionModal countdown={countdown} onLogout={handleLogout} />}
      {showValidationErrorModal && (
        <ValidationErrorModal onClose={() => setShowValidationErrorModal(false)} />
      )}
    </div>
  );
};

export default ExperimentReport;
