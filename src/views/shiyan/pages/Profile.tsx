import React from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Mail, Calendar, BookOpen, Award, Clock, TrendingUp, X, CheckCircle } from 'lucide-react';

const Profile: React.FC = () => {
  const navigate = useNavigate();

  const handleExit = () => {
    navigate('/industry');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      {/* 退出按钮 */}
      <button
        onClick={handleExit}
        className="absolute top-6 right-6 p-2 text-gray-600 hover:text-gray-900 hover:bg-white hover:shadow-md rounded-lg transition-all z-10"
      >
        <X className="w-6 h-6" />
      </button>

      <div className="min-h-screen flex flex-col">
        {/* 标题区域 */}
        <div className="bg-white border-b border-gray-200 px-8 pt-12 pb-8">
          <div className="max-w-6xl mx-auto text-center">
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              个人学习档案
            </h1>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              查看您的学习进度、成就记录和个人资料信息
            </p>
          </div>
        </div>

        {/* 内容区域 */}
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="max-w-6xl mx-auto w-full">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* 个人资料卡片 */}
              <div className="lg:col-span-1">
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
                  <div className="text-center mb-8">
                    <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center mx-auto mb-6">
                      <User className="w-12 h-12 text-white" />
                    </div>
                    <h2 className="text-2xl font-semibold text-gray-900 mb-2">张同学</h2>
                    <p className="text-gray-600 text-lg">学生</p>
                  </div>

                  <div className="space-y-6">
                    <div className="flex items-center space-x-4">
                      <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                        <Mail className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <div className="text-sm text-gray-500">邮箱地址</div>
                        <div className="font-medium text-gray-900">zhang.student@university.edu.cn</div>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-4">
                      <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                        <BookOpen className="w-5 h-5 text-green-600" />
                      </div>
                      <div>
                        <div className="text-sm text-gray-500">专业</div>
                        <div className="font-medium text-gray-900">工商管理专业</div>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-4">
                      <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                        <Calendar className="w-5 h-5 text-purple-600" />
                      </div>
                      <div>
                        <div className="text-sm text-gray-500">入学时间</div>
                        <div className="font-medium text-gray-900">2024年</div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-8 pt-8 border-t border-gray-200">
                    <button className="w-full px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all shadow-md hover:shadow-lg font-medium">
                      编辑个人资料
                    </button>
                  </div>
                </div>
              </div>

              {/* 学习进度和成就 */}
              <div className="lg:col-span-2 space-y-8">
                {/* 学习进度卡片 */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
                  <div className="flex items-center space-x-4 mb-8">
                    <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                      <TrendingUp className="w-6 h-6 text-green-600" />
                    </div>
                    <h3 className="text-2xl font-semibold text-gray-900">学习进度</h3>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-6 border border-blue-200">
                      <div className="text-3xl font-bold text-blue-600 mb-2">0/7</div>
                      <div className="text-blue-700 font-medium">已完成步骤</div>
                    </div>
                    <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-6 border border-green-200">
                      <div className="text-3xl font-bold text-green-600 mb-2">0%</div>
                      <div className="text-green-700 font-medium">总体进度</div>
                    </div>
                    <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl p-6 border border-orange-200">
                      <div className="text-3xl font-bold text-orange-600 mb-2">0分钟</div>
                      <div className="text-orange-700 font-medium">学习时长</div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="text-lg font-semibold text-gray-900">实验步骤完成情况</h4>
                    {[
                      { step: 1, title: '选择行业', completed: false },
                      { step: 2, title: '选择企业', completed: false },
                      { step: 3, title: '选择产品', completed: false },
                      { step: 4, title: '历史数据分析', completed: false },
                      { step: 5, title: '预测模型建立', completed: false },
                      { step: 6, title: '结果评估', completed: false },
                      { step: 7, title: '生产计划制定', completed: false },
                    ].map((item) => (
                      <div key={item.step} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
                        <div className="flex items-center space-x-4">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                            item.completed 
                              ? 'bg-green-600 text-white' 
                              : 'bg-gray-300 text-gray-600'
                          }`}>
                            {item.completed ? <CheckCircle className="w-4 h-4" /> : item.step}
                          </div>
                          <span className="text-gray-900 font-medium">{item.title}</span>
                        </div>
                        <span className={`text-sm font-medium px-3 py-1 rounded-full ${
                          item.completed 
                            ? 'bg-green-100 text-green-700' 
                            : 'bg-gray-100 text-gray-600'
                        }`}>
                          {item.completed ? '已完成' : '未开始'}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* 进度条 */}
                  <div className="mt-8 pt-8 border-t border-gray-200">
                    <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-gray-600 font-medium">总体进度</span>
                        <span className="text-lg font-bold text-gray-900">0/7</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-3">
                        <div 
                          className="bg-gradient-to-r from-blue-400 to-blue-600 h-3 rounded-full transition-all duration-500"
                          style={{ width: '0%' }}
                        ></div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 学习成就卡片 */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
                  <div className="flex items-center space-x-4 mb-8">
                    <div className="w-12 h-12 bg-yellow-100 rounded-xl flex items-center justify-center">
                      <Award className="w-6 h-6 text-yellow-600" />
                    </div>
                    <h3 className="text-2xl font-semibold text-gray-900">学习成就</h3>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {[
                      { 
                        icon: BookOpen, 
                        title: '初学者', 
                        desc: '完成第一个实验步骤',
                        color: 'bg-blue-100 text-blue-600'
                      },
                      { 
                        icon: TrendingUp, 
                        title: '数据分析师', 
                        desc: '完成历史数据分析',
                        color: 'bg-green-100 text-green-600'
                      },
                      { 
                        icon: Award, 
                        title: '预测专家', 
                        desc: '成功建立预测模型',
                        color: 'bg-purple-100 text-purple-600'
                      },
                      { 
                        icon: Clock, 
                        title: '决策制定者', 
                        desc: '完成生产计划制定',
                        color: 'bg-orange-100 text-orange-600'
                      },
                    ].map((achievement, index) => {
                      const IconComponent = achievement.icon;
                      return (
                        <div key={index} className="p-6 bg-gray-50 rounded-xl border border-gray-200 opacity-50 hover:opacity-75 transition-opacity">
                          <div className="flex items-center space-x-4 mb-3">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${achievement.color}`}>
                              <IconComponent className="w-5 h-5" />
                            </div>
                            <span className="font-semibold text-gray-700">{achievement.title}</span>
                          </div>
                          <p className="text-gray-500 text-sm">{achievement.desc}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* 学习建议 */}
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl p-8">
                  <h4 className="text-xl font-semibold text-blue-800 mb-6">💡 学习建议</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h5 className="font-medium text-blue-700 mb-3">实验流程建议：</h5>
                      <ul className="space-y-2 text-blue-600 text-sm">
                        <li>• 建议按照步骤顺序完成实验，每个步骤都有重要的学习价值</li>
                        <li>• 在进行预测模型选择时，可以尝试不同的算法并比较效果</li>
                        <li>• 注意观察数据的特征和模式，这对选择合适的预测方法很重要</li>
                      </ul>
                    </div>
                    <div>
                      <h5 className="font-medium text-blue-700 mb-3">学习方法建议：</h5>
                      <ul className="space-y-2 text-blue-600 text-sm">
                        <li>• 完成实验后，可以思考如何将所学知识应用到实际商业场景中</li>
                        <li>• 建议记录每个步骤的关键发现和思考</li>
                        <li>• 可以尝试不同的参数配置，观察对预测结果的影响</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 底部导航区域 */}
        <div className="bg-white border-t border-gray-200 px-8 py-6">
          <div className="max-w-6xl mx-auto flex justify-center">
            <button
              onClick={handleExit}
              className="flex items-center space-x-2 px-8 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 shadow-md hover:shadow-lg transition-all font-medium"
            >
              <span>返回实验</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;