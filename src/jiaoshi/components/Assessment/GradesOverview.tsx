import React, { useState } from "react";
import { Download, TrendingUp, Users, Award, BookOpen } from "lucide-react";
import type { StudentGrade } from "../../types";
import Button from "../Common/Button";

const GradesOverview: React.FC = () => {
  const [grades, setGrades] = useState<StudentGrade[]>([
    {
      studentId: "2022001",
      studentName: "张三",
      experimentProcess: 85,
      knowledgeTest: 90,
      modelSelection: 88,
      experimentReport: 92,
      totalScore: 88.2,
    },
    {
      studentId: "2022002",
      studentName: "李四",
      experimentProcess: 92,
      knowledgeTest: 85,
      modelSelection: 90,
      experimentReport: 88,
      totalScore: 89.4,
    },
    {
      studentId: "2023001",
      studentName: "王五",
      experimentProcess: 78,
      knowledgeTest: 82,
      modelSelection: 75,
      experimentReport: 85,
      totalScore: 79.8,
    },
    {
      studentId: "2022003",
      studentName: "赵六",
      experimentProcess: 95,
      knowledgeTest: 88,
      modelSelection: 92,
      experimentReport: 90,
      totalScore: 92.1,
    },
    {
      studentId: "2023002",
      studentName: "钱七",
      experimentProcess: 88,
      knowledgeTest: 86,
      modelSelection: 84,
      experimentReport: 89,
      totalScore: 87.2,
    },
  ]);

  const [selectedClass, setSelectedClass] = useState("");

  const classes = [
    { id: "1", name: "软件工程2022级" },
    { id: "2", name: "计算机科学2023级" },
  ];

  // 计算统计数据
  const averageScore =
    Math.round(
      (grades.reduce((sum, grade) => sum + grade.totalScore, 0) /
        grades.length) *
        10,
    ) / 10;
  const highScoreCount = grades.filter((g) => g.totalScore >= 90).length;
  const passCount = grades.filter((g) => g.totalScore >= 60).length;
  const passRate = Math.round((passCount / grades.length) * 100);

  // 分数段统计
  const getScoreRange = (score: number) => {
    if (score >= 90) return "优秀";
    if (score >= 80) return "良好";
    if (score >= 70) return "中等";
    if (score >= 60) return "及格";
    return "不及格";
  };

  const scoreDistribution = {
    excellent: grades.filter((g) => g.totalScore >= 90).length,
    good: grades.filter((g) => g.totalScore >= 80 && g.totalScore < 90).length,
    average: grades.filter((g) => g.totalScore >= 70 && g.totalScore < 80)
      .length,
    pass: grades.filter((g) => g.totalScore >= 60 && g.totalScore < 70).length,
    fail: grades.filter((g) => g.totalScore < 60).length,
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return "text-green-600";
    if (score >= 80) return "text-blue-600";
    if (score >= 70) return "text-yellow-600";
    if (score >= 60) return "text-orange-600";
    return "text-red-600";
  };

  const getScoreBgColor = (score: number) => {
    if (score >= 90) return "bg-green-100";
    if (score >= 80) return "bg-blue-100";
    if (score >= 70) return "bg-yellow-100";
    if (score >= 60) return "bg-orange-100";
    return "bg-red-100";
  };

  const handleExport = () => {
    alert("正在导出成绩单...");
  };

  // 各班级平均分数据（模拟）
  const classAverages = [
    { name: "软件工程2022级", average: 87.5, count: 45 },
    { name: "计算机科学2023级", average: 84.2, count: 38 },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">成绩概览</h1>
        <Button onClick={handleExport}>
          <Download size={16} className="mr-2" />
          成绩导出
        </Button>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center">
            <TrendingUp className="w-8 h-8 text-blue-600 mr-3" />
            <div>
              <p className="text-sm text-gray-600">平均分</p>
              <p className="text-2xl font-bold text-gray-900">{averageScore}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center">
            <Award className="w-8 h-8 text-green-600 mr-3" />
            <div>
              <p className="text-sm text-gray-600">优秀人数</p>
              <p className="text-2xl font-bold text-gray-900">
                {highScoreCount}
              </p>
              <p className="text-xs text-green-600">≥90分</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center">
            <Users className="w-8 h-8 text-orange-600 mr-3" />
            <div>
              <p className="text-sm text-gray-600">及格率</p>
              <p className="text-2xl font-bold text-gray-900">{passRate}%</p>
              <p className="text-xs text-orange-600">
                {passCount}/{grades.length}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center">
            <BookOpen className="w-8 h-8 text-purple-600 mr-3" />
            <div>
              <p className="text-sm text-gray-600">总人数</p>
              <p className="text-2xl font-bold text-gray-900">
                {grades.length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 数据可视化图表 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 各班级平均分 */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            各班级平均分
          </h3>
          <div className="space-y-4">
            {classAverages.map((cls, index) => (
              <div key={index} className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-700">
                    {cls.name}
                  </span>
                  <div className="flex items-center space-x-2">
                    <span className="text-lg font-bold text-blue-600">
                      {cls.average}
                    </span>
                    <span className="text-xs text-gray-500">
                      ({cls.count}人)
                    </span>
                  </div>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div
                    className="bg-blue-500 h-3 rounded-full"
                    style={{ width: `${(cls.average / 100) * 100}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 成绩分布 */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">成绩分布</h3>
          <div className="space-y-4">
            {[
              {
                label: "优秀 (90-100)",
                count: scoreDistribution.excellent,
                color: "bg-green-500",
              },
              {
                label: "良好 (80-89)",
                count: scoreDistribution.good,
                color: "bg-blue-500",
              },
              {
                label: "中等 (70-79)",
                count: scoreDistribution.average,
                color: "bg-yellow-500",
              },
              {
                label: "及格 (60-69)",
                count: scoreDistribution.pass,
                color: "bg-orange-500",
              },
              {
                label: "不及格 (<60)",
                count: scoreDistribution.fail,
                color: "bg-red-500",
              },
            ].map((item, index) => (
              <div key={index} className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className={`w-4 h-4 ${item.color} rounded`}></div>
                  <span className="text-sm text-gray-700">{item.label}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="font-medium text-gray-900">
                    {item.count}
                  </span>
                  <span className="text-xs text-gray-500">
                    ({Math.round((item.count / grades.length) * 100)}%)
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 成绩详单 */}
      <div className="bg-white rounded-lg shadow-md">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">
              学生成绩详单
            </h2>
            <div>
              <select
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">全部班级</option>
                {classes.map((cls) => (
                  <option key={cls.id} value={cls.id}>
                    {cls.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  序号
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  姓名
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  学号
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  实验流程
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  知识测试
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  模型选择
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  实验报告
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  总分
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  等级
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {grades.map((grade, index) => (
                <tr key={grade.studentId} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {index + 1}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {grade.studentName}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {grade.studentId}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <span
                      className={`font-medium ${getScoreColor(grade.experimentProcess)}`}
                    >
                      {grade.experimentProcess}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <span
                      className={`font-medium ${getScoreColor(grade.knowledgeTest)}`}
                    >
                      {grade.knowledgeTest}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <span
                      className={`font-medium ${getScoreColor(grade.modelSelection)}`}
                    >
                      {grade.modelSelection}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <span
                      className={`font-medium ${getScoreColor(grade.experimentReport)}`}
                    >
                      {grade.experimentReport}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <span
                      className={`font-bold text-lg ${getScoreColor(grade.totalScore)}`}
                    >
                      {grade.totalScore}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 py-1 text-xs rounded-full font-medium ${getScoreBgColor(grade.totalScore)} ${getScoreColor(grade.totalScore)}`}
                    >
                      {getScoreRange(grade.totalScore)}
                    </span>
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

export default GradesOverview;
