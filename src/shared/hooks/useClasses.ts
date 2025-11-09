import { useEffect } from 'react';
import { useClassStore } from '@/shared/stores/classStore';
export type { EnrichedClass } from '@/shared/stores/classStore';

// This hook now acts as a "selector" into the Zustand store,
// and ensures the data is fetched only once.
export const useClasses = () => {
  const {
    classes,
    isLoading,
    error,
    fetchClasses,
    addClass,
    updateClass,
    deleteClass,
  } = useClassStore();

  useEffect(() => {
    // The store holds the state, so we only need to fetch if the store is empty.
    // This prevents re-fetching on every component mount.
    if (classes.length === 0 && !isLoading && !error) {
      fetchClasses();
    }
  }, [classes.length, isLoading, error, fetchClasses]);

  return { classes, isLoading, error, fetchClasses, addClass, updateClass, deleteClass };
};
