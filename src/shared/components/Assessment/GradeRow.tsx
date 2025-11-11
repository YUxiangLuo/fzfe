import React from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import type { StudentGradeOverview } from '@/shared/types';
import FinalBreakdown from './FinalBreakdown';

const formatScore = (value: number | null) => {
  if (value === null || Number.isNaN(value)) {
    return '—';
  }
  return value.toFixed(2);
};

const getEvaluationBadge = (grade: StudentGradeOverview) => {
  const status = getProgressStatus(grade);

  if (status === 'not-started') {
    return { text: '未进行实验', color: 'bg-gray-100 text-gray-600 border border-gray-200' };
  }
  if (status === 'in-progress') {
    return { text: '实验进行中', color: 'bg-amber-100 text-amber-800 border border-amber-200' };
  }
  if (status === 'waiting-evaluation') {
    return { text: '实验待评分', color: 'bg-indigo-100 text-indigo-800 border border-indigo-200' };
  }

  return { text: '已完成评分', color: 'bg-blue-100 text-blue-800 border border-blue-200' };
};

type ProgressStatus = 'not-started' | 'in-progress' | 'waiting-evaluation' | 'completed';

const getProgressStatus = (grade: StudentGradeOverview): ProgressStatus => {
  if (grade.experiment_id === null) {
    return 'not-started';
  }
  if (grade.exp_flow_score === 0) {
    return 'in-progress';
  }
  if (grade.model_quality === 0 || grade.report_quality === 0) {
    return 'waiting-evaluation';
  }
  return 'completed';
};

interface GradeRowProps {
  grade: StudentGradeOverview;
  index: number;
  isExpanded: boolean;
  onToggle: (studentId: number) => void;
}

const GradeRow: React.FC<GradeRowProps> = ({ grade, index, isExpanded, onToggle }) => {
  const badge = getEvaluationBadge(grade);

  return (
    <React.Fragment>
      <tr className="hover:bg-gray-50">
        <td className="px-4 py-3 text-sm text-gray-600">{index + 1}</td>
        <td className="px-4 py-3 text-sm text-gray-900 font-medium">{grade.full_name}</td>
        <td className="px-4 py-3 text-sm text-gray-600">{grade.username}</td>
        <td className="px-4 py-3 text-sm text-gray-700">{formatScore(grade.exp_flow_score)}</td>
        <td className="px-4 py-3 text-sm text-gray-700">{formatScore(grade.knowledge_test)}</td>
        <td className="px-4 py-3 text-sm text-gray-700">{formatScore(grade.model_quality)}</td>
        <td className="px-4 py-3 text-sm text-gray-700">{formatScore(grade.report_quality)}</td>
        <td className="px-4 py-3 text-sm font-semibold text-gray-900">{formatScore(grade.final_score)}</td>
        <td className="px-4 py-3 text-sm">
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${badge.color}`}>{badge.text}</span>
        </td>
        <td className="px-4 py-3 text-center">
          <button
            type="button"
            onClick={() => onToggle(grade.student_id)}
            className="inline-flex items-center text-blue-600 hover:text-blue-800 text-sm font-medium"
          >
            {isExpanded ? (
              <>
                <ChevronDown className="w-4 h-4 mr-1" />
                收起
              </>
            ) : (
              <>
                <ChevronRight className="w-4 h-4 mr-1" />
                查看
              </>
            )}
          </button>
        </td>
      </tr>
      {isExpanded && (
        <tr className="bg-gray-50">
          <td colSpan={10} className="px-6 py-4">
            <FinalBreakdown grade={grade} />
          </td>
        </tr>
      )}
    </React.Fragment>
  );
};

export default React.memo(GradeRow);
