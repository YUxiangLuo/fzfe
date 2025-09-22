import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useExperiment } from '../contexts/ExperimentContext';
import { BookOpenCheck, ChevronRight } from 'lucide-react';

const quizData = [
  {
    id: 1,
    type: 'single',
    question: '库存平衡公式中，期末库存是如何计算的？',
    options: [
      '期初库存 + 预测需求 - 计划产出',
      '期初库存 + 计划产出 - 预测需求',
      '计划产出 - 预测需求',
      '期初库存 - 预测需求',
    ],
  },
  {
    id: 2,
    type: 'truefalse',
    question: '追求100%的服务水平是所有企业生产计划的最终目标。',
    options: ['正确', '错误'],
  },
  {
    id: 3,
    type: 'single',
    question: '“计划生产量”相比“需求预测结果”，多考虑了哪个因素？',
    options: ['客户订单', '安全库存', '生产成本', '上期缺货量'],
  },
  {
    id: 4,
    type: 'multiple',
    question: '以下哪些是“生产投入量”公式的组成部分？',
    options: ['计划生产量', '上期期末库存', '上期缺货量', '本期服务水平'],
  },
];

const PlanQuiz: React.FC = () => {
  const navigate = useNavigate();
  const { updateState } = useExperiment();

  const handleSubmitQuiz = async () => {
    await updateState({ 
      quiz_about_plan_completed: true,
    });
    
    navigate('/report');
  };

  return (
    <div className="p-8">
      <div className="w-full max-w-4xl mx-auto">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4 flex items-center">
            <BookOpenCheck className="w-8 h-8 mr-3 text-green-600" />
            生产计划知识测验
          </h1>
          <p className="text-lg text-gray-600">
            在撰写实验报告前，请完成最后的测验，检验您对生产计划核心概念的理解。
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
            className="w-full md:w-auto inline-flex items-center justify-center px-8 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-all"
          >
            提交答案，开始编写实验报告
            <ChevronRight className="w-5 h-5 ml-2" />
          </button>
        </footer>
      </div>
    </div>
  );
};

export default PlanQuiz;
