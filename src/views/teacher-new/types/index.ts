// Represents a generic user across the application
export interface User {
    user_id: number;
    username: string;
    full_name: string;
    email: string;
    phone_number: string | null;
    role: string;
    created_at: string;
    managedClasses?: string[];
}

// Represents a class, matching the database table structure
export interface Class {
    class_id: number;
    class_name: string;
    class_code: string | null;
    teacher_id: number;
    teacher_name?: string | null;
    created_at?: string;
    assistants?: Assistant[];
}

export interface Student extends User { }

export interface Assistant {
    user_id: number;
    username: string;
    full_name: string;
    email: string;
}

// For sidebar navigation
export type MenuItem =
    | 'account-personal'
    | 'account-assistant'
    | 'class-management'
    | 'student-management'
    | 'experiment-progress'
    | 'experiment-reports'
    | 'experiment-logs'
    | 'assessment-questions'
    | 'assessment-weights'
    | 'assessment-grades';

export interface GradeWeights {
    exp_flow_weight: number;
    exp_flow_demand_data_preparation: number;
    exp_flow_demand_descriptive_stats: number;
    exp_flow_demand_model_selection: number;
    exp_flow_demand_generate_results: number;
    exp_flow_production_inventory_calc: number;
    exp_flow_production_service_level: number;
    exp_flow_production_variable_calc: number;
    exp_flow_production_plan_creation: number;
    exp_flow_report_submission: number;
    knowledge_test_weight: number;
    model_quality_weight: number;
    report_quality_weight: number;
}

export interface GradeBreakdownEntry {
    field: string;
    score: number | null;
    weight: number;
    weighted_score: number | null;
}

export interface FinalScoreBreakdownNode {
    score: number | null;
    weight: number;
    weighted_score: number | null;
}

export interface FinalScoreBreakdown {
    exp_flow?: FinalScoreBreakdownNode | null;
    knowledge_test?: FinalScoreBreakdownNode | null;
    model_quality?: FinalScoreBreakdownNode | null;
    report_quality?: FinalScoreBreakdownNode | null;
}

export interface StudentGradeOverview {
    student_id: number;
    username: string;
    full_name: string;
    experiment_id: number | null;
    exp_flow_score: number | null;
    model_quality: number | null;
    knowledge_test: number | null;
    report_quality: number | null;
    final_score: number | null;
    report_status?: 'submitted' | 'graded' | 'rejected' | null;
    exp_flow_breakdown?: GradeBreakdownEntry[] | null;
    final_score_breakdown?: FinalScoreBreakdown | null;
}

export type QuestionTypeApi = 'Single Choice' | 'Multiple Choice' | 'True/False';

export interface Question {
    question_id: number;
    knowledge_point: string | null;
    question_type: QuestionTypeApi;
    question_text: string;
    options?: Record<string, string> | string[] | null;
    correct_answers: string[];
    creator_id?: number | null;
    creator_name?: string | null;
}

export interface ExperimentReport {
    user_id: number;
    username: string;
    full_name: string;
    report_id: number | null;
    experiment_id: number | null;
    status?: 'submitted' | 'graded' | 'rejected';
    submitted_at: string | null;
    pdf_file_path: string | null;
    grade: number | null;
    feedback: string | null;
    grader_name: string | null;
    experiment_grade?: {
        model_quality?: number | null;
        exp_flow_demand_data_preparation?: number | null;
        exp_flow_demand_descriptive_stats?: number | null;
        exp_flow_demand_model_selection?: number | null;
        exp_flow_demand_generate_results?: number | null;
        exp_flow_production_inventory_calc?: number | null;
        exp_flow_production_service_level?: number | null;
        exp_flow_production_variable_calc?: number | null;
        exp_flow_production_plan_creation?: number | null;
    };
}

// Experiment progress types
export interface ExperimentTimelineEvent {
    event_id: number;
    experiment_id: number;
    student_id: number;
    step_order: number;
    event_type: 'STARTED' | 'COMPLETED';
    event_timestamp: string;
}

export interface ExperimentStep {
    step_order: number;
    started_at: string | null;
    completed_at: string | null;
    latest_event_type: 'STARTED' | 'COMPLETED' | null;
}

export interface StudentExperimentProgress {
    student_id: number;
    username: string;
    full_name: string;
    experiment_id: number | null;
    status: string | null;
    current_step: number | null;
    highest_completed_step: number | null;
    start_time: string | null;
    last_activity_at: string | null;
    completion_time: string | null;
    timeline: ExperimentTimelineEvent[] | null;
    steps: ExperimentStep[] | null;
}

// Experiment log data
export interface ExperimentLogEntry {
    experiment_id: number;
    status: string;
    current_step: number | null;
    highest_completed_step: number | null;
    total_active_duration_seconds: number | null;
    selected_industry: string | null;
    selected_company: string | null;
    selected_product: string | null;
    start_time: string | null;
    last_activity_at: string | null;
    completion_time: string | null;
}

export interface StudentExperimentLog {
    student_id: number;
    username: string;
    full_name: string;
    experiments: ExperimentLogEntry[] | null;
}
