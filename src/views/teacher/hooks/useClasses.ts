import { useEffect } from 'react';
import { useClassStore } from '@/views/teacher/stores/classStore';
export type { EnrichedClass } from '@/views/teacher/stores/classStore';

// This hook now acts as a "selector" into the Zustand store,
// and ensures the data is fetched only once.
export const useClasses = () => {
  const {
    classes,
    isLoading,
    error,
    hasFetched,
    fetchClasses,
    addClass,
    updateClass,
    deleteClass,
  } = useClassStore();

  useEffect(() => {
    // Only fetch if it hasn't been attempted yet and is not currently loading.
    if (!hasFetched && !isLoading) {
      fetchClasses();
    }
  }, [hasFetched, isLoading, fetchClasses]);

  return { classes, isLoading, error, fetchClasses, addClass, updateClass, deleteClass };
};
