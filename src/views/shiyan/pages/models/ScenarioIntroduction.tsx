import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { A11y, Navigation, Pagination } from 'swiper/modules';
import type { Swiper as SwiperType } from 'swiper';
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';

// 自定义分页器样式
const paginationStyle = `
  .swiper-pagination-custom .swiper-pagination-bullet {
    width: 8px;
    height: 8px;
    background: rgba(71, 85, 105, 0.35);
    opacity: 1;
    transition: all 0.3s;
  }
  .swiper-pagination-custom .swiper-pagination-bullet:hover {
    background: rgba(37, 99, 235, 0.65);
  }
  .swiper-pagination-custom .swiper-pagination-bullet-active {
    width: 24px;
    background: rgb(37, 99, 235);
    border-radius: 4px;
  }
`;

const scenarioSlides = [
  {
    eyebrow: '业务背景',
    title: '用需求预测支持生产与库存决策',
    summary: '市场需求存在波动。预测模型的任务是根据建模时可获得的信息估计未来需求，为后续生产计划提供输入，而不是直接替企业决定产量。',
    accent: 'from-blue-50 via-white to-indigo-50',
    badge: 'bg-blue-100 text-blue-700',
    points: [
      { title: '观察历史', description: '读取连续历史销量及当时已经产生的业务字段，识别可学习的水平、相关性或非线性模式。' },
      { title: '估计需求', description: '用统一的数据窗口训练并比较多个模型，输出需求点预测及相应的不确定性说明。' },
      { title: '支持决策', description: '下游生产计划还要结合服务水平、库存和产能约束；预测值本身不等于最终生产量。' },
    ],
    note: '预测描述的是有条件的不确定估计。历史规律可能变化，因此任何模型都不能保证未来误差为零。',
  },
  {
    eyebrow: '实验数据划分',
    title: '训练区间与独立评估区间都来自历史数据',
    summary: '本实验按时间顺序选择两个互不重叠的历史区间。较早区间用于拟合模型，较晚区间暂不参与拟合，用来模拟在当时只掌握过去数据时的预测表现。',
    accent: 'from-emerald-50 via-white to-cyan-50',
    badge: 'bg-emerald-100 text-emerald-700',
    points: [
      { title: '训练区间', description: '用于估计模型参数、拟合预处理器，并在需要时从训练区间内部再划分时间验证段。' },
      { title: '独立评估区间', description: '保留真实销量，只在模型完成预测后计算RMSE、MAE、MAPE和R²，不用于选择内部参数或校准不确定性。' },
      { title: '真正的未来预测', description: '完成模型比较后，系统会另行准备生产预测模型，再预测历史数据末尾之后尚未观测的月份。' },
    ],
    note: '这里应称“评估区间”，而不是“预测时间段”。它是历史留出数据；真正未来月份没有可供评分的真实销量。',
  },
  {
    eyebrow: '模型比较与融合',
    title: '先完成至少两个基础模型，再训练融合模型',
    summary: 'MA、一次指数平滑、ARIMA和LSTM使用同一独立评估区间。完成基础模型后，可从已完成模型中至少选择两个，训练加权平均、Boosting或Stacking。',
    accent: 'from-purple-50 via-white to-rose-50',
    badge: 'bg-purple-100 text-purple-700',
    points: [
      { title: '同口径比较', description: 'RMSE和MAE只有在相同目标、相同量纲及相同评估区间下才可直接比较；R²作为辅助指标。' },
      { title: '融合不是自动提升', description: '融合方法会使用训练区间内部的时间留出数据学习权重、模型链或元模型，但仍可能不如最佳基础模型。' },
      { title: '选择当前方案', description: '综合独立评估误差、不确定性质量、模型复杂度和业务可解释性，选择更适合当前实验数据的方案。' },
    ],
    note: '不存在对所有数据都“最佳”的模型。独立评估结果只说明当前历史留出区间的表现，不能证明未来仍保持同一排名。',
  },
];

const ScenarioIntroduction: React.FC = () => {
  const navigate = useNavigate();
  const [hasViewedAll, setHasViewedAll] = useState(false);
  const [viewedSlides, setViewedSlides] = useState<Set<number>>(new Set([0]));
  const [activeSlideIndex, setActiveSlideIndex] = useState(0);

  const handleSlideChange = (swiper: SwiperType) => {
    const currentIndex = swiper.realIndex;
    setActiveSlideIndex(currentIndex);

    // 记录已访问的教学页索引
    setViewedSlides((prev) => {
      const newSet = new Set(prev);
      newSet.add(currentIndex);

      // 如果已经访问过所有教学页，标记为已全部查看
      if (newSet.size >= scenarioSlides.length) {
        setHasViewedAll(true);
      }

      return newSet;
    });
  };

  const handlePrevious = () => {
    navigate('/data');
  };

  const handleNext = () => {
    if (hasViewedAll) {
      navigate('/model/role-intro');
    }
  };

  return (
    <div className="h-full flex flex-col gap-4">
      {/* 自定义样式 */}
      <style>{paginationStyle}</style>

      {/* 可访问、可维护的情境教学轮播 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex-1 flex items-center justify-center min-h-0 overflow-hidden">
        {/* 轮播容器：宽度100%，高度为宽度的9/16，但不超过父容器高度 */}
        <div className="relative w-full max-h-full" style={{ aspectRatio: '16/9' }}>
          <Swiper
            modules={[A11y, Navigation, Pagination]}
            a11y={{
              enabled: true,
              containerRole: 'region',
              containerMessage: '模型实验情境介绍',
              containerRoleDescriptionMessage: '教学内容轮播',
              itemRoleDescriptionMessage: '教学页',
              slideLabelMessage: '第 {{index}} 页，共 {{slidesLength}} 页',
              prevSlideMessage: '上一教学页',
              nextSlideMessage: '下一教学页',
              paginationBulletMessage: '转到第 {{index}} 教学页',
            }}
            navigation={{
              prevEl: '.swiper-button-prev-custom',
              nextEl: '.swiper-button-next-custom',
            }}
            pagination={{
              clickable: true,
              el: '.swiper-pagination-custom',
            }}
            loop={true}
            speed={800}
            onSlideChange={handleSlideChange}
            className="h-full w-full rounded-lg"
          >
            {scenarioSlides.map((slide, slideIndex) => (
              <SwiperSlide
                key={slide.title}
                aria-hidden={activeSlideIndex !== slideIndex}
              >
                <div className={`h-full overflow-y-auto bg-gradient-to-br ${slide.accent} px-10 py-5 sm:px-14 sm:py-5`}>
                  <div className="mx-auto flex min-h-full max-w-5xl flex-col justify-center">
                    <span className={`w-fit rounded-full px-3 py-1 text-sm font-semibold ${slide.badge}`}>
                      {slide.eyebrow}
                    </span>
                    <h2 className="mt-3 text-2xl font-bold text-gray-900 sm:text-3xl">{slide.title}</h2>
                    <p className="mt-2 max-w-4xl text-sm leading-6 text-gray-700 sm:text-base">{slide.summary}</p>
                    <div className="mt-4 grid gap-3 md:grid-cols-3">
                      {slide.points.map((point, index) => (
                        <div key={point.title} className="rounded-xl border border-white/80 bg-white/85 p-3 shadow-sm backdrop-blur-sm">
                          <div className="flex items-center gap-2">
                            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white">
                              {index + 1}
                            </span>
                            <h3 className="font-semibold text-gray-900">{point.title}</h3>
                          </div>
                          <p className="mt-2 text-sm leading-5 text-gray-600">{point.description}</p>
                        </div>
                      ))}
                    </div>
                    <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50/90 px-4 py-2 text-sm leading-5 text-amber-900">
                      <span className="font-semibold">教学提示：</span>{slide.note}
                    </p>
                  </div>
                </div>
              </SwiperSlide>
            ))}

            {/* 左侧切换按钮 */}
            <button
              type="button"
              className="swiper-button-prev-custom absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/90 hover:bg-white rounded-full shadow-lg flex items-center justify-center transition-all hover:scale-110 z-10"
              aria-label="上一教学页"
            >
              <ChevronLeft className="w-6 h-6 text-gray-700" />
            </button>

            {/* 右侧切换按钮 */}
            <button
              type="button"
              className="swiper-button-next-custom absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/90 hover:bg-white rounded-full shadow-lg flex items-center justify-center transition-all hover:scale-110 z-10"
              aria-label="下一教学页"
            >
              <ChevronRight className="w-6 h-6 text-gray-700" />
            </button>

            {/* 底部分页器 */}
            <div
              className="swiper-pagination-custom absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-2 z-10"
              role="group"
              aria-label="选择教学页"
            ></div>
          </Swiper>
        </div>
      </div>

      {/* 底部导航按钮 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 flex-shrink-0">
        <div className="flex justify-between items-center">
          <button
            type="button"
            onClick={handlePrevious}
            className="flex items-center gap-2 px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors font-medium"
          >
            <ChevronLeft className="w-5 h-5" />
            上一步
          </button>

          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={handleNext}
              disabled={!hasViewedAll}
              className={`flex items-center gap-2 px-6 py-3 rounded-lg transition-colors font-medium ${
                hasViewedAll
                  ? 'bg-blue-600 hover:bg-blue-700 text-white cursor-pointer'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
              title={!hasViewedAll ? '请先查看所有教学页' : ''}
            >
              下一步
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ScenarioIntroduction;
