'use client';
import { createContext, useContext, useState, ReactNode } from 'react';

interface ProjectContextType {
  selectedBugIds: Set<string>;
  toggleSelectBug: (id: string, multi?: boolean) => void;
  clearSelectedBugs: () => void;
  selectAllBugs: (ids: string[]) => void;
  refreshTrigger: number;
  triggerRefresh: () => void;
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

export function ProjectProvider({ children }: { children: ReactNode }) {
  const [selectedBugIds, setSelectedBugIds] = useState<Set<string>>(new Set());
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const toggleSelectBug = (id: string) => {
    setSelectedBugIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const clearSelectedBugs = () => setSelectedBugIds(new Set());
  const selectAllBugs = (ids: string[]) => setSelectedBugIds(new Set(ids));
  const triggerRefresh = () => setRefreshTrigger(prev => prev + 1);

  return (
    <ProjectContext.Provider value={{ selectedBugIds, toggleSelectBug, clearSelectedBugs, selectAllBugs, refreshTrigger, triggerRefresh }}>
      {children}
    </ProjectContext.Provider>
  );
}

export function useProjectContext() {
  const context = useContext(ProjectContext);
  if (!context) throw new Error('useProjectContext must be used within a ProjectProvider');
  return context;
}
