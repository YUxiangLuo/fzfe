import React, { useState } from 'react';
import { Search, TrendingUp, Users, Clock, Play, CheckCircle, Circle, ChevronDown, ChevronRight } from 'lucide-react';
import { ExperimentProgress as Progress } from '../../types';

interface ProgressNode {
  id: string;
  name: string;
  completed: boolean;
  completedAt?: string;
}

interface DetailedProgress extends Progress {
  nodes: ProgressNode[];
}

const ExperimentProgress: React.FC = () => {
  const [progressData, setProgressData] = useState<DetailedProgress[]>([
    {
      studentId: '2022001',
      studentName: '张三',
      progress: 85,
      stayTime: 120,
      startTime: '2024-03-01 09:30:00',
      nodes: [
        { id: 'data-prep', name: '数据准备', completed: true, completedAt: '2024-03-01 10:15:00' },
        { id: 'data-stats', name: '数据统计', completed: true, completedAt: '2024-03-01 10:45:00' },
        { id: 'demand-forecast', name: '需求预测', completed: true, completedAt: '2024-03-01 11:20:00' },
        { id: 'production-plan', name: '生产计划制定', completed: true, completedAt: '2024-03-01 11:50:00' },
        { id: 'submit-report', name: '提交实验报告', completed: false }
      ]
    },
    {
      studentId: '2022002',
      studentName: '李四',
      progress: 92,
      stayTime: 95,
      startTime: '2024-03-01 10:15:00',
      nodes: [
        { id: 'data-prep', name: '数据准备', completed: true, completedAt: '2024-03-01 10:30:00' },
        { id: 'data-stats', name: '数据统计', completed: true, completedAt: '2024-03-01 10:50:00' },
        { id: 'demand-forecast', name: '需求预测', completed: true, completedAt: '2024-03-01 11:15:00' },
        { id: 'production-plan', name: '生产计划制定', completed: true, completedAt: '2024-03-01 11:40:00' },
        { id: 'submit-report', name: '提交实验报告', completed: true, completedAt: '2024-03-01 12:00:00' }
      ]
    },
    {
      studentId: '2023001',
      studentName: '王五',
      progress: 67,
      stayTime: 180,
      startTime: '2024-03-01 08:45:00',
      nodes: [
        { id: 'data-prep', name: '数据准备', completed: true, completedAt: '2024-03-01 09:15:00' },
        { id: 'data-stats', name: '数据统计', completed: true, completedAt: '2024-03-01 09:45:00' },
        { id: 'demand-forecast', name: '需求预测', completed: true, completedAt: '2024-03-01 10:30:00' },
        { id: 'production-plan', name: '生产计划制定', completed: false },
        { id: 'submit-report', name: '提交实验报告', completed: false }
      ]
    },
    {
      studentId: '2022003',
      studentName: '赵六',
      progress: 100,
      stayTime: 85,
      startTime: '2024-03-01 11:00:00',
      nodes: [
        { id: 'data-prep', name: '数据准备', completed: true, completedAt: '2024-03-01 11:20:00' },
        { id: 'data-stats', name: '数据统计', completed: true, completedAt: '2024-03-01 11:35:00' },
        { id: 'demand-forecast', name: '需求预测', completed: true, completedAt: '2024-03-01 11:50:00' },
        { id: 'production-plan', name: '生产计划制定', completed: true, completedAt: '2024-03-01 12:10:00' },
        { id: 'submit-report', name: '提交实验报告', completed: true, completedAt: '2024-03-01 12:25:00' }
      ]
    }
  ]);

  const [selectedClass, setSelectedClass] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredData, setFilteredData] = useState(progressData);
  const [expandedRows, setExpandedRows] = useState<string[]>([]);

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

  // 获取节点颜色
  const getNodeColor = (nodeName: string) => {
    const colorMap: { [key: string]: string } = {
      '数据准备': 'bg-blue-100 text-blue-800',
      '数据统计': 'bg-purple-100 text-purple-800', 
      '需求预测': 'bg-yellow-100 text-yellow-800',
      '生产计划制定': 'bg-orange-100 text-orange-800',
      '提交实验报告': 'bg-green-100 text-green-800',
      '未开始': 'bg-gray-100 text-gray-600'
    };
    return colorMap[nodeName] || 'bg-gray-100 text-gray-600';
  };

  // 获取最新已完成的节点信息
  const getLatestCompletedNodeInfo = (nodes: ProgressNode[]) => {
    // 找到最后一个已完成的节点
    const completedNodes = nodes.filter(node => node.completed);
    if (completedNodes.length === 0) {
      return { nodeName: '未开始' };
    }
    
    // 返回最后一个已完成的节点
    const latestCompleted = completedNodes[completedNodes.length - 1];
    return { nodeName: latestCompleted.name };
  };

  // 获取当前进行的节点信息（用于详情展示）
  const getCurrentNodeInfo = (nodes: ProgressNode[]) => {
    const completedNodes = nodes.filter(node => node.completed);
    if (completedNodes.length === 0) {
      return { nodeName: '未开始' };
    }
    
    // 返回最后一个已完成的节点
    const latestCompleted = completedNodes[completedNodes.length - 1];
    return { nodeName: '未开始' };
  };

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  const toggleRowExpansion = (studentId: string) => {
    setExpandedRows(prev => 
      prev.includes(studentId) 
        ? prev.filter(id => id !== studentId)
        : [...prev, studentId]
    );
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
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">操作</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredData.map((item) => (
                <React.Fragment key={item.studentId}>
                  <tr 
                    className="hover:bg-gray-50 transition-colors duration-200"
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {item.studentName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {item.studentId}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="space-y-2">
                        <div>
                          {(() => {
                            const latestInfo = getLatestCompletedNodeInfo(item.nodes);
                            return (
                              <span className={`px-3 py-1 rounded-full text-sm font-medium ${getNodeColor(latestInfo.nodeName)}`}>
                                {latestInfo.nodeName}
                              </span>
                            );
                          })()}
                        </div>
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
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <button
                        onClick={() => toggleRowExpansion(item.studentId)}
                        className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 hover:text-blue-700 transition-all duration-200"
                      >
                        {expandedRows.includes(item.studentId) ? '收起详情' : '展开详情'}
                      </button>
                    </td>
                  </tr>
                  {expandedRows.includes(item.studentId) && (
                    <tr>
                      <td colSpan={6} className="px-6 py-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-l-4 border-blue-400">
                        <div className="space-y-4">
                          <h4 className="text-sm font-semibold text-blue-900 mb-3 flex items-center">
                            <div className="w-2 h-2 bg-blue-500 rounded-full mr-2"></div>
                            实验节点详情
                          </h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {item.nodes.map((node, index) => (
                              <div key={node.id} className={`p-4 rounded-xl border-2 transition-all duration-200 ${
                                node.completed 
                                  ? 'bg-green-50 border-green-200 shadow-md' 
                                  : 'bg-white border-gray-200 shadow-sm'
                              }`}>
                                <div className="flex items-center space-x-3">
                                  <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                                    node.completed 
                                      ? 'bg-green-500 text-white' 
                                      : 'bg-gray-100 text-gray-400'
                                  }`}>
                                    {node.completed ? (
                                      <CheckCircle size={18} />
                                    ) : (
                                      <Circle size={18} />
                                    )}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center space-x-2">
                                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                                        node.completed 
                                          ? 'bg-green-500 text-white' 
                                          : 'bg-gray-100 text-gray-600'
                                      }`}>
                                        步骤 {index + 1}
                                      </span>
                                      <span className={`text-xs font-medium ${
                                        node.completed ? 'text-green-700' : 'text-gray-500'
                                      }`}>
                                        {node.completed ? '已完成' : '未完成'}
                                      </span>
                                    </div>
                                    <p className="text-sm font-medium text-gray-900 mt-1">
                                      {node.name}
                                    </p>
                                    {node.completedAt && (
                                      <p className="text-xs text-green-600 mt-1 font-medium">
                                        完成时间: {node.completedAt}
                                      </p>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ExperimentProgress;