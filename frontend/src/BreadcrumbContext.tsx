import React, { createContext, useContext, useState } from 'react';
import type { ReactNode } from 'react';

export interface BreadcrumbItem {
  label: string;
  path: string;
}

interface BreadcrumbContextType {
  breadcrumb: BreadcrumbItem[];
  addBreadcrumb: (item: BreadcrumbItem) => void;
  resetBreadcrumb: () => void;
  goToBreadcrumb: (path: string) => void;
}

const BreadcrumbContext = createContext<BreadcrumbContextType | undefined>(undefined);

export const useBreadcrumbContext = () => {
  const ctx = useContext(BreadcrumbContext);
  if (!ctx) throw new Error('useBreadcrumbContext must be used within BreadcrumbProvider');
  return ctx;
};

export const BreadcrumbProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [breadcrumb, setBreadcrumb] = useState<BreadcrumbItem[]>([{
    label: 'Dashboard',
    path: '/dashboard',
  }]);

  const addBreadcrumb = (item: BreadcrumbItem) => {
    if (item.path === '/dashboard') {
      setBreadcrumb([{ label: 'Dashboard', path: '/dashboard' }]);
      return;
    }
    const idx = breadcrumb.findIndex(b => b.path === item.path);
    if (idx !== -1) {
      setBreadcrumb(breadcrumb.slice(0, idx + 1));
    } else {
      setBreadcrumb([...breadcrumb, item]);
    }
  };

  const resetBreadcrumb = () => {
    setBreadcrumb([{ label: 'Dashboard', path: '/dashboard' }]);
  };

  const goToBreadcrumb = (path: string) => {
    const idx = breadcrumb.findIndex(b => b.path === path);
    if (idx !== -1) {
      setBreadcrumb(breadcrumb.slice(0, idx + 1));
    }
  };

  return (
    <BreadcrumbContext.Provider value={{ breadcrumb, addBreadcrumb, resetBreadcrumb, goToBreadcrumb }}>
      {children}
    </BreadcrumbContext.Provider>
  );
}; 