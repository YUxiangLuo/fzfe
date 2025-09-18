import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useExperiment } from '../contexts/ExperimentContext';
import { ArrowRight, Building2, Zap, Leaf, Car, Utensils, Gem, Beaker, Shirt } from 'lucide-react';

const industries = [
    { id: 'electronics', name: '电子', icon: Zap, color: 'text-blue-500', bgColor: 'bg-blue-50' },
    { id: 'automotive', name: '汽车', icon: Car, color: 'text-gray-500', bgColor: 'bg-gray-50' },
    { id: 'machinery', name: '机械', icon: Building2, color: 'text-orange-500', bgColor: 'bg-orange-50' },
    { id: 'food', name: '食品', icon: Utensils, color: 'text-red-500', bgColor: 'bg-red-50' },
    { id: 'beverage', name: '饮料', icon: Beaker, color: 'text-green-500', bgColor: 'bg-green-50' },
    { id: 'cosmetics', name: '美妆', icon: Gem, color: 'text-pink-500', bgColor: 'bg-pink-50' },
    { id: 'cleaning', name: '洗护', icon: Leaf, color: 'text-teal-500', bgColor: 'bg-teal-50' },
    { id: 'apparel', name: '服装', icon: Shirt, color: 'text-purple-500', bgColor: 'bg-purple-50' },
];

const IndustrySelection: React.FC = () => {
    const navigate = useNavigate();
    const { state, updateState } = useExperiment();

    const handleSelectIndustry = (industryId: string) => {
        // The reset logic is now handled automatically by the updateState function in the context
        updateState({ selected_industry: industryId });
    };

    const handleNext = () => {
        if (state.selected_industry) {
            // Set highest completed step to 1 and current step to 2
            updateState({ 
                highest_completed_step: 1,
                current_step: 2,
            });
            navigate('/company');
        }
    };

    return (
        <div className="p-8">
            <div className="max-w-6xl mx-auto">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900 mb-4">步骤 1: 选择行业</h1>
                    <p className="text-lg text-gray-600">
                        请选择您要进行需求预测和生产计划决策的目标行业。您的选择将决定后续可分析的企业和产品范围。
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {industries.map((industry) => {
                        const isSelected = state.selected_industry === industry.id;
                        const Icon = industry.icon;
                        return (
                            <div
                                key={industry.id}
                                onClick={() => handleSelectIndustry(industry.id)}
                                className={`p-6 rounded-xl border-2 cursor-pointer transition-all duration-200 ${
                                    isSelected
                                        ? 'border-blue-500 bg-blue-50 shadow-lg'
                                        : 'border-gray-200 bg-white hover:border-blue-400 hover:shadow-md'
                                }`}
                            >
                                <div className="flex items-center space-x-4">
                                    <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${industry.bgColor}`}>
                                        <Icon className={`w-6 h-6 ${industry.color}`} />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-semibold text-gray-900">{industry.name}</h3>
                                        <p className="text-sm text-gray-500">{industry.id}</p>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                <div className="mt-12 flex justify-between items-center">
                    <span className="text-sm text-gray-500">
                        {state.selected_industry ? `已选择: ${industries.find(i => i.id === state.selected_industry)?.name}` : '请选择一个行业'}
                    </span>
                    <button
                        onClick={handleNext}
                        disabled={!state.selected_industry}
                        className="flex items-center space-x-2 px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-md hover:shadow-lg transition-all disabled:bg-gray-300 disabled:cursor-not-allowed disabled:shadow-none"
                    >
                        <span>下一步</span>
                        <ArrowRight className="w-5 h-5" />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default IndustrySelection;
