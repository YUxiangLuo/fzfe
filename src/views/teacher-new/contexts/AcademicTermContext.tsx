import React from 'react';
import type { AcademicTerm } from '../utils/academicTerm';

interface AcademicTermContextValue {
  availableTerms: AcademicTerm[];
  selectedTerm: AcademicTerm | null;
  selectedTermKey: string | null;
  setSelectedTermKey: (key: string) => void;
  isLoadingTerms: boolean;
  refreshTerms: () => void;
}

const AcademicTermContext = React.createContext<AcademicTermContextValue | null>(null);

export const AcademicTermProvider = AcademicTermContext.Provider;

export const useAcademicTerm = (): AcademicTermContextValue => {
  const context = React.useContext(AcademicTermContext);
  if (!context) {
    throw new Error('useAcademicTerm must be used within AcademicTermProvider');
  }
  return context;
};
