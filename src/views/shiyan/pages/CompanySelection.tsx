import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useExperiment } from '../contexts/ExperimentContext.zustand';
import { toastEventBus } from '../utils/toastEventBus';
import { Building, ArrowRight } from 'lucide-react';
import { getCompanies } from '../services/datasets';
import { useConfirm } from '../shared/contexts/ConfirmContext';
import Button from '../shared/components/common/Button';
import { useStepStartRecorder } from '../hooks/useStepStartRecorder';

const CompanySelection: React.FC = () => {
  const navigate = useNavigate();
  const { state, ui, handleCompanyChange, recordStepEvent } = useExperiment();
  const [companies, setCompanies] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [localCompany, setLocalCompany] = useState<string | null>(state.selected_company);
  const { confirm } = useConfirm();
  useStepStartRecorder(2, state.highest_completed_step, recordStepEvent);

  useEffect(() => {
    let isActive = true;

    const loadCompanies = async () => {
      if (!state.selected_industry) {
        setCompanies([]);
        setError(null);
        return;
      }

      setIsLoading(true);
      setError(null);
      try {
        const start = performance.now();
        const response = await getCompanies(state.selected_industry);
        const end = performance.now();
        const elapsed = end - start;
        const remaining = Math.max(0, 600 - elapsed);
        await new Promise((resolve) => setTimeout(resolve, remaining));
        if (isActive) {
          setCompanies(Array.isArray(response) ? response : []);
        }
      } catch (err) {
        if (isActive) {
          setError(err instanceof Error ? err.message : '加载企业列表失败');
          setCompanies([]);
        }
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    };

    loadCompanies();
    return () => {
      isActive = false;
    };
  }, [state.selected_industry]);

  const handleSelectCompany = (companyId: string) => {
    setLocalCompany(companyId);
  };

  const handleNext = async () => {
    if (!localCompany) return;

    const hasExistingSelection = state.selected_company !== null;
    const hasChanged = localCompany !== state.selected_company;

    if (hasExistingSelection && hasChanged) {
      const isConfirmed = await confirm({
        title: '确认更改企业',
        message: '更改企业将重置您在后续步骤中所有的选择和进度。您确定要继续吗？',
        confirmText: '确认更改',
        cancelText: '取消',
      });
      if (!isConfirmed) {
        return;
      }
    }

    if (hasChanged) {
      try {
        await handleCompanyChange(localCompany);
      } catch (error) {
        console.error('更新企业选择失败:', error);
        toastEventBus.error('更新企业选择失败，请稍后重试');
        return;
      }
    }
    navigate('/product');
  };

  return (
    <div className="p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">步骤 2: 选择企业</h1>
          <p className="text-lg text-gray-600">
            基于您选择的行业，请选择一家企业进行深入分析。
          </p>
        </div>

        {!state.selected_industry && (
          <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 px-4 py-3 rounded-lg mb-8">
            请先在上一步选择行业。
          </div>
        )}

        {state.selected_industry && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {isLoading && (
              <div className="col-span-full flex justify-center py-12 text-gray-500">
                正在加载企业列表...
              </div>
            )}

            {!isLoading && error && (
              <div className="col-span-full bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                {error}
              </div>
            )}

            {!isLoading && !error && companies.length === 0 && (
              <div className="col-span-full bg-yellow-50 border border-yellow-200 text-yellow-700 px-4 py-3 rounded-lg">
                暂无企业数据，请稍后再试。
              </div>
            )}

            {!isLoading && !error && companies.map((companyName) => {
              const isSelected = localCompany === companyName;
              return (
                <div
                  key={companyName}
                  onClick={() => handleSelectCompany(companyName)}
                  className={`p-6 rounded-xl border-2 cursor-pointer transition-all hover:shadow-lg ${
                    isSelected
                      ? 'border-blue-500 bg-blue-50 shadow-md'
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-start space-x-4">
                    <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${isSelected ? 'bg-blue-100' : 'bg-gray-100'}`}>
                      <Building className={`w-6 h-6 ${isSelected ? 'text-blue-600' : 'text-gray-600'}`} />
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold text-gray-900">{companyName}</h3>
                      <p className="text-sm text-gray-600 mt-1">点击选择该企业</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="flex justify-between items-center">
            <Button
                onClick={() => navigate('/industry')}
                variant="outline"
                size="lg"
            >
                上一步
            </Button>
            <Button
                onClick={handleNext}
                disabled={!localCompany || isLoading || !!error || ui.isSubmitting}
                isLoading={ui.isSubmitting}
                size="lg"
            >
                <span>下一步</span>
                <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
        </div>
      </div>
    </div>
  );
};

export default CompanySelection;
