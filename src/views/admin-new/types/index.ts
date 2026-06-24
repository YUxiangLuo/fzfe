export interface User {
    user_id: number;
    username: string;
    full_name: string;
    email: string;
    role: 'Student' | 'Teacher' | 'Assistant' | 'Admin';
    created_at: string;
    phone_number?: string | null;
    status?: 'active' | 'inactive';
}

export interface ExperimentManual {
    manual_id: number;
    file_name: string;
    file_path: string;
    description: string | null;
    is_active: 0 | 1;
    uploader_id: number;
    uploaded_at: string;
    uploader_name: string;
}

export interface ExperimentData {
    dataset_id: number;
    data_name: string;
    file_path: string;
    description: string | null;
    uploaded_at: string;
}

export interface Student {
    user_id: number;
    username: string;
    full_name: string;
    email: string;
}

export interface Class {
    class_id: number;
    class_name: string;
    class_code: string | null;
    teacher_id: number;
    teacher_name: string;
    students?: Student[];
    assistants?: User[];
}

export interface MenuItem {
    id: string;
    label: string;
    icon: string;
    children?: MenuItem[];
}
