import React from 'react';
import { User, Mail, Calendar, BookOpen, Award, Clock, TrendingUp } from 'lucide-react';

const Profile: React.FC = () => {
  return (
    <div className="p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">个人信息</h1>
          <p className="text-lg text-gray-600">
            查看您的学习进度和个人资料信息
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="text-center mb-6">
                <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <User className="w-10 h-10 text-blue-600" />
                </div>
                <h2 className="text-xl font-semibold text-gray-900">张同学</h2>
                <p className="text-gray-600">学生</p>
              </div>

              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <Mail className="w-4 h-4 text-gray-500" />
                  <span className="text-sm text-gray-600">zhang.student@university.edu.cn</span>
                </div>
                <div className="flex items-center space-x-3">
                  <BookOpen className="w-4 h-4 text-gray-500" />
                  <span className="text-sm text-gray-600">工商管理专业</span>
                </div>
                <div className="flex items-center space-x-3">
                  <Calendar className="w-4 h-4 text-gray-500" />
                  <span className="text-sm text-gray-600">2024年入学</span>
                </div>
              </div>

              <div className="mt-6 pt-6 border-t border-gray-200">
                <button className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                  编辑资料
                </button>
              </div>
            </div>
          </div>

          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center space-x-3 mb-6">
                <TrendingUp className="w-6 h-6 text-green-600" />
                <h3 className="text-xl font-semibold text-gray-900">学习进度</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                  <div className="text-2xl font-bold text-blue-600">0/7</div>
                  <div className="text-sm text-blue-700">已完成步骤</div>
                </div>
                <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                  <div className="text-2xl font-bold text-green-600">0%</div>
                  <div className="text-sm text-green-700">总体进度</div>
                </div>
                <div className="bg-orange-50 rounded-lg p-4 border border-orange-200">
                  <div className="text-2xl font-bold text-orange-600">0分钟</div>
                  <div className="text-sm text-orange-700">学习时长</div>
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="font-medium text-gray-900">实验步骤完成情况</h4>
                {[
                  { step: 1, title: '选择行业', completed: false },
                  { step: 2, title: '选择企业', completed: false },
                  { step: 3, title: '选择产品', completed: false },
                  { step: 4, title: '历史数据分析', completed: false },
                  { step: 5, title: '预测模型建立', completed: false },
                  { step: 6, title: '结果评估', completed: false },
                  { step: 7, title: '生产计划制定', completed: false },
                ].map((item) => (
                  <div key={item.step} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold ${
                        item.completed 
                          ? 'bg-green-600 text-white' 
                          : 'bg-gray-300 text-gray-600'
                      }`}>
                        {item.step}
                      </div>
                      <span className="text-gray-900">{item.title}</span>
                    </div>
                    <span className={`text-sm ${
                      item.completed ? 'text-green-600' : 'text-gray-500'
                    }`}>
                      {item.completed ? '已完成' : '未开始'}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center space-x-3 mb-6">
                <Award className="w-6 h-6 text-yellow-600" />
                <h3 className="text-xl font-semibold text-gray-900">学习成就</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-gray-50 rounded-lg border border-gray-200 opacity-50">
                  <div className="flex items-center space-x-3 mb-2">
                    <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
                      <BookOpen className="w-4 h-4 text-gray-500" />
                    </div>
                    <span className="font-medium text-gray-600">初学者</span>
                  </div>
                  <p className="text-sm text-gray-500">完成第一个实验步骤</p>
                </div>

                <div className="p-4 bg-gray-50 rounded-lg border border-gray-200 opacity-50">
                  <div className="flex items-center space-x-3 mb-2">
                    <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
                      <TrendingUp className="w-4 h-4 text-gray-500" />
                    </div>
                    <span className="font-medium text-gray-600">数据分析师</span>
                  </div>
                  <p className="text-sm text-gray-500">完成历史数据分析</p>
                </div>

                <div className="p-4 bg-gray-50 rounded-lg border border-gray-200 opacity-50">
                  <div className="flex items-center space-x-3 mb-2">
                    <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
                      <Award className="w-4 h-4 text-gray-500" />
                    </div>
                    <span className="font-medium text-gray-600">预测专家</span>
                  </div>
                  <p className="text-sm text-gray-500">成功建立预测模型</p>
                </div>

                <div className="p-4 bg-gray-50 rounded-lg border border-gray-200 opacity-50">
                  <div className="flex items-center space-x-3 mb-2">
                    <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
                      <Clock className="w-4 h-4 text-gray-500" />
                    </div>
                    <span className="font-medium text-gray-600">决策制定者</span>
                  </div>
                  <p className="text-sm text-gray-500">完成生产计划制定</p>
                </div>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
              <h4 className="font-semibold text-blue-800 mb-3">学习建议</h4>
              <ul className="space-y-2 text-blue-700 text-sm">
                <li>• 建议按照步骤顺序完成实验，每个步骤都有重要的学习价值</li>
                <li>• 在进行预测模型选择时，可以尝试不同的算法并比较效果</li>
                <li>• 注意观察数据的特征和模式，这对选择合适的预测方法很重要</li>
                <li>• 完成实验后，可以思考如何将所学知识应用到实际商业场景中</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;