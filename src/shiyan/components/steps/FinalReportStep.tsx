import React, { useState } from 'react';
import { FileText, Download, BookOpen, Award, CheckCircle2 } from 'lucide-react';
import { User } from '../../App';

interface FinalReportStepProps {
  data: any;
  onUpdate: (data: any) => void;
  user: User | null;
}

const FinalReportStep: React.FC<FinalReportStepProps> = ({ data, onUpdate, user }) => {
  const [reportText, setReportText] = useState(data.reportText || '');
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState(data.answers || {});
  const [showResults, setShowResults] = useState(data.showResults || false);

  const questions = [
    {
      id: 1,
      question: "哪种预测方法通常最适合具有强季节性模式的数据？",
      options: [
        "简单移动平均",
        "带季节性的指数平滑",
        "线性回归",
        "随机游走"
      ],
      correct: 1
    },
    {
      id: 2,
      question: "RMSE在预测评估中测量什么？",
      options: [
        "预测值与实际值之间的相关性",
        "平均绝对误差",
        "误差的均方根",
        "百分比误差"
      ],
      correct: 2
    },
    {
      id: 3,
      question: "在生产计划中，追逐策略的主要优势是什么？",
      options: [
        "保持稳定的劳动力",
        "最小化库存成本",
        "降低复杂性",
        "保证高服务水平"
      ],
      correct: 1
    },
    {
      id: 4,
      question: "以下哪项最好地描述了集成预测？",
      options: [
        "使用单一高精度模型",
        "结合多个预测模型",
        "仅预测季节性模式",
        "仅使用历史数据"
      ],
      correct: 1
    },
    {
      id: 5,
      question: "生产计划中安全库存的主要目的是什么？",
      options: [
        "降低生产成本",
        "增加销售",
        "缓冲需求不确定性",
        "提高预测准确性"
      ],
      correct: 2
    }
  ];

  const handleAnswerSelect = (answerIndex: number) => {
    const newAnswers = { ...answers, [questions[currentQuestion].id]: answerIndex };
    setAnswers(newAnswers);
    onUpdate({ ...data, answers: newAnswers });
  };

  const calculateScore = () => {
    let correct = 0;
    questions.forEach(question => {
      if (answers[question.id] === question.correct) {
        correct++;
      }
    });
    return (correct / questions.length) * 100;
  };

  const handleSubmitTest = () => {
    setShowResults(true);
    onUpdate({ ...data, showResults: true, finalScore: calculateScore() });
  };

  const generateReport = () => {
    const selectedModel = data.selectedModel || 'arima';
    const industry = data.selectedIndustry || 'retail';
    const company = data.selectedCompany || 'retail-1';
    
    const modelNames: { [key: string]: string } = {
      'moving-average': '移动平均',
      'exponential-smoothing': '指数平滑',
      'arima': 'ARIMA',
      'lstm': 'LSTM神经网络',
      'ensemble': '集成方法'
    };

    const industryNames: { [key: string]: string } = {
      'retail': '零售',
      'manufacturing': '制造业',
      'technology': '科技',
      'automotive': '汽车',
      'aerospace': '航空航天',
      'construction': '建筑'
    };
    
    return `
需求预测与生产计划报告

学生：${user?.name || '学生'}
日期：${new Date().toLocaleDateString('zh-CN')}
行业：${industryNames[industry] || industry}
公司：${company}

执行摘要
本报告展示了综合需求预测和生产计划仿真的结果。分析涵盖了模型选择、参数优化、准确性评估和生产计划策略。

方法论
选择的预测模型：${modelNames[selectedModel] || selectedModel}
规划周期：${data.planningHorizon === '6months' ? '6个月' : data.planningHorizon || '6个月'}
生产策略：${data.strategy === 'chase' ? '追逐策略' : data.strategy === 'level' ? '水平策略' : data.strategy === 'hybrid' ? '混合策略' : data.strategy || '追逐策略'}

主要发现
1. 预测准确性：所选模型达到了具有竞争力的性能指标
2. 生产计划：实施了${data.strategy === 'chase' ? '追逐' : data.strategy === 'level' ? '水平' : data.strategy === 'hybrid' ? '混合' : '追逐'}策略，考虑了产能约束
3. 库存管理：维持了适当的安全库存水平

建议
- 定期监控模型性能并根据需要重新训练
- 考虑集成方法以提高准确性
- 实施定期需求模式分析
- 为需求变化保持灵活的生产能力

结论
仿真成功展示了需求预测和生产计划方法在商业环境中的实际应用。
    `.trim();
  };

  const handleReportChange = (text: string) => {
    setReportText(text);
    onUpdate({ ...data, reportText: text });
  };

  const handleDownloadReport = () => {
    const reportContent = reportText || generateReport();
    const blob = new Blob([reportContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `预测报告-${user?.name || '学生'}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">最终报告与评估</h2>
        <p className="text-gray-600">
          通过生成综合报告和参加最终评估测试来完成您的仿真。
        </p>
      </div>

      {/* Report Section */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <FileText className="h-5 w-5 text-blue-600" />
            <h3 className="text-lg font-semibold text-gray-900">仿真报告</h3>
          </div>
          <button
            onClick={handleDownloadReport}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Download className="h-4 w-4" />
            <span>下载报告</span>
          </button>
        </div>

        <div className="mb-4">
          <button
            onClick={() => handleReportChange(generateReport())}
            className="text-sm text-blue-600 hover:text-blue-700 mb-2"
          >
            生成自动报告
          </button>
          <textarea
            value={reportText}
            onChange={(e) => handleReportChange(e.target.value)}
            className="w-full h-64 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
            placeholder='在此编写您的仿真报告，或点击"生成自动报告"获取模板...'
          />
        </div>

        <div className="bg-blue-50 p-4 rounded-lg">
          <h4 className="font-medium text-blue-900 mb-2">报告指南</h4>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>• 包含执行摘要和主要发现</li>
            <li>• 描述方法论和模型选择理由</li>
            <li>• 展示准确性指标和性能分析</li>
            <li>• 讨论生产计划策略和约束</li>
            <li>• 提供改进建议</li>
          </ul>
        </div>
      </div>

      {/* Assessment Test */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center space-x-2 mb-6">
          <BookOpen className="h-5 w-5 text-green-600" />
          <h3 className="text-lg font-semibold text-gray-900">知识评估测试</h3>
        </div>

        {!showResults ? (
          <div>
            <div className="mb-6">
              <div className="flex justify-between text-sm text-gray-500 mb-2">
                <span>第 {currentQuestion + 1} 题，共 {questions.length} 题</span>
                <span>{Math.round(((currentQuestion + 1) / questions.length) * 100)}% 完成</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-green-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${((currentQuestion + 1) / questions.length) * 100}%` }}
                ></div>
              </div>
            </div>

            <div className="mb-6">
              <h4 className="text-lg font-medium text-gray-900 mb-4">
                {questions[currentQuestion].question}
              </h4>
              
              <div className="space-y-3">
                {questions[currentQuestion].options.map((option, index) => (
                  <label key={index} className="block">
                    <input
                      type="radio"
                      name={`question-${questions[currentQuestion].id}`}
                      value={index}
                      checked={answers[questions[currentQuestion].id] === index}
                      onChange={() => handleAnswerSelect(index)}
                      className="sr-only"
                    />
                    <div className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                      answers[questions[currentQuestion].id] === index
                        ? 'border-green-500 bg-green-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}>
                      <div className="flex items-center space-x-3">
                        <div className={`w-5 h-5 border-2 rounded-full flex items-center justify-center ${
                          answers[questions[currentQuestion].id] === index
                            ? 'border-green-500 bg-green-500'
                            : 'border-gray-300'
                        }`}>
                          {answers[questions[currentQuestion].id] === index && (
                            <span className="text-white text-xs font-bold">✓</span>
                          )}
                        </div>
                        <span className="text-gray-900">{option}</span>
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <div className="flex justify-between">
              <button
                onClick={() => setCurrentQuestion(Math.max(0, currentQuestion - 1))}
                disabled={currentQuestion === 0}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  currentQuestion === 0
                    ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                上一题
              </button>

              {currentQuestion === questions.length - 1 ? (
                <button
                  onClick={handleSubmitTest}
                  disabled={Object.keys(answers).length < questions.length}
                  className={`px-6 py-2 rounded-lg transition-colors ${
                    Object.keys(answers).length < questions.length
                      ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                      : 'bg-green-600 text-white hover:bg-green-700'
                  }`}
                >
                  提交测试
                </button>
              ) : (
                <button
                  onClick={() => setCurrentQuestion(Math.min(questions.length - 1, currentQuestion + 1))}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  下一题
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="text-center">
            <div className="mb-6">
              <Award className="h-16 w-16 text-yellow-500 mx-auto mb-4" />
              <h4 className="text-2xl font-bold text-gray-900 mb-2">测试完成！</h4>
              <p className="text-gray-600">您已成功完成评估</p>
            </div>

            <div className="bg-gradient-to-r from-green-500 to-blue-600 text-white rounded-xl p-6 mb-6">
              <div className="text-4xl font-bold mb-2">{calculateScore().toFixed(0)}%</div>
              <div className="text-green-100">最终得分</div>
            </div>

            <div className="grid md:grid-cols-2 gap-4 mb-6">
              <div className="bg-green-50 p-4 rounded-lg">
                <p className="text-green-900 font-medium">正确答案</p>
                <p className="text-2xl font-bold text-green-900">
                  {questions.filter(q => answers[q.id] === q.correct).length} / {questions.length}
                </p>
              </div>
              <div className="bg-blue-50 p-4 rounded-lg">
                <p className="text-blue-900 font-medium">等级</p>
                <p className="text-2xl font-bold text-blue-900">
                  {calculateScore() >= 80 ? 'A' : calculateScore() >= 70 ? 'B' : calculateScore() >= 60 ? 'C' : 'D'}
                </p>
              </div>
            </div>

            <div className="text-left">
              <h5 className="font-medium text-gray-900 mb-3">答案回顾</h5>
              <div className="space-y-3">
                {questions.map((question, index) => (
                  <div key={question.id} className="p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-start space-x-2">
                      {answers[question.id] === question.correct ? (
                        <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                      ) : (
                        <span className="w-5 h-5 bg-red-100 text-red-600 rounded-full flex items-center justify-center text-xs font-bold mt-0.5 flex-shrink-0">
                          ✗
                        </span>
                      )}
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900 mb-1">
                          第{index + 1}题：{question.question}
                        </p>
                        <p className="text-sm text-gray-600">
                          正确答案：{question.options[question.correct]}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {showResults && (
        <div className="mt-8 p-6 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl text-center">
          <h3 className="text-xl font-bold mb-2">恭喜！</h3>
          <p className="text-blue-100">
            您已成功完成企业需求预测与生产计划仿真。
            您的报告和测试结果已保存。
          </p>
        </div>
      )}
    </div>
  );
};

export default FinalReportStep;