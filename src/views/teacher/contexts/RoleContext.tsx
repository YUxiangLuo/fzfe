import React, { createContext, useContext, useState, useMemo } from 'react';
import type { Role } from '@/config/roles';

interface RoleContextType {
  role: Role | null;
  setRole: (role: Role | null) => void;
}

const RoleContext = createContext<RoleContextType | undefined>(undefined);

export const RoleProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [role, setRole] = useState<Role | null>(null);

  const contextValue = useMemo(() => ({
    role,
    setRole,
  }), [role]);

  return (
    <RoleContext.Provider value={contextValue}>
      {children}
    </RoleContext.Provider>
  );
};

export const useRole = (): RoleContextType => {
  const context = useContext(RoleContext);
  if (!context) {
    throw new Error('useRole must be used within a RoleProvider');
  }
  return context;
};
