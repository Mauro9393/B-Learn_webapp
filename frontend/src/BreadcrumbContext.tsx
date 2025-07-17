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
  // Carica i breadcrumbs dal localStorage all'inizializzazione
  const getInitialBreadcrumbs = (): BreadcrumbItem[] => {
    try {
      const saved = localStorage.getItem('breadcrumbs');
      if (saved) {
        const parsed = JSON.parse(saved);
        return Array.isArray(parsed) ? parsed : [{ label: 'Dashboard', path: '/dashboard' }];
      }
    } catch (error) {
      console.error('Errore nel caricamento dei breadcrumbs:', error);
    }
    return [{ label: 'Dashboard', path: '/dashboard' }];
  };

  const [breadcrumb, setBreadcrumb] = useState<BreadcrumbItem[]>(getInitialBreadcrumbs);

  // Funzione per salvare i breadcrumbs nel localStorage
  const saveBreadcrumbs = (breadcrumbs: BreadcrumbItem[]) => {
    try {
      localStorage.setItem('breadcrumbs', JSON.stringify(breadcrumbs));
    } catch (error) {
      console.error('Errore nel salvataggio dei breadcrumbs:', error);
    }
  };

  const addBreadcrumb = (item: BreadcrumbItem) => {
    let newBreadcrumbs: BreadcrumbItem[];
    
    if (item.path === '/dashboard') {
      newBreadcrumbs = [{ label: 'Dashboard', path: '/dashboard' }];
    } else {
      const idx = breadcrumb.findIndex(b => b.path === item.path);
      if (idx !== -1) {
        newBreadcrumbs = breadcrumb.slice(0, idx + 1);
      } else {
        newBreadcrumbs = [...breadcrumb, item];
      }
    }
    
    setBreadcrumb(newBreadcrumbs);
    saveBreadcrumbs(newBreadcrumbs);
  };

  const resetBreadcrumb = () => {
    const defaultBreadcrumbs = [{ label: 'Dashboard', path: '/dashboard' }];
    setBreadcrumb(defaultBreadcrumbs);
    saveBreadcrumbs(defaultBreadcrumbs);
  };

  const goToBreadcrumb = (path: string) => {
    const idx = breadcrumb.findIndex(b => b.path === path);
    if (idx !== -1) {
      const newBreadcrumbs = breadcrumb.slice(0, idx + 1);
      setBreadcrumb(newBreadcrumbs);
      saveBreadcrumbs(newBreadcrumbs);
    }
  };

  return (
    <BreadcrumbContext.Provider value={{ breadcrumb, addBreadcrumb, resetBreadcrumb, goToBreadcrumb }}>
      {children}
    </BreadcrumbContext.Provider>
  );
}; 