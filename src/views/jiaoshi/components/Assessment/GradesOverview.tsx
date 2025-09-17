import React, { useEffect, useMemo, useState } from 'react';
import { Users, Award, TrendingUp, BookOpen, Search } from 'lucide-react';
import type { StudentGrade } from '../../types';
import Button from '../Common/Button';
import { apiClient } from '../../../../utils/apiClient';
import { decodeToken } from '../../../../utils/auth';

interface ClassOption {
  id: string;
  name: string;
}

interface ScoreDistributionItem {
  label: string;
  value: number;
  color: string;
}

const DEFAULT_CLASSES: ClassOption[] = [
  { id: '1', name: '软件工程2022级' },
  { id: '2', name: '计算机科学2023级' },
];

const DEFAULT_GRADES: StudentGrade[] = [
  {
    studentId: '2022001',
    studentName: '张三',
    exp_flow: 85,
    knowledge_test: 90,
    model_quality: 88,
    report_quality: 92,
    total_score: 88.2,
  },
  {
    studentId: '2022002',
    studentName: '李四',
    exp_flow: 92,
    knowledge_test: 85,
    model_quality: 90,
    report_quality: 88,
    total_score: 89.4,
  },
  {
    studentId: '2023001',
    studentName: '王五',
    exp_flow: 78,
    knowledge_test: 82,
    model_quality: 75,
    report_quality: 85,
    total_score: 79.8,
  },
  {
    studentId: '2022003',
    studentName: '赵六',
    exp_flow: 95,
    knowledge_test: 88,
    model_quality: 92,
    report_quality: 90,
    total_score: 92.1,
  },
  {
    studentId: '2023002',
    studentName: '钱七',
    exp_flow: 88,
    knowledge_test: 86,
    model_quality: 84,
    report_quality: 89,
    total_score: 87.2,
  },
];

const TOTAL_SCORE_COLORS = {
  excellent: 'bg-blue-500',
  good: 'bg-green-500',
  average: 'bg-yellow-500',
  pass: 'bg-purple-500',
  fail: 'bg-red-500',
};

const GradesOverview: React.FC = () => {
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [grades, setGrades] = useState<StudentGrade[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [teacherId, setTeacherId] = useState<number | null>(null);
  const [classLoadError, setClassLoadError] = useState<string | null>(null);
  const [isClassLoading, setIsClassLoading] = useState(false);
  const [gradesError, setGradesError] = useState<string | null>(null);

  useEffect(() => {
    const handler = window.setTimeout(() => {
      setDebouncedSearch(searchTerm.trim());
    }, 200);
    return () => window.clearTimeout(handler);
  }, [searchTerm]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      setClasses(DEFAULT_CLASSES);
      setSelectedClassId(DEFAULT_CLASSES[0]?.id ?? '');
      return;
    }

    const decoded = decodeToken(token);
    if (!decoded) {
      setClasses(DEFAULT_CLASSES);
      setSelectedClassId(DEFAULT_CLASSES[0]?.id ?? '');
      return;
    }

    setTeacherId(decoded.sub);
  }, []);

  useEffect(() => {
    const fetchClasses = async () => {
      if (teacherId === null) return;
      setIsClassLoading(true);
      setClassLoadError(null);
      try {
        const response = await apiClient.get(`/teachers/${teacherId}/classes`);
        if (Array.isArray(response) && response.length > 0) {
          const mapped = response.map((item: any) => ({
            id: String(item.class_id),
            name: item.class_name,
          }));
          setClasses(mapped);
          setSelectedClassId((prev) => (prev ? prev : mapped[0]?.id ?? ''));
        } else {
          setClasses(DEFAULT_CLASSES);
          setSelectedClassId(DEFAULT_CLASSES[0]?.id ?? '');
        }
      } catch (err: any) {
        setClassLoadError(err.message || '获取班级列表失败，已使用示例数据');
        setClasses(DEFAULT_CLASSES);
        setSelectedClassId(DEFAULT_CLASSES[0]?.id ?? '');
      } finally {
        setIsClassLoading(false);
      }
    };

    fetchClasses();
  }, [teacherId]);

  useEffect(() => {
    if (!selectedClassId) {
      setGrades([]);
      setGradesError('请选择班级以查看成绩。');
      return;
    }
    const fetchGrades = async () => {
      try {
        setGradesError(null);
        const response = await apiClient.get(`/classes/${selectedClassId}/latest-grades`);
        if (Array.isArray(response) && response.length > 0) {
          const normalized = (response as any[]).map((item) => ({
            studentId: item.student_username,
            studentName: item.student_full_name,
            exp_flow: item.exp_flow ?? 0,
            knowledge_test: item.knowledge_test ?? 0,
            model_quality: item.model_quality ?? 0,
            report_quality: item.report_quality ?? 0,
            total_score: item.total_score ?? Number(((item.exp_flow ?? 0) + (item.knowledge_test ?? 0) + (item.model_quality ?? 0) + (item.report_quality ?? 0)).toFixed(1)),
            created_at: item.created_at,
            experiment_id: item.experiment_id,
            grade_id: item.grade_id,
          }));
          setGrades(normalized);
          setGradesError(null);
        } else {
          setGrades([]);
          setGradesError('该班级暂无成绩记录。');
        }
      } catch (err: any) {
        setGrades([]);
        setGradesError(err?.message || '获取成绩数据失败。');
      }
    };

    fetchGrades();
  }, [selectedClassId]);

  const filteredGrades = useMemo(() => {
    if (!debouncedSearch) return grades;
    return grades.filter(
      (grade) =>
        grade.studentName.includes(debouncedSearch) ||
        grade.studentId.includes(debouncedSearch),
    );
  }, [grades, debouncedSearch]);

  const classStats = useMemo(() => {
    if (grades.length === 0) {
      return {
        avgExpFlow: 0,
        avgKnowledge: 0,
        avgModel: 0,
        avgReport: 0,
        avgTotal: 0,
        highScoreCount: 0,
        passRate: 0,
      };
    }

    const sum = grades.reduce(
      (acc, grade) => {
        acc.expFlow += grade.exp_flow;
        acc.knowledge += grade.knowledge_test;
        acc.model += grade.model_quality;
        acc.report += grade.report_quality;
        acc.total += grade.total_score;
        return acc;
      },
      { expFlow: 0, knowledge: 0, model: 0, report: 0, total: 0 },
    );

    const highScoreCount = grades.filter((grade) => grade.total_score >= 90).length;
    const passCount = grades.filter((grade) => grade.total_score >= 60).length;

    return {
      avgExpFlow: Math.round((sum.expFlow / grades.length) * 10) / 10,
      avgKnowledge: Math.round((sum.knowledge / grades.length) * 10) / 10,
      avgModel: Math.round((sum.model / grades.length) * 10) / 10,
      avgReport: Math.round((sum.report / grades.length) * 10) / 10,
      avgTotal: Math.round((sum.total / grades.length) * 10) / 10,
      highScoreCount,
      passRate: Math.round((passCount / grades.length) * 100),
    };
  }, [grades]);

  const scoreDistribution: ScoreDistributionItem[] = useMemo(() => {
    const distribution = {
      excellent: 0,
      good: 0,
      average: 0,
      pass: 0,
      fail: 0,
    };

    grades.forEach((grade) => {
      const score = grade.total_score;
      if (score >= 90) distribution.excellent += 1;
      else if (score >= 80) distribution.good += 1;
      else if (score >= 70) distribution.average += 1;
      else if (score >= 60) distribution.pass += 1;
      else distribution.fail += 1;
    });

    return [
      { label: '≥ 90 分（优秀）', value: distribution.excellent, color: TOTAL_SCORE_COLORS.excellent },
      { label: '80-89 分（良好）', value: distribution.good, color: TOTAL_SCORE_COLORS.good },
      { label: '70-79 分（中等）', value: distribution.average, color: TOTAL_SCORE_COLORS.average },
      { label: '60-69 分（及格）', value: distribution.pass, color: TOTAL_SCORE_COLORS.pass },
      { label: '< 60 分（不及格）', value: distribution.fail, color: TOTAL_SCORE_COLORS.fail },
    ];
  }, [grades]);

  return (
    <div className="space-y-6">
      {/* 班级统计容器 */}
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
              disabled={isClassLoading || classes.length === 0}
            >
              {classes.length === 0 ? (
                <option value="">
                  {isClassLoading ? '加载班级...' : '暂无班级'}
                </option>
              ) : (
                classes.map((cls) => (
                  <option key={cls.id} value={cls.id}>
                    {cls.name}
                  </option>
                ))
              )}
            </select>
            <Button variant="outline" size="sm" onClick={() => window.print()} disabled={!selectedClassId}>
              导出成绩
            </Button>
          </div>
        </div>

        {classLoadError && (
          <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-3 py-2 rounded-md text-sm">
            {classLoadError}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
            <div className="flex items-center space-x-3">
              <Users className="text-blue-600" size={20} />
              <div>
                <p className="text-sm text-blue-600">班级人数</p>
                <p className="text-2xl font-bold text-blue-900">{grades.length}</p>
              </div>
            </div>
          </div>
          <div className="bg-green-50 border border-green-100 rounded-xl p-4">
            <div className="flex items-center space-x-3">
              <Award className="text-green-600" size={20} />
              <div>
                <p className="text-sm text-green-600">平均总分</p>
                <p className="text-2xl font-bold text-green-900">{classStats.avgTotal}</p>
              </div>
            </div>
          </div>
          <div className="bg-yellow-50 border border-yellow-100 rounded-xl p-4">
            <div className="flex items-center space-x-3">
              <TrendingUp className="text-yellow-600" size={20} />
              <div>
                <p className="text-sm text-yellow-600">优秀人数 (≥90)</p>
                <p className="text-2xl font-bold text-yellow-900">{classStats.highScoreCount}</p>
              </div>
            </div>
          </div>
          <div className="bg-purple-50 border border-purple-100 rounded-xl p-4">
            <div className="flex items-center space-x-3">
              <BookOpen className="text-purple-600" size={20} />
              <div>
                <p className="text-sm text-purple-600">及格率 (≥60)</p>
                <p className="text-2xl font-bold text-purple-900">{classStats.passRate}%</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-3">
            <h3 className="text-lg font-semibold text-gray-900">关键指标</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
                <p className="text-sm text-blue-600">实验流程平均分</p>
                <p className="text-2xl font-bold text-blue-900">{classStats.avgExpFlow}</p>
              </div>
              <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4">
                <p className="text-sm text-emerald-600">知识测试平均分</p>
                <p className="text-2xl font-bold text-emerald-900">{classStats.avgKnowledge}</p>
              </div>
              <div className="bg-orange-50 border border-orange-100 rounded-xl p-4">
                <p className="text-sm text-orange-600">模型质量平均分</p>
                <p className="text-2xl font-bold text-orange-900">{classStats.avgModel}</p>
              </div>
              <div className="bg-purple-50 border border-purple-100 rounded-xl p-4">
                <p className="text-sm text-purple-600">报告质量平均分</p>
                <p className="text-2xl font-bold text-purple-900">{classStats.avgReport}</p>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="text-lg font-semibold text-gray-900">总分分布</h3>
            <div className="space-y-3">
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
        </div>
      </div>

      {/* 学生成绩列表 */}
      <div className="bg-white rounded-lg shadow-md p-6 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between md:space-x-4 space-y-3 md:space-y-0">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">学生成绩详情</h2>
            <p className="text-sm text-gray-500">共 {filteredGrades.length} 人，支持姓名/学号筛选</p>
          </div>
          <div className="relative w-full md:w-80">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="搜索学生姓名或学号"
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">序号</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">姓名</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">学号</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">实验流程</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">知识测试</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">模型质量</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">报告质量</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">总分</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">评价</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredGrades.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-10 text-center text-gray-500">
                    未找到符合条件的学生。
                  </td>
                </tr>
              ) : (
                filteredGrades.map((grade, index) => {
                  const total = grade.total_score;
                  const badge = total >= 90
                    ? { text: '优秀', color: 'bg-blue-50 text-blue-700' }
                    : total >= 80
                      ? { text: '良好', color: 'bg-green-50 text-green-700' }
                      : total >= 70
                        ? { text: '中等', color: 'bg-yellow-50 text-yellow-700' }
                        : total >= 60
                          ? { text: '及格', color: 'bg-purple-50 text-purple-700' }
                          : { text: '不及格', color: 'bg-red-50 text-red-700' };

                  return (
                    <tr key={grade.studentId} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-gray-600">{index + 1}</td>
                      <td className="px-4 py-3 text-sm text-gray-900 font-medium">{grade.studentName}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{grade.studentId}</td>
                      <td className="px-4 py-3 text-sm text-gray-700">{grade.exp_flow}</td>
                      <td className="px-4 py-3 text-sm text-gray-700">{grade.knowledge_test}</td>
                      <td className="px-4 py-3 text-sm text-gray-700">{grade.model_quality}</td>
                      <td className="px-4 py-3 text-sm text-gray-700">{grade.report_quality}</td>
                      <td className="px-4 py-3 text-sm font-semibold text-gray-900">{grade.total_score}</td>
                      <td className="px-4 py-3 text-sm">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${badge.color}`}>
                          {badge.text}
                        </span>
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

export default GradesOverview;
