import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useExperiment } from '../contexts/ExperimentContext';
import { Package, ArrowRight, Loader2 } from 'lucide-react';
import { apiClient } from '../../../utils/apiClient';

const ProductSelection: React.FC = () => {
  const navigate = useNavigate();
  const { state, updateState, loadProductSalesData, isLoadingSales, salesDataError } = useExperiment();
  const [products, setProducts] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
        const response = await apiClient.get<string[]>(
          `/datasets/industries/${state.selected_industry}/companies/${state.selected_company}/products`,
        );
        const end = performance.now();
        const elapsed = end - start;
        const remaining = Math.max(0, 1500 - elapsed);
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
    updateState({ selected_product: productId });
  };

  const handleNext = async () => {
    if (state.selected_product && state.selected_industry && state.selected_company) {
      const success = await loadProductSalesData(
        state.selected_industry,
        state.selected_company,
        state.selected_product,
      );
      if (success) {
        updateState({
          highest_completed_step: 3,
          current_step: 4,
        });
        navigate('/data');
      }
    }
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
              const isSelected = state.selected_product === productName;
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
          <button
            onClick={() => navigate('/company')}
            className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            上一步
          </button>
          <button
            onClick={handleNext}
            disabled={!state.selected_product || isLoading || !!error || isLoadingSales}
            className="flex items-center justify-center space-x-2 w-48 px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-md hover:shadow-lg transition-all disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            {isLoadingSales ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                <span>下一步</span>
                <ArrowRight className="w-5 h-5" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProductSelection;
