import React, { useMemo } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from 'recharts';

export interface GradeChartDatum {
  id: number;
  fullName: string;
  username: string;
  finalScore: number | null;
  expFlowScore: number | null;
  knowledgeTest: number | null;
  modelQuality: number | null;
  reportQuality: number | null;
}

interface GradeChartsProps {
  grades: GradeChartDatum[];
}

const palette = {
  blue: '#3b82f6',
  green: '#10b981',
  amber: '#f59e0b',
  purple: '#8b5cf6',
  teal: '#14b8a6',
};

const GradeCharts: React.FC<GradeChartsProps> = ({ grades }) => {
  const graded = useMemo(
    () => grades.filter((grade) => typeof grade.finalScore === 'number' && !Number.isNaN(grade.finalScore)),
    [grades],
  );

  const trendData = useMemo(() => {
    const sorted = [...graded].sort((a, b) => (b.finalScore ?? 0) - (a.finalScore ?? 0));
    return sorted.map((grade, index) => ({
      rank: index + 1,
      score: grade.finalScore ?? 0,
      student: grade.fullName || grade.username,
    }));
  }, [graded]);

  const histogramData = useMemo(() => {
    const bins = Array.from({ length: 10 }, (_, idx) => {
      const min = idx * 10;
      const max = idx === 9 ? 100 : (idx + 1) * 10;
      return {
        label: `${min}-${max}`,
        min,
        max,
        count: 0,
      };
    });

    graded.forEach((grade) => {
      const score = grade.finalScore ?? 0;
      const idx = Math.min(Math.floor(score / 10), 9);
      bins[idx]!.count += 1;
    });

    return bins;
  }, [graded]);

  const histogramTotal = useMemo(
    () => histogramData.reduce((sum, bin) => sum + bin.count, 0),
    [histogramData],
  );

  const averageData = useMemo(() => {
    const metrics = [
      { key: 'expFlowScore', label: '实验流程' },
      { key: 'knowledgeTest', label: '知识测试' },
      { key: 'modelQuality', label: '模型质量' },
      { key: 'reportQuality', label: '报告质量' },
    ] as const;

    return metrics
      .map(({ key, label }) => {
        const values = grades
          .map((grade) => grade[key])
          .filter((value): value is number => value !== null && !Number.isNaN(value));
        if (values.length === 0) return null;
        const sum = values.reduce((acc, value) => acc + value, 0);
        return {
          label,
          average: parseFloat((sum / values.length).toFixed(2)),
          samples: values.length,
        };
      })
      .filter((item): item is { label: string; average: number; samples: number } => item !== null);
  }, [grades]);

  if (graded.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-900">成绩可视化</h3>
        <p className="mt-2 text-sm text-gray-500">暂无完成评分的学生，待有评分数据后展示图表。</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">总分排序趋势</h3>
          <span className="text-xs text-gray-500">按总分从高到低展示学生表现</span>
        </div>
        <div className="mt-4 h-64">
          <ResponsiveContainer>
            <LineChart data={trendData} margin={{ top: 10, right: 20, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.4} />
              <XAxis dataKey="rank" tickLine={false} axisLine={{ stroke: '#e5e7eb' }} />
              <YAxis domain={[0, 100]} tickLine={false} axisLine={{ stroke: '#e5e7eb' }} />
              <Tooltip formatter={(value: number) => value.toFixed(2)} labelFormatter={(label) => `排名 ${label}`} />
              <Legend />
              <Line
                type="monotone"
                dataKey="score"
                stroke={palette.blue}
                strokeWidth={2}
                dot={{ r: 3 }}
                name="总分"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">总分区间柱状图</h3>
            <span className="text-xs text-gray-500">每 10 分一个区间</span>
          </div>
          <div className="mt-4 h-64">
            {histogramTotal === 0 ? (
              <p className="text-sm text-gray-500">暂无有效的总分数据用于绘制分布图。</p>
            ) : (
              <ResponsiveContainer>
                <BarChart data={histogramData} margin={{ top: 10, right: 20, bottom: 0, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.4} />
                  <XAxis dataKey="label" tickLine={false} axisLine={{ stroke: '#e5e7eb' }} />
                  <YAxis allowDecimals={false} tickLine={false} axisLine={{ stroke: '#e5e7eb' }} />
                  <Tooltip />
                  <Bar dataKey="count" fill={palette.blue} radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">评分维度平均分</h3>
            <span className="text-xs text-gray-500">仅统计有分数的学生</span>
          </div>
          <div className="mt-4 h-64">
            {averageData.length === 0 ? (
              <p className="text-sm text-gray-500">暂无可用的评分维度数据。</p>
            ) : (
              <ResponsiveContainer>
                <BarChart data={averageData} margin={{ top: 10, right: 20, bottom: 0, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.4} />
                  <XAxis dataKey="label" tickLine={false} axisLine={{ stroke: '#e5e7eb' }} />
                  <YAxis domain={[0, 100]} tickLine={false} axisLine={{ stroke: '#e5e7eb' }} />
                  <Tooltip formatter={(value: number) => value.toFixed(2)} />
                  <Bar dataKey="average" fill={palette.green} radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

    </div>
  );
};

export default GradeCharts;
