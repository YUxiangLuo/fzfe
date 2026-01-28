import type { StudentGradeOverview } from '@/views/teacher/types';

export type ProgressStatus = 'not-started' | 'in-progress' | 'waiting-evaluation' | 'rejected' | 'completed';

/**
 * Determines the progress status of a student's experiment based on scores and explicit status.
 */
export const getProgressStatus = (grade: StudentGradeOverview): ProgressStatus => {
  if (!grade.experiment_id) {
    return 'not-started';
  }
  
  // Strict check based on report_status
  if (grade.report_status === 'graded') {
    return 'completed';
  }
  if (grade.report_status === 'submitted') {
    return 'waiting-evaluation';
  }
  if (grade.report_status === 'rejected') {
    return 'rejected';
  }

  // If experiment_id exists but no specific report status, consider it in progress
  return 'in-progress';
};

/**
 * Returns the badge configuration (text and tailwind classes) for a given status.
 */
export const getEvaluationBadge = (grade: StudentGradeOverview) => {
  const status = getProgressStatus(grade);

  switch (status) {
    case 'not-started':
      return { text: '未开始', color: 'bg-muted text-muted-foreground border border-border' };
    case 'in-progress':
      return { text: '进行中', color: 'bg-warning/10 text-warning border border-warning/20' };
    case 'waiting-evaluation':
      return { text: '待评分', color: 'bg-info/10 text-info border border-info/20' };
    case 'rejected':
      return { text: '已驳回', color: 'bg-destructive/10 text-destructive border border-destructive/20' };
    case 'completed':
    default:
      return { text: '已完成评分', color: 'bg-success/10 text-success border border-success/20' };
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
