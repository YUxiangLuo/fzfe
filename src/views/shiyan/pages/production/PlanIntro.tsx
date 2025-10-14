import React from 'react';
import { useNavigate } from 'react-router-dom';
import { DOWNLOAD_SERVER_BASE_URL } from '../../../../config/appConfig';

const PlanIntro: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="h-full flex items-center justify-center">
      <div className="relative w-full max-w-4xl">
        <img
          src={`${DOWNLOAD_SERVER_BASE_URL}/images/shengchanjihua.png`}
          alt="生产计划情景提示"
          className="w-full h-auto rounded-2xl shadow-xl object-contain"
        />
        <button
          onClick={() => navigate('/production/overview')}
          className="absolute top-4 right-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-md transition-colors"
        >
          我已了解，开始制定计划
        </button>
      </div>
    </div>
  );
};

export default PlanIntro;
