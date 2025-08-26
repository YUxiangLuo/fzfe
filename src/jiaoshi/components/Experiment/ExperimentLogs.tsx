import React, { useState } from 'react';
import { Search, Clock, Calendar, ChevronDown, ChevronRight } from 'lucide-react';

interface ExperimentSession {
  sessionId: string;
  startTime: string;
  endTime: string;
  duration: number;
}

interface StudentLog {
  studentId: string;
  studentName: string;
  totalSessions: number;
  totalDuration: number;
  sessions: ExperimentSession[];
}

const ExperimentLogs: React.FC = () => {
  const [logs, setLogs] = useState<StudentLog[]>([
    {
      studentId: '2022001',
      studentName: '张三',
      totalSessions: 3,
      totalDuration: 185,
      sessions: [
        { sessionId: '1', startTime: '2024-03-01 09:30:00', endTime: '2024-03-01 10:45:00', duration: 75 },
        { sessionId: '2', startTime: '2024-03-02 14:20:00', endTime: '2024-03-02 15:30:00', duration: 70 },
        { sessionId: '3', startTime: '2024-03-03 16:10:00', endTime: '2024-03-03 16:50:00', duration: 40 },
      ]
    },
    {
      studentId: '2022002',
      studentName: '李四',
      totalSessions: 2,
      totalDuration: 150,
      sessions: [
        { sessionId: '1', startTime: '2024-03-01 10:15:00', endTime: '2024-03-01 11:45:00', duration: 90 },
        { sessionId: '2', startTime: '2024-03-03 09:00:00', endTime: '2024-03-03 10:00:00', duration: 60 },
      ]
    },
    {
      studentId: '2023001',
      studentName: '王五',
      totalSessions: 4,
      totalDuration: 220,
      sessions: [
        { sessionId: '1', startTime: '2024-02-28 15:30:00', endTime: '2024-02-28 16:20:00', duration: 50 },
        { sessionId: '2', startTime: '2024-03-01 08:45:00', endTime: '2024-03-01 10:15:00', duration: 90 },
        { sessionId: '3', startTime: '2024-03-02 13:00:00', endTime: '2024-03-02 14:00:00', duration: 60 },
        { sessionId: '4', startTime: '2024-03-03 11:30:00', endTime: '2024-03-03 12:10:00', duration: 20 },
      ]
    }
  ]);

  const [selectedClass, setSelectedClass] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredLogs, setFilteredLogs] = useState(logs);
  const [expandedRows, setExpandedRows] = useState<string[]>([]);

  const classes = [
    { id: '1', name: '软件工程2022级' },
    { id: '2', name: '计算机科学2023级' }
  ];

  // 筛选功能
  React.useEffect(() => {
    let filtered = logs;

    if (searchTerm) {
      filtered = filtered.filter(log => 
        log.studentId.includes(searchTerm) || 
        log.studentName.includes(searchTerm)
      );
    }

    setFilteredLogs(filtered);
  }, [logs, searchTerm]);

  const toggleRowExpansion = (studentId: string) => {
    setExpandedRows(prev => 
      prev.includes(studentId) 
        ? prev.filter(id => id !== studentId)
        : [...prev, studentId]
    );
  };

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  const formatDateTime = (dateTime: string) => {
    return new Date(dateTime).toLocaleString('zh-CN');
  };

  const getDurationColor = (duration: number) => {
    if (duration >= 120) return 'text-green-600';
    if (duration >= 60) return 'text-blue-600';
    if (duration >= 30) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">实验日志</h1>
      </div>

      {/* 搜索筛选 */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
            <label className="block text-sm font-medium text-gray-700 mb-2">按学号搜索</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="输入学号或姓名"
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
        </div>
      </div>

      {/* 统计概览 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center">
            <Clock className="w-8 h-8 text-blue-600 mr-3" />
            <div>
              <p className="text-sm text-gray-600">总学生数</p>
              <p className="text-2xl font-bold text-gray-900">{logs.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center">
            <Calendar className="w-8 h-8 text-green-600 mr-3" />
            <div>
              <p className="text-sm text-gray-600">总实验次数</p>
              <p className="text-2xl font-bold text-gray-900">
                {logs.reduce((sum, log) => sum + log.totalSessions, 0)}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center">
            <Clock className="w-8 h-8 text-purple-600 mr-3" />
            <div>
              <p className="text-sm text-gray-600">总时长</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatDuration(logs.reduce((sum, log) => sum + log.totalDuration, 0))}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center">
            <Clock className="w-8 h-8 text-orange-600 mr-3" />
            <div>
              <p className="text-sm text-gray-600">平均时长</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatDuration(Math.round(logs.reduce((sum, log) => sum + log.totalDuration, 0) / logs.length))}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 日志列表 */}
      <div className="bg-white rounded-lg shadow-md">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">学生实验日志</h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">姓名</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">学号</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">总实验次数</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">总时长</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">平均时长</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">操作</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredLogs.map((log) => (
                <React.Fragment key={log.studentId}>
                  <tr className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {log.studentName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {log.studentId}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                        {log.totalSessions} 次
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <span className={`font-medium ${getDurationColor(log.totalDuration)}`}>
                        {formatDuration(log.totalDuration)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatDuration(Math.round(log.totalDuration / log.totalSessions))}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <button
                        onClick={() => toggleRowExpansion(log.studentId)}
                        className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 hover:text-blue-700 transition-all duration-200"
                      >
                        {expandedRows.includes(log.studentId) ? '收起详情' : '展开详情'}
                      </button>
                    </td>
                  </tr>
                  {expandedRows.includes(log.studentId) && (
                    <tr>
                      <td colSpan={7} className="px-6 py-4 bg-gray-50">
                        <div className="space-y-3">
                          <h4 className="text-sm font-medium text-gray-900 mb-3">详细实验记录</h4>
                          <div className="grid gap-3">
                            {log.sessions.map((session, index) => (
                              <div key={session.sessionId} className="bg-white p-4 rounded-lg border border-gray-200">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center space-x-4">
                                    <span className="px-2 py-1 bg-gray-100 text-gray-800 text-xs rounded">
                                      第 {index + 1} 次
                                    </span>
                                    <div className="text-sm text-gray-600">
                                      <Clock className="inline w-4 h-4 mr-1" />
                                      {formatDateTime(session.startTime)} - {formatDateTime(session.endTime)}
                                    </div>
                                  </div>
                                  <div className="text-right">
                                    <span className={`font-medium ${getDurationColor(session.duration)}`}>
                                      {formatDuration(session.duration)}
                                    </span>
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

export default ExperimentLogs;