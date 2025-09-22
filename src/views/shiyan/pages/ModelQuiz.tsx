import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useExperiment } from '../contexts/ExperimentContext';
import { BookOpenCheck, ChevronRight } from 'lucide-react';

const quizData = [
  {
    id: 1,
    type: 'single',
    question: '在时间序列分析中，ARIMA模型的"I"代表什么？',
    options: ['自回归（Autoregressive）', '差分（Integrated）', '移动平均（Moving Average）', '季节性（Seasonality）'],
  },
  {
    id: 2,
    type: 'multiple',
    question: '以下哪些是集成学习（Ensemble Learning）的方法？',
    options: ['Boosting', 'Bagging', 'Stacking', 'K-Means聚类'],
  },
  {
    id: 3,
    type: 'truefalse',
    question: 'LSTM（长短期记忆网络）是一种特殊的循环神经网络（RNN），它能有效解决梯度消失问题。',
    options: ['正确', '错误'],
  },
  {
    id: 4,
    type: 'single',
    question: '评估回归模型性能时，哪个指标越接近1越好？',
    options: ['RMSE (均方根误差)', 'MAE (平均绝对误差)', 'R² (决定系数)', 'MAPE (平均绝对百分比误差)'],
  },
];

const ModelQuiz: React.FC = () => {
  const navigate = useNavigate();
  const { updateState } = useExperiment();

  const handleSubmitQuiz = async () => {
    // 在实际应用中，这里会先校验答案
    // 然后将测验结果保存到后端
    
    // 更新全局状态，标记测验已完成
    await updateState({ 
      quiz_about_model_completed: true,
    });
    
    // 导航到下一个最终步骤
    navigate('/production');
  };

  return (
    <div className="p-8">
      <div className="w-full max-w-4xl mx-auto">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4 flex items-center">
            <BookOpenCheck className="w-8 h-8 mr-3 text-blue-600" />
            预测模型知识测验
          </h1>
          <p className="text-lg text-gray-600">
            在制定生产计划前，请完成以下测验，确保您已充分理解预测模型的基本原理。
          </p>
        </header>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 space-y-8">
          {quizData.map((item, index) => (
            <div key={item.id} className="border-b border-gray-200 pb-6 last:border-b-0">
              <p className="font-semibold text-gray-800 mb-4">
                {index + 1}. {item.question} 
                <span className="ml-2 text-sm font-normal text-gray-500">
                  ({item.type === 'single' ? '单选题' : item.type === 'multiple' ? '多选题' : '判断题'})
                </span>
              </p>
              <div className="space-y-3">
                {item.options.map((option, optionIndex) => (
                  <label key={optionIndex} className="flex items-center p-3 rounded-lg hover:bg-gray-50 cursor-pointer">
                    <input
                      type={item.type === 'multiple' ? 'checkbox' : 'radio'}
                      name={`question-${item.id}`}
                      className={item.type === 'multiple' ? 'h-4 w-4 rounded' : 'h-4 w-4'}
                    />
                    <span className="ml-3 text-gray-700">{option}</span>
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>

        <footer className="mt-8 text-center">
          <button
            onClick={handleSubmitQuiz}
            className="w-full md:w-auto inline-flex items-center justify-center px-8 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-all"
          >
            提交答案，开始制定生产计划
            <ChevronRight className="w-5 h-5 ml-2" />
          </button>
        </footer>
      </div>
    </div>
  );
};

export default ModelQuiz;
