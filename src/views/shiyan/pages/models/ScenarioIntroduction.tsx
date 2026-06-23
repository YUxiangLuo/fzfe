import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, Pagination, Autoplay } from 'swiper/modules';
import type { Swiper as SwiperType } from 'swiper';
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';

// 自定义分页器样式
const paginationStyle = `
  .swiper-pagination-custom .swiper-pagination-bullet {
    width: 8px;
    height: 8px;
    background: rgba(255, 255, 255, 0.7);
    opacity: 1;
    transition: all 0.3s;
  }
  .swiper-pagination-custom .swiper-pagination-bullet:hover {
    background: rgba(255, 255, 255, 1);
  }
  .swiper-pagination-custom .swiper-pagination-bullet-active {
    width: 24px;
    background: rgb(37, 99, 235);
    border-radius: 4px;
  }
`;

const ScenarioIntroduction: React.FC = () => {
  const navigate = useNavigate();
  const [hasViewedAll, setHasViewedAll] = useState(false);
  const [viewedSlides, setViewedSlides] = useState<Set<number>>(new Set([0])); // 初始包含第一张

  const images = [
    '/images/model1.png',
    '/images/model2.png',
    '/images/model3.png',
  ];

  const handleSlideChange = (swiper: SwiperType) => {
    const currentIndex = swiper.realIndex;

    // 记录已访问的图片索引
    setViewedSlides((prev) => {
      const newSet = new Set(prev);
      newSet.add(currentIndex);

      // 如果已经访问过所有图片，标记为已全部查看
      if (newSet.size >= images.length) {
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

      {/* 情境图片轮播展示 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex-1 flex items-center justify-center min-h-0 overflow-hidden">
        {/* 图片容器：宽度100%，高度为宽度的9/16，但不超过父容器高度 */}
        <div className="relative w-full max-h-full" style={{ aspectRatio: '16/9' }}>
          <Swiper
            modules={[Navigation, Pagination, Autoplay]}
            navigation={{
              prevEl: '.swiper-button-prev-custom',
              nextEl: '.swiper-button-next-custom',
            }}
            pagination={{
              clickable: true,
              el: '.swiper-pagination-custom',
            }}
            loop={true}
            autoplay={{
              delay: 4000,
              disableOnInteraction: false,
            }}
            speed={800}
            onSlideChange={handleSlideChange}
            className="h-full w-full rounded-lg"
          >
            {images.map((image, index) => (
              <SwiperSlide key={index}>
                <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                  <img
                    src={image}
                    alt={`需求预测情景介绍 ${index + 1}`}
                    className="h-full w-auto object-contain"
                  />
                </div>
              </SwiperSlide>
            ))}

            {/* 左侧切换按钮 */}
            <button
              className="swiper-button-prev-custom absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/90 hover:bg-white rounded-full shadow-lg flex items-center justify-center transition-all hover:scale-110 z-10"
              aria-label="上一张图片"
            >
              <ChevronLeft className="w-6 h-6 text-gray-700" />
            </button>

            {/* 右侧切换按钮 */}
            <button
              className="swiper-button-next-custom absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/90 hover:bg-white rounded-full shadow-lg flex items-center justify-center transition-all hover:scale-110 z-10"
              aria-label="下一张图片"
            >
              <ChevronRight className="w-6 h-6 text-gray-700" />
            </button>

            {/* 底部分页器 */}
            <div className="swiper-pagination-custom absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-2 z-10"></div>
          </Swiper>
        </div>
      </div>

      {/* 底部导航按钮 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 flex-shrink-0">
        <div className="flex justify-between items-center">
          <button
            onClick={handlePrevious}
            className="flex items-center gap-2 px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors font-medium"
          >
            <ChevronLeft className="w-5 h-5" />
            上一步
          </button>

          <div className="flex items-center gap-4">
            <button
              onClick={handleNext}
              disabled={!hasViewedAll}
              className={`flex items-center gap-2 px-6 py-3 rounded-lg transition-colors font-medium ${
                hasViewedAll
                  ? 'bg-blue-600 hover:bg-blue-700 text-white cursor-pointer'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
              title={!hasViewedAll ? '请先查看所有图片' : ''}
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
