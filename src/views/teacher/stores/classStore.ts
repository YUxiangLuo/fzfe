import { create } from 'zustand';
import type { Class, Assistant } from '@/views/teacher/types';
import { apiClient } from '@/utils/apiClient';
import { decodeToken } from '@/utils/auth';

export interface EnrichedClass extends Class {
  assistants?: Assistant[];
}

interface ClassState {
  classes: EnrichedClass[];
  isLoading: boolean;
  error: string | null;
  hasFetched: boolean;
  fetchClasses: () => Promise<void>;
  addClass: (newClass: EnrichedClass) => void;
  updateClass: (updatedClass: EnrichedClass) => void;
  deleteClass: (classId: number) => void;
}

const getTeacherId = (): number | null => {
  const token = localStorage.getItem('token');
  if (!token) return null;
  const decoded = decodeToken(token);
  return decoded?.sub ?? null;
};

export const useClassStore = create<ClassState>((set, get) => ({
  classes: [],
  isLoading: false,
  error: null,
  hasFetched: false,
  fetchClasses: async () => {
    const teacherId = getTeacherId();
    if (!teacherId) {
      set({ error: '无法获取用户信息，请重新登录。', isLoading: false, hasFetched: true });
      return;
    }

    // Always request the teacher endpoint. 
    // The apiClient will automatically rewrite it for assistants.
    const endpoint = `/teachers/${teacherId}/classes`;

    set({ isLoading: true, error: null });
    try {
      const data = await apiClient.get<Class[]>(endpoint);
      const enrichedClasses = await Promise.all(
        data.map(async (cls) => {
          try {
            const assistants = await apiClient.get<Assistant[]>(`/classes/${cls.class_id}/assistants`);
            return { ...cls, assistants: Array.isArray(assistants) ? assistants : [] };
          } catch (assistErr) {
            console.error(`Failed to fetch assistants for class ${cls.class_id}`, assistErr);
            return { ...cls, assistants: [] };
          }
        })
      );
      set({ classes: enrichedClasses, isLoading: false, error: null, hasFetched: true });
    } catch (err: any) {
      set({ classes: [], error: err.message || '获取班级列表失败', isLoading: false, hasFetched: true });
    }
  },
  addClass: (newClass) => {
    set((state) => ({ classes: [newClass, ...state.classes] }));
  },
  updateClass: (updatedClass) => {
    set((state) => ({
      classes: state.classes.map((cls) =>
        cls.class_id === updatedClass.class_id
          ? { ...cls, ...updatedClass, assistants: cls.assistants } // Preserve assistants
          : cls
      ),
    }));
  },
  deleteClass: (classId) => {
    set((state) => ({
      classes: state.classes.filter((cls) => cls.class_id !== classId),
    }));
  },
}));