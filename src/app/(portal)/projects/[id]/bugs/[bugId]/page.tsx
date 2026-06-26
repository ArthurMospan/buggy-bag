'use client';
import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { Bug, Project } from '@/lib/types';
import BugDetailView from '@/components/bugs/BugDetailView';
import LoadingSpinner from '@/components/ui/Feedback/LoadingSpinner';
import { useProjectContext } from '@/components/layout/ProjectContext';

export default function BugPage() {
  const { id, bugId } = useParams<{ id: string; bugId: string }>();
  const [bug, setBug] = useState<Bug | null>(null);
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [allBugs, setAllBugs] = useState<Bug[]>([]);
  const { triggerRefresh } = useProjectContext();

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [projRes, bugRes] = await Promise.all([
        fetch('/api/projects'),
        fetch(`/api/bugs?project_id=${id}`), // we fetch all for now and find, could be optimized
      ]);
      const projData = await projRes.json();
      const bugsData = await bugRes.json();
      
      const foundProj = (projData.projects ?? []).find((p: Project) => p.id === id);
      if (foundProj) setProject(foundProj);
      
      setAllBugs(bugsData.bugs ?? []);
      const foundBug = (bugsData.bugs ?? []).find((b: Bug) => b.id === bugId);
      if (foundBug) setBug(foundBug);
    } finally {
      setLoading(false);
    }
  }, [id, bugId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleStatusChange = async (bugId: string, status: any) => {
    const res = await fetch('/api/bugs', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: bugId, status }) });
    if (res.ok) {
      setBug(prev => prev ? { ...prev, status } : prev);
      triggerRefresh();
    } else {
      const err = await res.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(err.error || res.statusText);
    }
  };

  const handleSeverityChange = async (bugId: string, severity: any) => {
    const res = await fetch('/api/bugs', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: bugId, severity }) });
    if (res.ok) {
      setBug(prev => prev ? { ...prev, severity } : prev);
      triggerRefresh();
    } else {
      const err = await res.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(err.error || res.statusText);
    }
  };

  const handleDelete = async (bugId: string) => {
    const res = await fetch(`/api/bugs`, { 
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: [bugId] })
    });
    if (res.ok) {
      triggerRefresh();
      window.location.href = `/projects/${id}`;
    } else {
      const err = await res.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(err.error || res.statusText);
    }
  };

  const handleUpdate = async (bugId: string, updates: Partial<Bug>) => {
    const res = await fetch('/api/bugs', { 
      method: 'PATCH', 
      headers: { 'Content-Type': 'application/json' }, 
      body: JSON.stringify({ id: bugId, ...updates }) 
    });
    if (res.ok) {
      setBug(prev => prev ? { ...prev, ...updates } : prev);
      triggerRefresh();
    } else {
      const err = await res.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(err.error || res.statusText);
    }
  };

  if (loading) {
    return <div className="flex h-full items-center justify-center bg-[#f4f4f5]"><LoadingSpinner size="lg" /></div>;
  }

  if (!bug) {
    return <div className="flex h-full items-center justify-center text-[#9a9a9a] bg-[#f4f4f5]">Баг не знайдено</div>;
  }

  return (
    <BugDetailView 
      bug={bug} 
      project={project} 
      allBugs={allBugs}
      onStatusChange={handleStatusChange} 
      onSeverityChange={handleSeverityChange} 
      onDelete={handleDelete}
      onUpdate={handleUpdate}
    />
  );
}
