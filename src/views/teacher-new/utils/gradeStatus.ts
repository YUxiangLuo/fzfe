import type { StudentGradeOverview } from '../types';

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
 * Returns the badge configuration (text and color) for a given status.
 */
export const getEvaluationBadge = (grade: StudentGradeOverview) => {
    switch (grade.report_status) {
        case 'submitted':
            return { text: '待评分', color: 'processing' };
        case 'graded':
            return { text: '已评分', color: 'success' };
        case 'rejected':
            return { text: '已驳回', color: 'error' };
        default:
            return { text: '未提交', color: 'default' };
    }
};

/**
 * Returns the status variant key for UI components (like StatusChip).
 */
export type StatusVariant = 'completed' | 'waiting' | 'progress' | 'idle' | 'rejected';

export const getStatusVariant = (status: ProgressStatus): StatusVariant => {
    switch (status) {
        case 'completed':
            return 'completed';
        case 'waiting-evaluation':
            return 'waiting';
        case 'in-progress':
            return 'progress';
        case 'not-started':
            return 'idle';
        case 'rejected':
            return 'rejected';
    }
};

/**
 * Returns score level for coloring
 */
export const getScoreLevel = (score: number | null): 'excellent' | 'good' | 'average' | 'pass' | 'fail' | 'none' => {
    if (score === null) return 'none';
    if (score >= 90) return 'excellent';
    if (score >= 80) return 'good';
    if (score >= 70) return 'average';
    if (score >= 60) return 'pass';
    return 'fail';
};

/**
 * Score colors mapping
 */
export const SCORE_COLORS: Record<string, { color: string; label: string }> = {
    excellent: { color: 'success', label: '优秀' },
    good: { color: 'blue', label: '良好' },
    average: { color: 'cyan', label: '中等' },
    pass: { color: 'warning', label: '及格' },
    fail: { color: 'error', label: '不及格' },
    none: { color: 'default', label: '—' },
};
