import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { AppState } from '../App';
import { Package, Star, TrendingUp, DollarSign, ArrowRight } from 'lucide-react';

interface Props {
  appState: AppState;
  updateAppState: (updates: Partial<AppState>) => void;
  completeStep: (step: number) => void;
}

const ProductSelection: React.FC<Props> = ({ appState, updateAppState, completeStep }) => {
  const [selectedProduct, setSelectedProduct] = useState<string | null>(appState.selectedProduct);
  const navigate = useNavigate();

  const getProductsForCompany = (industry: string | null, company: string | null) => {
    const productsMap: Record<string, Record<string, any[]>> = {
      automotive: {
        xunchi: [
          { id: 'e-stream', name: '迅驰E-Stream', category: '紧凑型电动SUV', description: '500公里续航，L3级自动驾驶', price: '¥28-35万', growth: '+18.5%', rating: 4.7 },
          { id: 'voltx', name: '迅驰VoltX', category: '电动跑车', description: '0-100km/h加速3.5秒，面向性能爱好者', price: '¥65-80万', growth: '+12.3%', rating: 4.9 },
          { id: 'ecovan', name: '迅驰EcoVan', category: '电动物流货车', description: '支持快速充电，适合城市配送', price: '¥18-25万', growth: '+25.8%', rating: 4.5 },
          { id: 'smartpod', name: '迅驰SmartPod', category: '单人微型电动车', description: 'AI语音交互，短途通勤专用', price: '¥8-12万', growth: '+32.1%', rating: 4.6 },
        ],
        leinuo: [
          { id: 'hybridstar', name: '雷诺HybridStar', category: '混合动力轿车', description: '油电结合，续航800公里', price: '€35-45万', growth: '+15.2%', rating: 4.6 },
          { id: 'citymate', name: '雷诺CityMate', category: '紧凑型电动车', description: '适合城市停车，配备智能导航', price: '€25-32万', growth: '+20.8%', rating: 4.4 },
          { id: 'freightpro', name: '雷诺FreightPro', category: '中型电动货车', description: '专为中长途物流设计', price: '€45-60万', growth: '+18.9%', rating: 4.5 },
          { id: 'ecosport', name: '雷诺EcoSport', category: '电动跨界SUV', description: '强调越野性能和低能耗', price: '€40-55万', growth: '+14.7%', rating: 4.7 },
        ],
        xingtu: [
          { id: 'minivolt', name: '星途MiniVolt', category: '微型电动车', description: '续航200公里，适合短途代步', price: '¥12-18万', growth: '+28.3%', rating: 4.3 },
          { id: 'skyline', name: '星途Skyline', category: '中型电动轿车', description: '配备全景天窗和L2+自动驾驶', price: '¥25-35万', growth: '+16.5%', rating: 4.6 },
          { id: 'cargoflex', name: '星途CargoFlex', category: '模块化电动货车', description: '可定制货厢，适合多场景物流', price: '¥20-30万', growth: '+22.1%', rating: 4.4 },
        ],
      },
      electronics: {
        zhixin: [
          { id: 'smartlens', name: '智芯SmartLens', category: 'AR智能眼镜', description: '支持导航和虚拟会议', price: '¥3,999-5,999', growth: '+35.2%', rating: 4.5 },
          { id: 'homehub', name: '智芯HomeHub', category: '智能家居控制中心', description: '集成AI语音和能源管理', price: '¥1,299-1,899', growth: '+28.7%', rating: 4.7 },
          { id: 'fitband', name: '智芯FitBand Pro', category: '健康手环', description: '监测心率、血氧和睡眠', price: '¥399-599', growth: '+42.1%', rating: 4.6 },
          { id: 'minidrone', name: '智芯MiniDrone', category: '家用无人机', description: '用于安防和娱乐拍摄', price: '¥2,199-3,299', growth: '+18.9%', rating: 4.4 },
          { id: 'ecospeaker', name: '智芯EcoSpeaker', category: '环保蓝牙音箱', description: '支持AI语音和长续航', price: '¥299-499', growth: '+25.6%', rating: 4.5 },
        ],
        languang: [
          { id: 'visionpad', name: '蓝光VisionPad', category: '折叠屏平板电脑', description: '支持5G和多任务处理', price: '$1,299-1,899', growth: '+22.3%', rating: 4.8 },
          { id: 'smartcam', name: '蓝光SmartCam', category: '智能安防摄像头', description: '具备夜视和人脸识别', price: '$199-399', growth: '+31.5%', rating: 4.6 },
          { id: 'truebuds', name: '蓝光TrueBuds', category: '无线耳机', description: '降噪和长续航，适合专业用户', price: '$299-499', growth: '+26.8%', rating: 4.7 },
          { id: 'connecthub', name: '蓝光ConnectHub', category: '物联网路由器', description: '支持多设备互联', price: '$149-249', growth: '+19.2%', rating: 4.5 },
          { id: 'wearfit', name: '蓝光WearFit', category: '智能手表', description: '集成健身和支付功能', price: '$399-699', growth: '+33.7%', rating: 4.8 },
        ],
        jidian: [
          { id: 'gamepod', name: '极电GamePod', category: '便携游戏机', description: '支持云游戏和4K显示', price: '₩450-650万', growth: '+29.4%', rating: 4.6 },
          { id: 'soundbar', name: '极电SoundBar', category: '智能音箱', description: '内置虚拟助手，优化音乐体验', price: '₩180-280万', growth: '+24.1%', rating: 4.5 },
          { id: 'minitab', name: '极电MiniTab', category: '轻薄平板', description: '适合学生和移动办公', price: '₩320-480万', growth: '+21.8%', rating: 4.4 },
          { id: 'smartring', name: '极电SmartRing', category: '智能戒指', description: '监测健康和通知提醒', price: '₩120-200万', growth: '+38.5%', rating: 4.3 },
        ],
      },
      // 可以继续添加其他行业的产品数据...
      food: {
        lutian: [
          { id: 'nutribar', name: '绿田NutriBar', category: '高蛋白能量棒', description: '无糖，适合健身人群', price: 'CHF8-12', growth: '+15.3%', rating: 4.6 },
          { id: 'vitameal', name: '绿田VitaMeal', category: '即食健康餐', description: '富含纤维和维生素', price: 'CHF12-18', growth: '+22.7%', rating: 4.5 },
          { id: 'crispybites', name: '绿田CrispyBites', category: '有机谷物零食', description: '低脂低糖', price: 'CHF6-10', growth: '+18.9%', rating: 4.4 },
          { id: 'puresoup', name: '绿田PureSoup', category: '速溶蔬菜汤', description: '无添加剂', price: 'CHF5-8', growth: '+12.1%', rating: 4.3 },
          { id: 'grainmix', name: '绿田GrainMix', category: '杂粮早餐麦片', description: '多种口味可选', price: 'CHF8-14', growth: '+25.6%', rating: 4.7 },
        ],
        fenghe: [
          { id: 'spicynoodle', name: '丰禾SpicyNoodle', category: '速食麻辣面', description: '多种辣度选择', price: '¥8-15', growth: '+28.3%', rating: 4.5 },
          { id: 'ricesnack', name: '丰禾RiceSnack', category: '米制膨化零食', description: '低油健康', price: '¥5-10', growth: '+32.1%', rating: 4.4 },
          { id: 'quickporridge', name: '丰禾QuickPorridge', category: '即食杂粮粥', description: '适合早餐', price: '¥12-18', growth: '+19.7%', rating: 4.6 },
          { id: 'fruitchew', name: '丰禾FruitChew', category: '果味软糖', description: '天然果汁制成', price: '¥6-12', growth: '+24.8%', rating: 4.3 },
        ],
        chunwei: [
          { id: 'veggiechips', name: '纯味VeggieChips', category: '蔬菜脆片', description: '低盐低油，儿童友好', price: 'A$8-12', growth: '+21.5%', rating: 4.5 },
          { id: 'nutmix', name: '纯味NutMix', category: '坚果混合装', description: '富含蛋白质', price: 'A$15-25', growth: '+18.2%', rating: 4.7 },
          { id: 'purepasta', name: '纯味PurePasta', category: '有机意面', description: '适合家庭烹饪', price: 'A$6-10', growth: '+16.9%', rating: 4.4 },
          { id: 'fruitbar', name: '纯味FruitBar', category: '水果干棒', description: '无糖添加，适合便携零食', price: 'A$4-8', growth: '+26.3%', rating: 4.6 },
        ],
      },
      machinery: {
        taili: [
          { id: 'ecodigger', name: '泰力EcoDigger', category: '电动挖掘机', description: '零排放，适合城市施工', price: '€180-250万', growth: '+15.8%', rating: 4.6 },
          { id: 'smartcrane', name: '泰力SmartCrane', category: '智能塔式起重机', description: 'AI负载监测', price: '€320-450万', growth: '+12.3%', rating: 4.7 },
          { id: 'powergen', name: '泰力PowerGen', category: '模块化发电机', description: '支持可再生能源并网', price: '€80-120万', growth: '+28.5%', rating: 4.5 },
          { id: 'autodrill', name: '泰力AutoDrill', category: '自动化钻探设备', description: '用于矿山开采', price: '€220-300万', growth: '+18.7%', rating: 4.4 },
          { id: 'roadmaster', name: '泰力RoadMaster', category: '智能压路机', description: '配备振动优化系统', price: '€150-200万', growth: '+22.1%', rating: 4.6 },
        ],
        juyan: [
          { id: 'megaload', name: '巨岩MegaLoader', category: '重型装载机', description: '适合港口和矿山作业', price: '¥280-380万', growth: '+19.2%', rating: 4.5 },
          { id: 'smartfork', name: '巨岩SmartFork', category: '智能叉车', description: '具备自动导航和货物识别', price: '¥45-65万', growth: '+32.8%', rating: 4.7 },
          { id: 'ecopaver', name: '巨岩EcoPaver', category: '环保沥青摊铺机', description: '降低能耗和排放', price: '¥180-250万', growth: '+16.5%', rating: 4.4 },
          { id: 'drillpro', name: '巨岩DrillPro', category: '多功能钻机', description: '适用于隧道和地质勘探', price: '¥120-180万', growth: '+24.3%', rating: 4.6 },
        ],
        tiefeng: [
          { id: 'powerturbine', name: '铁峰PowerTurbine', category: '小型风力发电机', description: '适合分布式能源', price: '$80-120万', growth: '+26.7%', rating: 4.5 },
          { id: 'heavylift', name: '铁峰HeavyLift', category: '大型起重机', description: '专为港口和重工业设计', price: '$350-500万', growth: '+14.2%', rating: 4.8 },
          { id: 'smartpump', name: '铁峰SmartPump', category: '智能水泵', description: '优化农业和工业用水', price: '$25-45万', growth: '+31.5%', rating: 4.6 },
          { id: 'ecogrinder', name: '铁峰EcoGrinder', category: '环保研磨机', description: '用于材料加工', price: '$60-90万', growth: '+18.9%', rating: 4.4 },
        ],
      },
      beverage: {
        qingquan: [
          { id: 'energyspark', name: '清泉EnergySpark', category: '低糖功能饮料', description: '含咖啡因和维生素B', price: '¥8-12', growth: '+25.4%', rating: 4.5 },
          { id: 'purespring', name: '清泉PureSpring', category: '高端矿泉水', description: '阿尔卑斯水源', price: '¥15-25', growth: '+18.7%', rating: 4.7 },
          { id: 'fruitzest', name: '清泉FruitZest', category: '无糖果味气泡水', description: '多种水果口味', price: '¥6-10', growth: '+32.1%', rating: 4.6 },
          { id: 'herbcalm', name: '清泉HerbCalm', category: '草本茶饮料', description: '舒缓压力', price: '¥10-15', growth: '+22.8%', rating: 4.4 },
        ],
        bilang: [
          { id: 'powerboost', name: '碧浪PowerBoost', category: '电解质运动饮料', description: '适合健身后补给', price: '$3-5', growth: '+28.9%', rating: 4.6 },
          { id: 'coolmint', name: '碧浪CoolMint', category: '薄荷味气泡水', description: '清爽低卡', price: '$2-4', growth: '+24.3%', rating: 4.5 },
          { id: 'vitajuice', name: '碧浪VitaJuice', category: '果蔬混合汁', description: '富含抗氧化剂', price: '$4-7', growth: '+19.6%', rating: 4.7 },
          { id: 'puretea', name: '碧浪PureTea', category: '无糖绿茶', description: '采用有机茶叶', price: '$2-4', growth: '+21.2%', rating: 4.4 },
        ],
        yunxi: [
          { id: 'matchaglow', name: '云溪MatchaGlow', category: '抹茶饮料', description: '低糖健康配方', price: '¥12-18', growth: '+26.7%', rating: 4.6 },
          { id: 'herbalsip', name: '云溪HerbalSip', category: '花草茶', description: '多种口味，强调放松', price: '¥8-15', growth: '+20.4%', rating: 4.5 },
          { id: 'sparkletea', name: '云溪SparkleTea', category: '茶基气泡饮料', description: '果味融合', price: '¥10-16', growth: '+23.8%', rating: 4.4 },
          { id: 'purewater', name: '云溪PureWater', category: '日式过滤纯净水', description: '适合茶道搭配', price: '¥20-30', growth: '+15.2%', rating: 4.8 },
        ],
      },
      cosmetics: {
        liran: [
          { id: 'glowserum', name: '丽然GlowSerum', category: '保湿抗衰老精华', description: '适合敏感肌', price: '€45-80', growth: '+22.5%', rating: 4.7 },
          { id: 'ecolips', name: '丽然EcoLips', category: '有机唇膏', description: '多种自然色号', price: '€15-25', growth: '+28.3%', rating: 4.5 },
          { id: 'puremask', name: '丽然PureMask', category: '可生物降解面膜', description: '含海藻精华', price: '€8-15', growth: '+31.7%', rating: 4.6 },
          { id: 'toneup', name: '丽然ToneUp', category: '多功能BB霜', description: '防晒和遮瑕', price: '€25-40', growth: '+19.8%', rating: 4.4 },
          { id: 'eyeglow', name: '丽然EyeGlow', category: '眼霜', description: '减少黑眼圈和细纹', price: '€35-60', growth: '+24.1%', rating: 4.8 },
        ],
        qingyan: [
          { id: 'hydracream', name: '清颜HydraCream', category: '深层保湿霜', description: '含芦荟和绿茶提取物', price: '¥120-200', growth: '+26.4%', rating: 4.6 },
          { id: 'silkpowder', name: '清颜SilkPowder', category: '定妆散粉', description: '轻薄透气', price: '¥80-120', growth: '+21.7%', rating: 4.5 },
          { id: 'liptint', name: '清颜LipTint', category: '水润染唇液', description: '持久自然', price: '¥45-80', growth: '+29.3%', rating: 4.7 },
          { id: 'sunshield', name: '清颜SunShield', category: '物理防晒霜', description: '适合敏感肌', price: '¥60-100', growth: '+18.5%', rating: 4.4 },
        ],
        guangcai: [
          { id: 'shinecushion', name: '光彩ShineCushion', category: '气垫粉底', description: '轻薄高遮瑕', price: '₩80-120만', growth: '+32.1%', rating: 4.6 },
          { id: 'colorpop', name: '光彩ColorPop', category: '多色眼影盘', description: '适合多种妆容', price: '₩60-100만', growth: '+27.8%', rating: 4.5 },
          { id: 'glossstar', name: '光彩GlossStar', category: '高光唇釉', description: '持久闪耀', price: '₩40-70만', growth: '+24.6%', rating: 4.7 },
          { id: 'blushglow', name: '光彩BlushGlow', category: '腮红膏', description: '自然显气色', price: '₩35-60만', growth: '+20.9%', rating: 4.4 },
        ],
      },
      cleaning: {
        jingxin: [
          { id: 'bioclean', name: '净新BioClean', category: '植物基清洁喷雾', description: '适合厨房和浴室', price: '¥25-40', growth: '+23.7%', rating: 4.5 },
          { id: 'ecowipes', name: '净新EcoWipes', category: '可生物降解湿巾', description: '无化学残留', price: '¥15-25', growth: '+28.4%', rating: 4.6 },
          { id: 'freshgel', name: '净新FreshGel', category: '空气清新凝胶', description: '含天然精油', price: '¥20-35', growth: '+19.8%', rating: 4.4 },
          { id: 'powerwash', name: '净新PowerWash', category: '浓缩洗涤剂', description: '环保低泡', price: '¥30-50', growth: '+21.5%', rating: 4.7 },
        ],
        lujie: [
          { id: 'smartspray', name: '绿洁SmartSpray', category: '智能感应清洁喷雾', description: '精准喷洒', price: '£35-60', growth: '+31.2%', rating: 4.6 },
          { id: 'ecoscrub', name: '绿洁EcoScrub', category: '可重复使用清洁海绵', description: '耐用环保', price: '£8-15', growth: '+26.8%', rating: 4.5 },
          { id: 'puredetergent', name: '绿洁PureDetergent', category: '无磷洗衣液', description: '温和护衣', price: '£20-35', growth: '+22.4%', rating: 4.7 },
          { id: 'odorclear', name: '绿洁OdorClear', category: '除臭喷雾', description: '适合宠物家庭', price: '£15-25', growth: '+24.9%', rating: 4.4 },
        ],
        qingxin: [
          { id: 'multiclean', name: '清新MultiClean', category: '多用途清洁剂', description: '适合地板和家具', price: '¥18-30', growth: '+20.6%', rating: 4.5 },
          { id: 'softwipe', name: '清新SoftWipe', category: '抗菌干巾', description: '适合快速清洁', price: '¥12-20', growth: '+25.3%', rating: 4.4 },
          { id: 'ecosoap', name: '清新EcoSoap', category: '植物皂液', description: '用于洗碗和手洗', price: '¥15-25', growth: '+18.7%', rating: 4.6 },
          { id: 'airpure', name: '清新AirPure', category: '天然空气清新剂', description: '无刺激气味', price: '¥22-35', growth: '+23.1%', rating: 4.3 },
        ],
      },
      apparel: {
        shangliu: [
          { id: 'ecodenim', name: '尚流EcoDenim', category: '回收纤维牛仔裤', description: '舒适时尚', price: '€60-90', growth: '+24.8%', rating: 4.6 },
          { id: 'smartjacket', name: '尚流SmartJacket', category: '智能温控夹克', description: '内置加热系统', price: '€150-250', growth: '+18.5%', rating: 4.7 },
          { id: 'trendtee', name: '尚流TrendTee', category: '有机棉T恤', description: '多种图案设计', price: '€25-40', growth: '+32.1%', rating: 4.5 },
          { id: 'flexleggings', name: '尚流FlexLeggings', category: '高弹性运动leggings', description: '透气抗菌', price: '€35-55', growth: '+28.7%', rating: 4.6 },
          { id: 'ecoscarf', name: '尚流EcoScarf', category: '可持续丝巾', description: '适合四季搭配', price: '€40-70', growth: '+21.3%', rating: 4.4 },
        ],
        yunshang: [
          { id: 'silkdress', name: '云裳SilkDress', category: '真丝连衣裙', description: '融入传统刺绣元素', price: '¥800-1500', growth: '+19.6%', rating: 4.8 },
          { id: 'casualtee', name: '云裳CasualTee', category: '竹纤维T恤', description: '透气环保', price: '¥120-200', growth: '+26.4%', rating: 4.5 },
          { id: 'windcoat', name: '云裳WindCoat', category: '轻薄防风外套', description: '适合春季出行', price: '¥300-500', growth: '+22.8%', rating: 4.6 },
          { id: 'yogawear', name: '云裳YogaWear', category: '运动套装', description: '强调舒适和弹性', price: '¥200-350', growth: '+31.5%', rating: 4.7 },
        ],
        chaozhi: [
          { id: 'streethoodie', name: '潮织StreetHoodie', category: 'Oversize连帽衫', description: '街头风格', price: '$80-120', growth: '+29.3%', rating: 4.5 },
          { id: 'cargopants', name: '潮织CargoPants', category: '多口袋工装裤', description: '适合户外活动', price: '$60-100', growth: '+25.7%', rating: 4.6 },
          { id: 'techvest', name: '潮织TechVest', category: '智能背心', description: '内置手机充电模块', price: '$120-180', growth: '+33.2%', rating: 4.7 },
          { id: 'sneakertee', name: '潮织SneakerTee', category: '搭配运动鞋的短袖', description: '吸汗速干', price: '$30-50', growth: '+27.1%', rating: 4.4 },
        ],
      },
    };
    
    return productsMap[industry || '']?.[company || ''] || [];
  };

  const products = getProductsForCompany(appState.selectedIndustry, appState.selectedCompany);

  const handleNext = () => {
    if (selectedProduct) {
      updateAppState({ selectedProduct });
      completeStep(3);
      navigate('/data');
    }
  };

  return (
    <div className="p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">选择目标产品</h1>
          <p className="text-lg text-gray-600">
            请选择您想要进行需求预测分析的具体产品。系统将为该产品提供详细的历史销售数据、
            市场趋势和相关影响因素。
          </p>
        </div>

        <div className="space-y-4 mb-8">
          {products.map((product) => {
            const isSelected = selectedProduct === product.id;
            
            return (
              <div
                key={product.id}
                onClick={() => setSelectedProduct(product.id)}
                className={`p-6 rounded-xl border-2 cursor-pointer transition-all hover:shadow-lg ${
                  isSelected 
                    ? 'border-blue-500 bg-blue-50 shadow-md' 
                    : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                      isSelected ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'
                    }`}>
                      <Package className="w-6 h-6" />
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className="text-xl font-semibold text-gray-900">{product.name}</h3>
                        <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-700 rounded-full">
                          {product.category}
                        </span>
                      </div>
                      
                      <p className="text-sm text-gray-600 mb-3">{product.description}</p>
                      
                      <div className="flex items-center space-x-6">
                        <div className="flex items-center space-x-1">
                          <Star className="w-4 h-4 text-yellow-500 fill-current" />
                          <span className="text-sm font-medium">{product.rating}</span>
                        </div>
                        
                        <div className="flex items-center space-x-1">
                          <DollarSign className="w-4 h-4 text-green-600" />
                          <span className="text-sm font-medium">{product.price}</span>
                        </div>
                        
                        <div className="flex items-center space-x-1">
                          <TrendingUp className="w-4 h-4 text-blue-600" />
                          <span className="text-sm font-medium text-green-600">{product.growth}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {isSelected && (
                    <div className="text-blue-600">
                      <ArrowRight className="w-5 h-5" />
                    </div>
                  )}
                  
                  <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                    isSelected 
                      ? 'border-blue-500 bg-blue-500' 
                      : 'border-gray-300'
                  }`}>
                    {isSelected && (
                      <div className="w-2 h-2 bg-white rounded-full"></div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {products.length === 0 && (
          <div className="text-center py-12">
            <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">暂无产品数据</h3>
            <p className="text-gray-600">该企业的产品信息正在完善中，请选择其他企业或稍后再试。</p>
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
            disabled={!selectedProduct || products.length === 0}
            className={`px-8 py-3 rounded-lg font-medium transition-all ${
              selectedProduct && products.length > 0
                ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-md hover:shadow-lg'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            下一步：查看历史数据
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProductSelection;