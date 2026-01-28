import React from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import type { StudentGradeOverview } from '@/views/teacher/types';
import FinalBreakdown from './FinalBreakdown';
import { getEvaluationBadge, getProgressStatus } from '@/views/teacher/utils/gradeStatus';
import { TableRow, TableCell } from '@/components/ui/table';

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
      <TableRow>
        <TableCell className="px-4 py-3 text-sm text-muted-foreground">{index + 1}</TableCell>
        <TableCell className="px-4 py-3 text-sm text-foreground font-medium">{grade.full_name}</TableCell>
        <TableCell className="px-4 py-3 text-sm text-muted-foreground">{grade.username}</TableCell>
        <TableCell className="px-4 py-3 text-sm text-foreground">{displayScore(grade.exp_flow_score)}</TableCell>
        <TableCell className="px-4 py-3 text-sm text-foreground">{displayScore(grade.knowledge_test)}</TableCell>
        <TableCell className="px-4 py-3 text-sm text-foreground">{displayScore(grade.model_quality)}</TableCell>
        <TableCell className="px-4 py-3 text-sm text-foreground">{displayScore(grade.report_quality)}</TableCell>
        <TableCell className="px-4 py-3 text-sm font-semibold text-foreground">{displayScore(grade.final_score)}</TableCell>
        <TableCell className="px-4 py-3 text-sm">
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${badge.color}`}>{badge.text}</span>
        </TableCell>
        <TableCell className="px-4 py-3 text-center">
          <button
            type="button"
            onClick={() => onToggle(grade.student_id)}
            className="inline-flex items-center text-primary hover:text-primary text-sm font-medium"
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
        </TableCell>
      </TableRow>
      {isExpanded && (
        <TableRow className="bg-muted">
          <TableCell colSpan={10} className="px-6 py-4">
            <FinalBreakdown grade={grade} />
          </TableCell>
        </TableRow>
      )}
    </React.Fragment>
  );
};

export default React.memo(GradeRow);
