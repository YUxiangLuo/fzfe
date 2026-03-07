import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useExperiment } from '../contexts/ExperimentContext.zustand';
import {
  getTrainingLockRedirectPath,
  shouldBlockBeforeUnload,
} from '../utils/routeGuards';

export const TrainingNavigationGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { ui } = useExperiment();
  const location = useLocation();

  React.useEffect(() => {
    if (!shouldBlockBeforeUnload(ui)) return;

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [ui]);

  const redirectPath = getTrainingLockRedirectPath(ui, location.pathname);

  if (redirectPath) {
    return <Navigate to={redirectPath} replace />;
  }

  return <>{children}</>;
};