import React from 'react';
import { Routes, Route, Link, useLocation, useNavigate } from 'react-router-dom';
import type { AppState } from '../App';
import { Brain, TrendingUp, BarChart3, ArrowRight } from 'lucide-react';
import MovingAverageModel from './models/MovingAverageModel';
import ExponentialSmoothingModel from './models/ExponentialSmoothingModel';
import WeightedEnsembleModel from './models/WeightedEnsembleModel';
import BoostingEnsembleModel from './models/BoostingEnsembleModel';
import StackingEnsembleModel from './models/StackingEnsembleModel';
import LSTMModel from './models/LSTMModel';
import ARIMAModel from './models/ARIMAModel';

interface Props {
  appState: AppState;
  updateAppState: (updates: Partial<AppState>) => void;
  completeStep: (step: number) => void;
}

const ModelBuilding: React.FC<Props> = ({ appState, updateAppState, completeStep }) => {
  const location = useLocation();
  const navigate = useNavigate();

  console.log('Current location:', location.pathname);

  // 包装completeStep函数，完成后导航到评估页面
  const handleCompleteStep = (step: number) => {
    completeStep(step);
  };

  // 获取公司名称
  const getCompanyName = () => {
    const companyNames: Record<string, Record<string, string>> = {
      automotive: {
        xunchi: '迅驰汽车',
        leinuo: '雷诺科技',
        xingtu: '星途汽车'
      },
      electronics: {
        zhixin: '智芯科技',
        languang: '蓝光创新',
        jidian: '极电科技'
      },
      machinery: {
        taili: '泰力重工',
        juyan: '巨岩机械',
        tiefeng: '铁峰设备'
      },
      food: {
        lutian: '绿田食品',
        fenghe: '丰禾食品',
        chunwei: '纯味食品'
      },
      beverage: {
        qingquan: '清泉饮料',
        bilang: '碧浪饮品',
        yunxi: '云溪饮料'
      },
      cosmetics: {
        liran: '丽然美妆',
        qingyan: '清颜美妆',
        guangcai: '光彩美妆'
      },
      cleaning: {
        jingxin: '净新家居',
        lujie: '绿洁科技',
        qingxin: '清新之家'
      },
      apparel: {
        shangliu: '尚流服饰',
        yunshang: '云裳服饰',
        chaozhi: '潮织时尚'
      }
    };
    
    return companyNames[appState.selectedIndustry || '']?.[appState.selectedCompany || ''] || '选定企业';
  };

  // 获取产品名称
  const getProductName = () => {
    const productNames: Record<string, Record<string, Record<string, string>>> = {
      automotive: {
        xunchi: {
          'e-stream': '迅驰E-Stream电动SUV',
          'voltx': '迅驰VoltX电动跑车',
          'ecovan': '迅驰EcoVan电动货车',
          'smartpod': '迅驰SmartPod微型电动车'
        },
        leinuo: {
          'hybridstar': '雷诺HybridStar混合动力轿车',
          'citymate': '雷诺CityMate紧凑型电动车',
          'freightpro': '雷诺FreightPro电动货车',
          'ecosport': '雷诺EcoSport电动SUV'
        },
        xingtu: {
          'minivolt': '星途MiniVolt微型电动车',
          'skyline': '星途Skyline中型电动轿车',
          'cargoflex': '星途CargoFlex模块化电动货车'
        }
      },
      electronics: {
        zhixin: {
          'smartlens': '智芯SmartLens AR眼镜',
          'homehub': '智芯HomeHub智能家居控制中心',
          'fitband': '智芯FitBand Pro健康手环',
          'minidrone': '智芯MiniDrone家用无人机',
          'ecospeaker': '智芯EcoSpeaker环保蓝牙音箱'
        },
        languang: {
          'visionpad': '蓝光VisionPad折叠屏平板',
          'smartcam': '蓝光SmartCam智能安防摄像头',
          'truebuds': '蓝光TrueBuds无线耳机',
          'connecthub': '蓝光ConnectHub物联网路由器',
          'wearfit': '蓝光WearFit智能手表'
        },
        jidian: {
          'gamepod': '极电GamePod便携游戏机',
          'soundbar': '极电SoundBar智能音箱',
          'minitab': '极电MiniTab轻薄平板',
          'smartring': '极电SmartRing智能戒指'
        }
      },
      apparel: {
        shangliu: {
          'ecodenim': '尚流EcoDenim回收纤维牛仔裤',
          'smartjacket': '尚流SmartJacket智能温控夹克',
          'trendtee': '尚流TrendTee有机棉T恤',
          'flexleggings': '尚流FlexLeggings高弹性运动裤',
          'ecoscarf': '尚流EcoScarf可持续丝巾'
        },
        yunshang: {
          'silkdress': '云裳真丝连衣裙',
          'casualtee': '云裳竹纤维T恤',
          'windcoat': '云裳轻薄防风外套',
          'yogawear': '云裳运动套装'
        },
        chaozhi: {
          'streethoodie': '潮织StreetHoodie连帽衫',
          'cargopants': '潮织CargoPants工装裤',
          'techvest': '潮织TechVest智能背心',
          'sneakertee': '潮织SneakerTee运动短袖'
        }
      }
    };
    
    return productNames[appState.selectedIndustry || '']?.[appState.selectedCompany || '']?.[appState.selectedProduct || ''] || '选定产品';
  };

  const models = [
    { 
      id: 'ma', 
      name: '移动平均法', 
      path: 'ma',
      icon: BarChart3,
      description: '简单易理解的经典预测方法，适合平稳数据',
      difficulty: '初级',
      accuracy: '中等',
      type: 'basic'
    },
    { 
      id: 'es', 
      name: '指数平滑法', 
      path: 'es',
      icon: TrendingUp,
      description: '对近期数据赋予更高权重，适合有趋势的数据',
      difficulty: '初级',
      accuracy: '中等',
      type: 'basic'
    },
    { 
      id: 'arima', 
      name: 'ARIMA模型', 
      path: 'arima',
      icon: TrendingUp,
      description: '自回归积分滑动平均模型，适合有趋势的数据',
      difficulty: '中级',
      accuracy: '较高',
      type: 'basic'
    },
    { 
      id: 'lstm', 
      name: 'LSTM神经网络', 
      path: 'lstm',
      icon: Brain,
      description: '深度学习方法，擅长捕捉复杂的时间序列模式',
      difficulty: '高级',
      accuracy: '高',
      type: 'basic'
    },
    { 
      id: 'weighted', 
      name: '加权平均融合模型', 
      path: 'weighted',
      icon: BarChart3,
      description: '结合多个基础模型的预测结果，通过权重优化提升精度',
      difficulty: '中级',
      accuracy: '高',
      type: 'ensemble'
    },
    { 
      id: 'boosting', 
      name: 'Boosting融合模型', 
      path: 'boosting',
      icon: Brain,
      description: '序列化训练多个模型，后续模型专注于前面模型的错误',
      difficulty: '高级',
      accuracy: '很高',
      type: 'ensemble'
    },
    { 
      id: 'stacking', 
      name: 'Stacking融合模型', 
      path: 'stacking',
      icon: Brain,
      description: '使用元学习器整合多个基础模型，实现最优预测效果',
      difficulty: '高级',
      accuracy: '很高',
      type: 'ensemble'
    },
  ];

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case '初级': return 'text-green-600 bg-green-50 border-green-200';
      case '中级': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case '高级': return 'text-red-600 bg-red-50 border-red-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getAccuracyColor = (accuracy: string) => {
    switch (accuracy) {
      case '高': return 'text-green-600';
      case '较高': return 'text-blue-600';
      case '中等': return 'text-yellow-600';
      default: return 'text-gray-600';
    }
  };

  const DefaultModelContent = () => (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div>
        <div className="flex items-center space-x-4 mb-6">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center">
            <Brain className="w-8 h-8 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-semibold text-gray-900">市场部经理决策中心</h2>
            <p className="text-blue-600 font-medium">您正在扮演{getCompanyName()}市场部经理</p>
          </div>
        </div>
        
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8">
          <h3 className="text-lg font-semibold text-blue-800 mb-3">🎯 您的任务</h3>
          <div className="text-blue-700 space-y-2">
            <p>• <strong>分析市场需求</strong>：基于{getProductName()}的历史销售数据，预测未来6个月的市场需求</p>
            <p>• <strong>选择预测方法</strong>：从多种预测算法中选择最适合的方法，确保预测准确性</p>
            <p>• <strong>制定决策建议</strong>：为生产部门提供科学的需求预测，支持生产计划制定</p>
          </div>
        </div>
        
        <div className="mb-8">
          <h3 className="text-xl font-semibold text-gray-900 mb-4">可选择的预测算法</h3>
          <p className="text-gray-600 mb-6">
            作为市场部经理，您需要根据数据特征和业务需求，选择最合适的预测方法。
            每种算法都有其优势和适用场景，请仔细评估后做出决策。
          </p>
        
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {models.map((model) => {
              const Icon = model.icon;
              
              return (
                <div key={model.id} className="p-6 bg-gray-50 rounded-lg border border-gray-200 h-full">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                    <Icon className="w-6 h-6 text-blue-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">{model.name}</h3>
                  <p className="text-sm text-gray-600 mb-4">{model.description}</p>
                  <div className="flex items-center space-x-3">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full border ${getDifficultyColor(model.difficulty)}`}>
                      {model.difficulty}
                    </span>
                    <span className={`text-xs font-medium ${getAccuracyColor(model.accuracy)}`}>
                      {model.accuracy}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        
        <div className="mt-8 bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <h4 className="font-semibold text-yellow-800 mb-3">💡 经理提示</h4>
          <div className="text-yellow-700 text-sm space-y-2">
            <p>• <strong>初次使用建议</strong>：如果您是第一次进行需求预测，建议从移动平均法开始，它简单易懂且计算快速</p>
            <p>• <strong>追求高精度</strong>：如果您希望获得最准确的预测结果，LSTM神经网络通常能提供最佳性能</p>
            <p>• <strong>平衡考虑</strong>：ARIMA模型在准确性和可解释性之间提供了良好的平衡，适合向上级汇报</p>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="p-8">
      <div className="w-full">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">预测模型建立</h1>
          <p className="text-lg text-gray-600">
            选择合适的预测算法来分析云裳服饰真丝连衣裙的需求。每种方法都有其特点和适用场景。
          </p>
        </div>

        <div className="flex gap-8">
          {/* 左侧二级路由导航 */}
          <div className="w-80 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-6">预测模型</h2>
            <nav className="space-y-2">
              {models.map((model) => {
                const Icon = model.icon;
                const isActive = location.pathname === `/model/${model.path}` || 
                                false;
                const isEnsemble = model.type === 'ensemble';
                
                return (
                  <Link
                    key={model.id}
                    to={`/model/${model.path}`}
                    className={`flex items-center space-x-3 p-3 rounded-lg transition-all ${
                      isActive 
                        ? 'bg-blue-50 text-blue-700 border border-blue-200' 
                        : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                    }`}
                  >
                    <div className="relative">
                      <Icon className="w-5 h-5" />
                      {isEnsemble && (
                        <div className="absolute -top-1 -right-1 w-3 h-3 bg-purple-500 rounded-full flex items-center justify-center">
                          <span className="text-xs text-white font-bold">E</span>
                        </div>
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="font-medium">{model.name}</div>
                      <div className="text-xs text-gray-500">
                        {model.difficulty} · {model.accuracy}
                        {isEnsemble && <span className="text-purple-600 ml-1">· 融合模型</span>}
                      </div>
                    </div>
                    {isActive && <ArrowRight className="w-4 h-4" />}
                  </Link>
                );
              })}
            </nav>

            <div className="mt-8 pt-6 border-t border-gray-200">
              <button
                onClick={() => navigate('/evaluation')}
                className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 shadow-md hover:shadow-lg transition-all font-medium"
              >
                <TrendingUp className="w-5 h-5" />
                <span>进入结果评估</span>
              </button>
              <p className="text-xs text-gray-500 mt-2 text-center">
                对比不同模型的预测效果
              </p>
            </div>
          </div>

          {/* 右侧内容区域 */}
          <div className="flex-1 min-h-0">
            <Routes>
              <Route index element={<DefaultModelContent />} />
              <Route path="ma" element={
                <MovingAverageModel 
                  appState={appState} 
                  updateAppState={updateAppState}
                  completeStep={handleCompleteStep}
                />
              } />
              <Route path="es" element={
                <ExponentialSmoothingModel 
                  appState={appState} 
                  updateAppState={updateAppState}
                  completeStep={handleCompleteStep}
                />
              } />
              <Route path="arima" element={
                <ARIMAModel 
                  appState={appState} 
                  updateAppState={updateAppState}
                  completeStep={handleCompleteStep}
                />
              } />
              <Route path="lstm" element={
                <LSTMModel 
                  appState={appState} 
                  updateAppState={updateAppState}
                  completeStep={handleCompleteStep}
                />
              } />
              <Route path="weighted" element={
                <WeightedEnsembleModel 
                  appState={appState} 
                  updateAppState={updateAppState}
                  completeStep={handleCompleteStep}
                />
              } />
              <Route path="boosting" element={
                <BoostingEnsembleModel 
                  appState={appState} 
                  updateAppState={updateAppState}
                  completeStep={handleCompleteStep}
                />
              } />
              <Route path="stacking" element={
                <StackingEnsembleModel 
                  appState={appState} 
                  updateAppState={updateAppState}
                  completeStep={handleCompleteStep}
                />
              } />
            </Routes>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ModelBuilding;