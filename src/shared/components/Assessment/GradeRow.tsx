import React from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import type { StudentGradeOverview } from '@/shared/types';
import FinalBreakdown from './FinalBreakdown';
import { getEvaluationBadge, getProgressStatus } from '@/shared/utils/gradeStatus';

const formatScore = (value: number | null) => {
  if (value === null || Number.isNaN(value)) {
    return '—';
  }
  return value.toFixed(2);
};

interface GradeRowProps {
  grade: StudentGradeOverview;
  index: number;
  isExpanded: boolean;
  onToggle: (studentId: number) => void;
}

const GradeRow: React.FC<GradeRowProps> = ({ grade, index, isExpanded, onToggle }) => {
  const badge = getEvaluationBadge(grade);
  const status = getProgressStatus(grade);
  const isRejected = status === 'rejected';

  const displayScore = (score: number | null) => (isRejected ? '—' : formatScore(score));

  return (
    <React.Fragment>
      <tr className="hover:bg-gray-50">
        <td className="px-4 py-3 text-sm text-gray-600">{index + 1}</td>
        <td className="px-4 py-3 text-sm text-gray-900 font-medium">{grade.full_name}</td>
        <td className="px-4 py-3 text-sm text-gray-600">{grade.username}</td>
        <td className="px-4 py-3 text-sm text-gray-700">{displayScore(grade.exp_flow_score)}</td>
        <td className="px-4 py-3 text-sm text-gray-700">{displayScore(grade.knowledge_test)}</td>
        <td className="px-4 py-3 text-sm text-gray-700">{displayScore(grade.model_quality)}</td>
        <td className="px-4 py-3 text-sm text-gray-700">{displayScore(grade.report_quality)}</td>
        <td className="px-4 py-3 text-sm font-semibold text-gray-900">{displayScore(grade.final_score)}</td>
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
