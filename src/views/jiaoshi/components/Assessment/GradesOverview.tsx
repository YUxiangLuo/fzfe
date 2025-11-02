import React, { useEffect, useMemo, useState } from 'react';
import { Users, Award, TrendingUp, TrendingDown, Search, Loader, AlertTriangle } from 'lucide-react';
import type { StudentGradeOverview, Class } from '../../types';
import Button from '../Common/Button';
import { apiClient } from '../../../../utils/apiClient';
import { decodeToken } from '../../../../utils/auth';

const TOTAL_SCORE_COLORS = {
  excellent: 'bg-blue-500',
  good: 'bg-green-500',
  average: 'bg-yellow-500',
  pass: 'bg-purple-500',
  fail: 'bg-red-500',
};

const GradesOverview: React.FC = () => {
  const [classes, setClasses] = useState<Class[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [grades, setGrades] = useState<StudentGradeOverview[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  
  const [teacherId, setTeacherId] = useState<number | null>(null);
  const [isLoadingClasses, setIsLoadingClasses] = useState(true);
  const [isLoadingGrades, setIsLoadingGrades] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handler = window.setTimeout(() => {
      setDebouncedSearch(searchTerm.trim());
    }, 300);
    return () => window.clearTimeout(handler);
  }, [searchTerm]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      setError("未找到登录凭据，请重新登录。");
      setIsLoadingClasses(false);
      return;
    }
    const decoded = decodeToken(token);
    if (!decoded) {
      setError("登录信息已失效，请重新登录。");
      setIsLoadingClasses(false);
      return;
    }
    setTeacherId(decoded.sub);
  }, []);

  useEffect(() => {
    if (teacherId === null) return;

    const fetchClasses = async () => {
      setIsLoadingClasses(true);
      setError(null);
      try {
        const response = await apiClient.get<Class[]>(`/teachers/${teacherId}/classes`);
        if (Array.isArray(response) && response.length > 0) {
          setClasses(response);
          setSelectedClassId(String(response[0].class_id));
        } else {
          setClasses([]);
          setError("您当前没有管理的班级。");
        }
      } catch (err: any) {
        setError(err.message || '获取班级列表失败。');
      } finally {
        setIsLoadingClasses(false);
      }
    };

    fetchClasses();
  }, [teacherId]);

  useEffect(() => {
    if (!selectedClassId) {
      setGrades([]);
      return;
    }
    const fetchGrades = async () => {
      setIsLoadingGrades(true);
      setError(null);
      try {
        const response = await apiClient.get<StudentGradeOverview[]>(`/classes/${selectedClassId}/grade-summaries`);
        setGrades(Array.isArray(response) ? response : []);
        if (!Array.isArray(response) || response.length === 0) {
          setError('该班级暂无成绩记录。');
        }
      } catch (err: any) {
        setGrades([]);
        if (err.message && err.message.includes("Grade weights for this class have not been set up")) {
          setError("无法计算成绩，因为当前班级尚未设置成绩权重。请先前往‘成绩权重’页面进行设置。");
        } else {
          setError(err?.message || '获取成绩数据失败。');
        }
      } finally {
        setIsLoadingGrades(false);
      }
    };

    fetchGrades();
  }, [selectedClassId]);

  const filteredGrades = useMemo(() => {
    if (!debouncedSearch) return grades;
    const query = debouncedSearch.toLowerCase();
    return grades.filter(
      (grade) =>
        grade.full_name.toLowerCase().includes(query) ||
        grade.username.toLowerCase().includes(query),
    );
  }, [grades, debouncedSearch]);

  const classStats = useMemo(() => {
    if (grades.length === 0) {
      return {
        avgFinalGrade: 0,
        highestGrade: 0,
        lowestGrade: 0,
        passRate: 0,
      };
    }

    const finalGrades = grades.map(g => g.final_score);
    const sum = finalGrades.reduce((acc, grade) => acc + grade, 0);
    const passCount = grades.filter((grade) => grade.final_score >= 60).length;

    return {
      avgFinalGrade: parseFloat((sum / grades.length).toFixed(2)),
      highestGrade: Math.max(...finalGrades),
      lowestGrade: Math.min(...finalGrades),
      passRate: Math.round((passCount / grades.length) * 100),
    };
  }, [grades]);

  const scoreDistribution = useMemo(() => {
    const distribution = { excellent: 0, good: 0, average: 0, pass: 0, fail: 0 };
    grades.forEach((grade) => {
      const score = grade.final_score;
      if (score >= 90) distribution.excellent += 1;
      else if (score >= 80) distribution.good += 1;
      else if (score >= 70) distribution.average += 1;
      else if (score >= 60) distribution.pass += 1;
      else distribution.fail += 1;
    });
    return [
      { label: '≥ 90 (优秀)', value: distribution.excellent, color: TOTAL_SCORE_COLORS.excellent },
      { label: '80-89 (良好)', value: distribution.good, color: TOTAL_SCORE_COLORS.good },
      { label: '70-79 (中等)', value: distribution.average, color: TOTAL_SCORE_COLORS.average },
      { label: '60-69 (及格)', value: distribution.pass, color: TOTAL_SCORE_COLORS.pass },
      { label: '< 60 (不及格)', value: distribution.fail, color: TOTAL_SCORE_COLORS.fail },
    ];
  }, [grades]);

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-md p-6 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between md:space-x-4 space-y-3 md:space-y-0">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">成绩概览</h1>
            <p className="text-sm text-gray-500">查看班级整体成绩表现与分布</p>
          </div>
          <div className="flex items-center space-x-3">
            <select
              value={selectedClassId}
              onChange={(event) => setSelectedClassId(event.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              disabled={isLoadingClasses || classes.length === 0}
            >
              {classes.length === 0 ? (
                <option value="">{isLoadingClasses ? '加载班级...' : '暂无班级'}</option>
              ) : (
                classes.map((cls) => (
                  <option key={cls.class_id} value={cls.class_id}>{cls.class_name}</option>
                ))
              )}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
          <StatCard icon={Users} color="blue" title="班级人数" value={grades.length} />
          <StatCard icon={Award} color="green" title="平均总分" value={classStats.avgFinalGrade} />
          <StatCard icon={TrendingUp} color="yellow" title="最高分" value={classStats.highestGrade} />
          <StatCard icon={TrendingDown} color="red" title="最低分" value={classStats.lowestGrade} />
          <StatCard icon={Award} color="purple" title="及格率" value={`${classStats.passRate}%`} />
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-900">总分分布</h3>
        <div className="mt-4 space-y-3">
          {scoreDistribution.map((item) => (
            <div key={item.label} className="space-y-1">
              <div className="flex items-center justify-between text-sm text-gray-600">
                <span>{item.label}</span>
                <span className="font-medium text-gray-800">{item.value} 人</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                <div
                  className={`${item.color} h-2 transition-all duration-300`}
                  style={{ width: grades.length ? `${(item.value / grades.length) * 100}%` : '0%' }}
                ></div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">学生成绩详情</h2>
            <p className="text-sm text-gray-500">共 {filteredGrades.length} 条记录</p>
          </div>
          <div className="relative w-full md:w-80 mt-3 md:mt-0">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="搜索学生姓名或学号"
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {error && !isLoadingGrades && (
          <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded-lg text-sm">
            {error}
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                {['序号', '姓名', '学号', '实验流程', '知识测试', '模型质量', '报告质量', '总分', '评价'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {isLoadingGrades ? (
                <tr><td colSpan={9} className="text-center py-10"><Loader className="mx-auto animate-spin text-blue-500" /></td></tr>
              ) : filteredGrades.length === 0 ? (
                <tr><td colSpan={9} className="text-center py-10 text-gray-500">无数据显示。</td></tr>
              ) : (
                filteredGrades.map((grade, index) => {
                  const total = grade.final_score;
                  const badge = total >= 90 ? { text: '优秀', color: 'bg-blue-100 text-blue-800' }
                                : total >= 80 ? { text: '良好', color: 'bg-green-100 text-green-800' }
                                : total >= 70 ? { text: '中等', color: 'bg-yellow-100 text-yellow-800' }
                                : total >= 60 ? { text: '及格', color: 'bg-purple-100 text-purple-800' }
                                : { text: '不及格', color: 'bg-red-100 text-red-800' };
                  return (
                    <tr key={grade.student_id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-gray-600">{index + 1}</td>
                      <td className="px-4 py-3 text-sm text-gray-900 font-medium">{grade.full_name}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{grade.username}</td>
                      <td className="px-4 py-3 text-sm text-gray-700">{grade.exp_flow_score.toFixed(2)}</td>
                      <td className="px-4 py-3 text-sm text-gray-700">{grade.knowledge_test !== null ? grade.knowledge_test.toFixed(2) : '—'}</td>
                      <td className="px-4 py-3 text-sm text-gray-700">{grade.model_quality !== null ? grade.model_quality.toFixed(2) : '—'}</td>
                      <td className="px-4 py-3 text-sm text-gray-700">{grade.report_quality !== null ? grade.report_quality.toFixed(2) : '—'}</td>
                      <td className="px-4 py-3 text-sm font-semibold text-gray-900">{grade.final_score.toFixed(2)}</td>
                      <td className="px-4 py-3 text-sm">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${badge.color}`}>{badge.text}</span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const StatCard: React.FC<{ icon: React.ElementType, color: string, title: string, value: string | number }> = ({ icon: Icon, color, title, value }) => (
  <div className={`bg-${color}-50 border border-${color}-100 rounded-xl p-4`}>
    <div className="flex items-center space-x-3">
      <Icon className={`text-${color}-600`} size={20} />
      <div>
        <p className={`text-sm text-${color}-600`}>{title}</p>
        <p className={`text-2xl font-bold text-${color}-900`}>{value}</p>
      </div>
    </div>
  </div>
);

export default GradesOverview;
