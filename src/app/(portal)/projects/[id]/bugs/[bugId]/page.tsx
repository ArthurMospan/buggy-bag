'use client';
import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { Bug, Project } from '@/lib/types';
import BugDetailView from '@/components/bugs/BugDetailView';
import LoadingSpinner from '@/components/ui/Feedback/LoadingSpinner';

export default function BugPage() {
  const { id, bugId } = useParams<{ id: string; bugId: string }>();
  const [bug, setBug] = useState<Bug | null>(null);
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [allBugs, setAllBugs] = useState<Bug[]>([]);

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
    if (res.ok) setBug(prev => prev ? { ...prev, status } : prev);
  };

  const handleSeverityChange = async (bugId: string, severity: any) => {
    const res = await fetch('/api/bugs', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: bugId, severity }) });
    if (res.ok) setBug(prev => prev ? { ...prev, severity } : prev);
  };

  if (loading) {
    return <div className="flex h-full items-center justify-center"><LoadingSpinner size="lg" /></div>;
  }

  if (!bug) {
    return <div className="flex h-full items-center justify-center text-[#9a9a9a]">Баг не знайдено</div>;
  }

  return (
    <BugDetailView 
      bug={bug} 
      project={project} 
      allBugs={allBugs}
      onStatusChange={handleStatusChange} 
      onSeverityChange={handleSeverityChange} 
    />
  );
}
