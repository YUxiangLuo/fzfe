import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useExperiment } from '../contexts/ExperimentContext.zustand';
import { Package, ArrowRight } from 'lucide-react';
import { getProducts } from '../services/datasets';
import { useConfirm } from '../shared/contexts/ConfirmContext';
import Button from '../shared/components/common/Button';
import { useStepStartRecorder } from '../hooks/useStepStartRecorder';

const ProductSelection: React.FC = () => {
  const navigate = useNavigate();
  const { state, handleProductChange, salesDataError, recordStepEvent, isSubmitting } = useExperiment();
  const [products, setProducts] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [localProduct, setLocalProduct] = useState<string | null>(state.selected_product);
  const { confirm } = useConfirm();
  useStepStartRecorder(3, state.highest_completed_step, recordStepEvent);

  useEffect(() => {
    let isActive = true;

    const loadProducts = async () => {
      if (!state.selected_industry || !state.selected_company) {
        setProducts([]);
        setError(null);
        return;
      }

      setIsLoading(true);
      setError(null);
      try {
        const start = performance.now();
        const response = await getProducts(state.selected_industry, state.selected_company);
        const end = performance.now();
        const elapsed = end - start;
        const remaining = Math.max(0, 600 - elapsed);
        await new Promise((resolve) => setTimeout(resolve, remaining));
        if (isActive) {
          setProducts(Array.isArray(response) ? response : []);
        }
      } catch (err: any) {
        if (isActive) {
          setError(err.message || '加载产品列表失败');
          setProducts([]);
        }
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    };

    loadProducts();
    return () => {
      isActive = false;
    };
  }, [state.selected_industry, state.selected_company]);

  const handleSelectProduct = (productId: string) => {
    setLocalProduct(productId);
  };

  const handleNext = async () => {
    if (!localProduct) return;

    const hasExistingSelection = state.selected_product !== null;
    const hasChanged = localProduct !== state.selected_product;

    if (hasExistingSelection && hasChanged) {
      const isConfirmed = await confirm({
        title: '确认更改产品',
        message: '更改产品将重置您在后续步骤中所有的选择和进度。您确定要继续吗？',
        confirmText: '确认更改',
        cancelText: '取消',
      });
      if (!isConfirmed) {
        return;
      }
    }

    if (hasChanged) {
      try {
        await handleProductChange(localProduct);
      } catch (error) {
        console.error('更新产品选择失败:', error);
        return;
      }
    }
    navigate('/data');
  };

  return (
    <div className="p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">步骤 3: 选择产品</h1>
          <p className="text-lg text-gray-600">
            请选择您要进行需求预测的具体产品。
          </p>
        </div>

        {(!state.selected_industry || !state.selected_company) && (
          <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 px-4 py-3 rounded-lg mb-8">
            请先完成前两个步骤的选择。
          </div>
        )}

        {state.selected_industry && state.selected_company && (
          <div className="space-y-4 mb-8">
            {isLoading && (
              <div className="flex justify-center py-12 text-gray-500">
                正在加载产品列表...
              </div>
            )}

            {!isLoading && error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                {error}
              </div>
            )}

            {!isLoading && !error && products.length === 0 && (
              <div className="col-span-full text-center py-12 border border-dashed border-gray-200 rounded-xl">
                <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">暂无产品数据</h3>
                <p className="text-gray-600">该企业的产品信息正在完善中，请稍后再试或选择其他企业。</p>
              </div>
            )}

            {!isLoading && !error && products.map((productName) => {
              const isSelected = localProduct === productName;
              return (
                <div
                  key={productName}
                  onClick={() => handleSelectProduct(productName)}
                  className={`p-6 rounded-xl border-2 cursor-pointer transition-all hover:shadow-lg ${
                    isSelected
                      ? 'border-blue-500 bg-blue-50 shadow-md'
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${isSelected ? 'bg-blue-100' : 'bg-gray-100'}`}>
                        <Package className={`w-6 h-6 ${isSelected ? 'text-blue-600' : 'text-gray-600'}`} />
                      </div>
                      <div>
                        <h3 className="text-xl font-semibold text-gray-900">{productName}</h3>
                        <p className="text-sm text-gray-600 mt-1">点击选择该产品</p>
                      </div>
                    </div>
                    {isSelected && <ArrowRight className="w-5 h-5 text-blue-600" />}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {salesDataError && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
            {salesDataError}
          </div>
        )}

        <div className="flex justify-between">
          <Button
            onClick={() => navigate('/company')}
            variant="outline"
            size="lg"
          >
            上一步
          </Button>
          <Button
            onClick={handleNext}
            disabled={!localProduct || isLoading || !!error || isSubmitting}
            isLoading={isSubmitting}
            size="lg"
            className="w-48"
          >
            <span>下一步</span>
            <ArrowRight className="w-5 h-5 ml-2" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ProductSelection;
