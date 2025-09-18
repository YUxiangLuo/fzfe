import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useExperiment } from '../contexts/ExperimentContext';
import { Package, Star, TrendingUp, DollarSign, ArrowRight } from 'lucide-react';

const getProductsForCompany = (industry: string | null, company: string | null) => {
    const productsMap: Record<string, Record<string, any[]>> = {
      automotive: {
        xunchi: [
          { id: 'e-stream', name: '迅驰E-Stream电动SUV', category: '电动SUV', price: '¥28-35万', growth: '+18.5%', rating: 4.7 },
          { id: 'voltx', name: '迅驰VoltX电动跑车', category: '电动跑车', price: '¥65-80万', growth: '+12.3%', rating: 4.9 },
          { id: 'ecovan', name: '迅驰EcoVan电动货车', category: '电动货车', price: '¥18-25万', growth: '+25.8%', rating: 4.5 },
        ],
        leinuo: [
          { id: 'hybridstar', name: '雷诺HybridStar混合动力轿车', category: '混合动力轿车', price: '€35-45万', growth: '+15.2%', rating: 4.6 },
          { id: 'citymate', name: '雷诺CityMate紧凑型电动车', category: '紧凑型电动车', price: '€25-32万', growth: '+20.8%', rating: 4.4 },
        ],
      },
      electronics: {
        zhixin: [
          { id: 'smartlens', name: '智芯SmartLens AR眼镜', category: 'AR眼镜', price: '¥3,999', growth: '+35.2%', rating: 4.5 },
          { id: 'homehub', name: '智芯HomeHub智能家居中心', category: '智能家居', price: '¥1,299', growth: '+28.7%', rating: 4.7 },
          { id: 'fitband', name: '智芯FitBand Pro健康手环', category: '健康手环', price: '¥399', growth: '+42.1%', rating: 4.6 },
        ],
      },
      apparel: {
        yunshang: [
            { id: 'silkdress', name: '云裳真丝连衣裙', category: '连衣裙', price: '¥800-1500', growth: '+19.6%', rating: 4.8 },
            { id: 'casualtee', name: '云裳竹纤维T恤', category: 'T恤', price: '¥120-200', growth: '+26.4%', rating: 4.5 },
            { id: 'windcoat', name: '云裳轻薄防风外套', category: '外套', price: '¥300-500', growth: '+22.8%', rating: 4.6 },
        ]
      },
      machinery: {
        taili: [
          { id: 'ecodigger', name: '泰力EcoDigger电动挖掘机', category: '挖掘机', price: '€180-250万', growth: '+15.8%', rating: 4.6 },
          { id: 'smartcrane', name: '泰力SmartCrane智能塔吊', category: '起重机', price: '€320-450万', growth: '+12.3%', rating: 4.7 },
        ],
        juyan: [
          { id: 'megaloader', name: '巨岩MegaLoader重型装载机', category: '装载机', price: '¥280-380万', growth: '+19.2%', rating: 4.5 },
        ],
        tiefeng: [
          { id: 'powerturbine', name: '铁峰PowerTurbine风力发电机', category: '发电机', price: '$80-120万', growth: '+26.7%', rating: 4.5 },
        ],
      },
      food: {
        lutian: [
          { id: 'nutribar', name: '绿田NutriBar能量棒', category: '能量棒', price: 'CHF8-12', growth: '+15.3%', rating: 4.6 },
        ],
        fenghe: [
          { id: 'spicynoodle', name: '丰禾SpicyNoodle速食面', category: '速食面', price: '¥8-15', growth: '+28.3%', rating: 4.5 },
        ],
        chunwei: [
          { id: 'veggiechips', name: '纯味VeggieChips蔬菜脆片', category: '脆片', price: 'A$8-12', growth: '+21.5%', rating: 4.5 },
        ],
      },
      beverage: {
        qingquan: [
          { id: 'energyspark', name: '清泉EnergySpark功能饮料', category: '功能饮料', price: '¥8-12', growth: '+25.4%', rating: 4.5 },
        ],
        bilang: [
          { id: 'powerboost', name: '碧浪PowerBoost运动饮料', category: '运动饮料', price: '$3-5', growth: '+28.9%', rating: 4.6 },
        ],
        yunxi: [
          { id: 'matchaglow', name: '云溪MatchaGlow抹茶饮料', category: '抹茶饮料', price: '¥12-18', growth: '+26.7%', rating: 4.6 },
        ],
      },
      cleaning: {
        jingxin: [
          { id: 'bioclean', name: '净新BioClean清洁喷雾', category: '清洁喷雾', price: '¥25-40', growth: '+23.7%', rating: 4.5 },
        ],
        lujie: [
          { id: 'smartspray', name: '绿洁SmartSpray智能喷雾', category: '智能喷雾', price: '£35-60', growth: '+31.2%', rating: 4.6 },
        ],
        qingxin: [
          { id: 'multiclean', name: '清新MultiClean多用途清洁剂', category: '清洁剂', price: '¥18-30', growth: '+20.6%', rating: 4.5 },
        ],
      },
      cosmetics: {
        liran: [
          { id: 'glowserum', name: '丽然GlowSerum精华', category: '精华', price: '€45-80', growth: '+22.5%', rating: 4.7 },
          { id: 'ecolips', name: '丽然EcoLips唇膏', category: '唇膏', price: '€15-25', growth: '+28.3%', rating: 4.5 },
          { id: 'puremask', name: '丽然PureMask面膜', category: '面膜', price: '€8-15', growth: '+31.7%', rating: 4.6 },
        ],
        qingyan: [
          { id: 'hydracream', name: '清颜HydraCream保湿霜', category: '保湿霜', price: '¥120-200', growth: '+26.4%', rating: 4.6 },
          { id: 'silkpowder', name: '清颜SilkPowder散粉', category: '散粉', price: '¥80-120', growth: '+21.7%', rating: 4.5 },
          { id: 'liptint', name: '清颜LipTint染唇液', category: '染唇液', price: '¥45-80', growth: '+29.3%', rating: 4.7 },
        ],
        guangcai: [
          { id: 'shinecushion', name: '光彩ShineCushion气垫', category: '气垫', price: '₩80-120만', growth: '+32.1%', rating: 4.6 },
          { id: 'colorpop', name: '光彩ColorPop眼影盘', category: '眼影盘', price: '₩60-100만', growth: '+27.8%', rating: 4.5 },
        ]
      }
    };
    return productsMap[industry || '']?.[company || ''] || [];
};

const ProductSelection: React.FC = () => {
  const navigate = useNavigate();
  const { state, updateState } = useExperiment();

  const products = getProductsForCompany(state.selected_industry, state.selected_company);

  const handleSelectProduct = (productId: string) => {
    updateState({ selected_product: productId });
  };

  const handleNext = () => {
    if (state.selected_product) {
      updateState({ 
          highest_completed_step: 3,
          current_step: 4,
      });
      navigate('/data');
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

        <div className="space-y-4 mb-8">
          {products.map((product) => {
            const isSelected = state.selected_product === product.id;
            return (
              <div
                key={product.id}
                onClick={() => handleSelectProduct(product.id)}
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
                            <h3 className="text-xl font-semibold text-gray-900">{product.name}</h3>
                            <div className="flex items-center space-x-4 text-sm text-gray-600 mt-2">
                                <span>品类: {product.category}</span>
                                <div className="flex items-center"><Star className="w-4 h-4 text-yellow-400 mr-1" /> {product.rating}</div>
                                <div className="flex items-center"><DollarSign className="w-4 h-4 text-green-500 mr-1" /> {product.price}</div>
                                <div className="flex items-center"><TrendingUp className="w-4 h-4 text-blue-500 mr-1" /> {product.growth}</div>
                            </div>
                        </div>
                    </div>
                    {isSelected && <ArrowRight className="w-5 h-5 text-blue-600" />}
                </div>
              </div>
            );
          })}
        </div>

        {products.length === 0 && (
          <div className="text-center py-12">
            <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">暂无产品数据</h3>
            <p className="text-gray-600">该企业的产品信息正在完善中，请选择其他企业。</p>
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
            disabled={!state.selected_product}
            className="flex items-center space-x-2 px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-md hover:shadow-lg transition-all disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            <span>下一步</span>
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProductSelection;
