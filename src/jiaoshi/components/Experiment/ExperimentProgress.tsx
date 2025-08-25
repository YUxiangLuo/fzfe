import React, { useState } from 'react';
import { Search, TrendingUp, Users, Clock, Play } from 'lucide-react';
import { ExperimentProgress as Progress } from '../../types';

const ExperimentProgress: React.FC = () => {
  const [progressData, setProgressData] = useState<Progress[]>([
    {
      studentId: '2022001',
      studentName: '张三',
      progress: 85,
      stayTime: 120,
      startTime: '2024-03-01 09:30:00'
    },
    {
      studentId: '2022002',
      studentName: '李四',
      progress: 92,
      stayTime: 95,
      startTime: '2024-03-01 10:15:00'
    },
    {
      studentId: '2023001',
      studentName: '王五',
      progress: 67,
      stayTime: 180,
      startTime: '2024-03-01 08:45:00'
    },
    {
      studentId: '2022003',
      studentName: '赵六',
      progress: 100,
      stayTime: 85,
      startTime: '2024-03-01 11:00:00'
    }
  ]);

  const [selectedClass, setSelectedClass] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredData, setFilteredData] = useState(progressData);

  const classes = [
    { id: '1', name: '软件工程2022级' },
    { id: '2', name: '计算机科学2023级' }
  ];

  // 筛选功能
  React.useEffect(() => {
    let filtered = progressData;

    if (searchTerm) {
      filtered = filtered.filter(item => 
        item.studentId.includes(searchTerm) || 
        item.studentName.includes(searchTerm)
      );
    }

    setFilteredData(filtered);
  }, [progressData, searchTerm]);

  // 计算统计数据
  const averageProgress = Math.round(progressData.reduce((sum, item) => sum + item.progress, 0) / progressData.length);
  const completedCount = progressData.filter(item => item.progress === 100).length;
  const incompleteCount = progressData.length - completedCount;
  const completionRate = Math.round((completedCount / progressData.length) * 100);

  const getProgressColor = (progress: number) => {
    if (progress >= 90) return 'bg-green-500';
    if (progress >= 70) return 'bg-blue-500';
    if (progress >= 50) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getProgressBgColor = (progress: number) => {
    if (progress >= 90) return 'bg-green-100';
    if (progress >= 70) return 'bg-blue-100';
    if (progress >= 50) return 'bg-yellow-100';
    return 'bg-red-100';
  };

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">实验进度</h1>
      </div>

      {/* 筛选器 */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">选择班级</label>
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">全部班级</option>
              {classes.map((cls) => (
                <option key={cls.id} value={cls.id}>{cls.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">按姓名搜索</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="输入姓名"
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">按学号搜索</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
              <input
                type="text"
                placeholder="输入学号"
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center">
            <TrendingUp className="w-8 h-8 text-blue-600 mr-3" />
            <div>
              <p className="text-sm text-gray-600">课程平均进度</p>
              <p className="text-2xl font-bold text-gray-900">{averageProgress}%</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center">
            <Users className="w-8 h-8 text-green-600 mr-3" />
            <div>
              <p className="text-sm text-gray-600">已完成人数</p>
              <p className="text-2xl font-bold text-gray-900">{completedCount}</p>
              <p className="text-xs text-green-600">完成率 {completionRate}%</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center">
            <Clock className="w-8 h-8 text-orange-600 mr-3" />
            <div>
              <p className="text-sm text-gray-600">未完成人数</p>
              <p className="text-2xl font-bold text-gray-900">{incompleteCount}</p>
              <p className="text-xs text-orange-600">待完成 {100 - completionRate}%</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center">
            <Play className="w-8 h-8 text-purple-600 mr-3" />
            <div>
              <p className="text-sm text-gray-600">总参与人数</p>
              <p className="text-2xl font-bold text-gray-900">{progressData.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* 进度列表 */}
      <div className="bg-white rounded-lg shadow-md">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">学生实验进度详情</h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">姓名</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">学号</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">实验进度</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">停留时间</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">开始时间</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredData.map((item) => (
                <tr key={item.studentId} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {item.studentName}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {item.studentId}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center space-x-3">
                      <div className="w-24 bg-gray-200 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full transition-all duration-300 ${getProgressColor(item.progress)}`}
                          style={{ width: `${item.progress}%` }}
                        ></div>
                      </div>
                      <span className={`px-2 py-1 text-xs rounded-full font-medium ${getProgressBgColor(item.progress)} ${
                        item.progress >= 90 ? 'text-green-800' :
                        item.progress >= 70 ? 'text-blue-800' :
                        item.progress >= 50 ? 'text-yellow-800' : 'text-red-800'
                      }`}>
                        {item.progress}%
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div className="flex items-center">
                      <Clock className="w-4 h-4 text-gray-400 mr-1" />
                      {formatDuration(item.stayTime)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {item.startTime}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ExperimentProgress;