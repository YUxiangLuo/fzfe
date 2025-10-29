import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { DOWNLOAD_SERVER_BASE_URL } from '../../../../config/appConfig';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, Pagination, Autoplay } from 'swiper/modules';
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

  // 图片列表（暂时用同一张图片代替）
  const images = [
    `${DOWNLOAD_SERVER_BASE_URL}/images/yuceqingjing.png`,
    `${DOWNLOAD_SERVER_BASE_URL}/images/yuceqingjing.png`,
  ];

  const handlePrevious = () => {
    navigate('/data');
  };

  const handleNext = () => {
    navigate('/model/role-intro');
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
            autoplay={{
              delay: 5000,
              disableOnInteraction: false,
              pauseOnMouseEnter: true,
            }}
            loop={true}
            speed={800}
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
          <button
            onClick={handleNext}
            className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium"
          >
            下一步
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ScenarioIntroduction;
