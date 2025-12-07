import type { StudentGradeOverview } from '@/shared/types';

export type ProgressStatus = 'not-started' | 'in-progress' | 'waiting-evaluation' | 'rejected' | 'completed';

/**
 * Determines the progress status of a student's experiment based on scores and explicit status.
 */
export const getProgressStatus = (grade: StudentGradeOverview): ProgressStatus => {
  if (grade.experiment_id === null) {
    return 'not-started';
  }
  // Use the explicit report_status field if available
  if (grade.report_status === 'rejected') {
    return 'rejected';
  }
  if (grade.report_status === 'submitted') {
    return 'waiting-evaluation';
  }

  // Fallback logic based on scores (legacy compatibility)
  if (grade.exp_flow_score === 0 && !grade.report_status) {
    return 'in-progress';
  }
  if ((grade.model_quality === 0 || grade.report_quality === 0) && grade.report_status !== 'graded') {
    return 'waiting-evaluation';
  }
  return 'completed';
};

/**
 * Returns the badge configuration (text and tailwind classes) for a given status.
 */
export const getEvaluationBadge = (grade: StudentGradeOverview) => {
  const status = getProgressStatus(grade);

  switch (status) {
    case 'not-started':
      return { text: '未进行实验', color: 'bg-gray-100 text-gray-600 border border-gray-200' };
    case 'in-progress':
      return { text: '实验进行中', color: 'bg-amber-100 text-amber-800 border border-amber-200' };
    case 'waiting-evaluation':
      return { text: '实验待评分', color: 'bg-indigo-100 text-indigo-800 border border-indigo-200' };
    case 'rejected':
      return { text: '报告已驳回', color: 'bg-red-100 text-red-800 border border-red-200' };
    case 'completed':
    default:
      return { text: '已完成评分', color: 'bg-blue-100 text-blue-800 border border-blue-200' };
  }
};

/**
 * Returns the status variant key for UI components (like StatusChip).
 */
export type StatusVariant = 'completed' | 'waiting' | 'progress' | 'idle' | 'rejected';

export const getStatusVariant = (status: ProgressStatus): StatusVariant => {
  switch (status) {
    case 'completed': return 'completed';
    case 'waiting-evaluation': return 'waiting';
    case 'in-progress': return 'progress';
    case 'not-started': return 'idle';
    case 'rejected': return 'rejected';
  }
};
