import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useExperiment } from '../contexts/ExperimentContext.zustand';
import {
    ArrowRight,
    Building2,
    Zap,
    Leaf,
    Car,
    Utensils,
    Gem,
    Beaker,
    Shirt,
    Boxes,
    Factory,
} from 'lucide-react';
import { apiClient } from '../../../utils/apiClient';
import { useConfirm } from '../shared/contexts/ConfirmContext';
import Button from '../shared/components/common/Button';

// Create a mapping from industry names to specific icons
const INDUSTRY_ICON_MAP: { [key: string]: React.ElementType } = {
    '服装': Shirt,
    '汽车': Car,
    '电子': Zap,
    '餐饮': Utensils,
    '化工': Beaker,
    '珠宝': Gem,
    '农业': Leaf,
    '零售': Boxes,
    '建筑': Building2,
    '制造': Factory, // Using a more generic term
};

// Define a default icon for any industry not in the map
const DefaultIcon = Factory;

// Helper function to find the correct icon based on keywords
const getIndustryIcon = (industryName: string): React.ElementType => {
    for (const keyword of Object.keys(INDUSTRY_ICON_MAP)) {
        if (industryName.includes(keyword)) {
            const IconComponent = INDUSTRY_ICON_MAP[keyword];
            if (IconComponent) {
                return IconComponent;
            }
        }
    }
    return DefaultIcon;
};


const IndustrySelection: React.FC = () => {
    const navigate = useNavigate();
    const { state, handleIndustryChange, recordStepEvent, isSubmitting } = useExperiment();
    const [industries, setIndustries] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [localIndustry, setLocalIndustry] = useState<string | null>(state.selected_industry);
    const { confirm } = useConfirm();
    const hasRecordedStartRef = useRef(false);
    const prevHighestStepRef = useRef(state.highest_completed_step);

    useEffect(() => {
        let isActive = true;
        const fetchIndustries = async () => {
            setIsLoading(true);
            setError(null);
            try {
        const start = performance.now();
        const result = await apiClient.get<string[]>('/datasets/industries');
        const end = performance.now();
        const elapsed = end - start;
        const remaining = Math.max(0, 600 - elapsed);
        await new Promise((resolve) => setTimeout(resolve, remaining));
        if (isActive) {
            setIndustries(Array.isArray(result) ? result : []);
        }
            } catch (err: any) {
                if (isActive) {
                    setError(err.message || '加载行业列表失败');
                    setIndustries([]);
                }
            } finally {
                if (isActive) {
                    setIsLoading(false);
                }
            }
        };

        fetchIndustries();
        return () => {
            isActive = false;
        };
    }, []);

    // Record STARTED event only when entering a new step (step > highest_completed_step)
    // Reset ref when state is rolled back (highest_completed_step decreases)
    useEffect(() => {
        if (state.highest_completed_step < prevHighestStepRef.current) {
            hasRecordedStartRef.current = false;
        }
        prevHighestStepRef.current = state.highest_completed_step;

        if (1 > state.highest_completed_step && !hasRecordedStartRef.current) {
            recordStepEvent(1, 'STARTED');
            hasRecordedStartRef.current = true;
        }
    }, [state.highest_completed_step, recordStepEvent]);

    const handleSelectIndustry = (industryId: string) => {
        // Only update the local state on selection.
        // The confirmation and global state update will happen in handleNext.
        setLocalIndustry(industryId);
    };

    const handleNext = async () => {
        if (!localIndustry) return;

        const hasExistingSelection = state.selected_industry !== null;
        const hasChanged = localIndustry !== state.selected_industry;

        if (hasExistingSelection && hasChanged) {
            const isConfirmed = await confirm({
                title: '确认更改行业',
                message: '更改行业将重置您在后续步骤中所有的选择和进度。您确定要继续吗？',
                confirmText: '确认更改',
                cancelText: '取消',
            });
            if (!isConfirmed) {
                return; // User cancelled, so we stop here.
            }
        }

        // Proceed with the update and navigation if:
        // 1. It's the first selection.
        // 2. The user confirmed the change.
        // 3. The selection hasn't changed (user just clicked next).
        if (hasChanged) {
            await handleIndustryChange(localIndustry);
        }
        navigate('/company');
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
                    {isLoading && (
                        <div className="col-span-full flex justify-center py-16 text-gray-500">
                            正在加载行业列表...
                        </div>
                    )}

                    {!isLoading && error && (
                        <div className="col-span-full bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                            {error}
                        </div>
                    )}

                    {!isLoading && !error && industries.length === 0 && (
                        <div className="col-span-full bg-yellow-50 border border-yellow-200 text-yellow-700 px-4 py-3 rounded-lg">
                            暂无行业信息，请稍后重试或联系管理员。
                        </div>
                    )}

                    {!isLoading && !error && industries.map((industryName) => {
                        const isSelected = localIndustry === industryName;
                        const Icon = getIndustryIcon(industryName);
                        return (
                            <div
                                key={industryName}
                                onClick={() => handleSelectIndustry(industryName)}
                                className={`p-6 rounded-xl border-2 cursor-pointer transition-all duration-200 ${
                                    isSelected
                                        ? 'border-blue-500 bg-blue-50 shadow-lg'
                                        : 'border-gray-200 bg-white hover:border-blue-400 hover:shadow-md'
                                }`}
                            >
                                <div className="flex items-center space-x-4">
                                    <div className={`w-12 h-12 rounded-lg flex items-center justify-center bg-blue-50`}>
                                        <Icon className={`w-6 h-6 text-blue-500`} />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-semibold text-gray-900">{industryName}</h3>
                                        <p className="text-sm text-gray-500">点击选择该行业</p>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                <div className="mt-12 flex justify-between items-center">
                    <span className="text-sm text-gray-500">
                        {localIndustry
                            ? `已选择: ${localIndustry}`
                            : '请选择一个行业'}
                    </span>
                    <Button
                        onClick={handleNext}
                        disabled={!localIndustry || isLoading || !!error || isSubmitting}
                        isLoading={isSubmitting}
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

export default IndustrySelection;
