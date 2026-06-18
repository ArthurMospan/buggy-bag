'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Bug as BugIcon } from 'lucide-react';
import AnimatedLogo from '@/components/ui/AnimatedLogo';
import { useProjectContext } from '@/components/layout/ProjectContext';
import PromptGenerator from '@/components/bugs/PromptGenerator';
import SetupGuide from '@/components/bugs/SetupGuide';
import { Bug, BugStatus } from '@/lib/types';

export default function ProjectDashboardPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const { selectedBugIds, clearSelectedBugs, refreshTrigger, triggerRefresh } = useProjectContext();
  const [bugs, setBugs] = useState<Bug[]>([]);
  const [loading, setLoading] = useState(true);
  const [project, setProject] = useState<any>(null);

  useEffect(() => {
    Promise.all([
      fetch(`/api/projects`),
      fetch(`/api/bugs?project_id=${id}`)
    ])
    .then(async ([projRes, bugRes]) => {
      const projData = await projRes.json();
      const bugData = await bugRes.json();
      
      const p = (projData.projects || []).find((p: any) => p.id === id);
      const b = bugData.bugs || [];
      
      setProject(p);
      setBugs(b);
      setLoading(false);
    });
  }, [id, router, refreshTrigger]);

  const handleBulkAction = async (action: 'delete' | 'status' | 'severity', value?: string) => {
    if (selectedBugIds.size === 0) return;
    const ids = Array.from(selectedBugIds);

    try {
      let res;
      if (action === 'delete') {
        if (!confirm(`Ви дійсно хочете видалити ${ids.length} багів?`)) return;
        res = await fetch('/api/bugs', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ids }) });
      } else if (action === 'status') {
        res = await fetch('/api/bugs', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ids, status: value }) });
      } else if (action === 'severity') {
        res = await fetch('/api/bugs', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ids, severity: value }) });
      }

      if (res && !res.ok) {
        const err = await res.json().catch(() => ({ error: 'Unknown error' }));
        alert(`Помилка: ${err.error || res.statusText}`);
        return;
      }
    } catch (err: any) {
      alert(`Помилка: ${err.message}`);
      return;
    }

    clearSelectedBugs();
    triggerRefresh();
  };

  if (loading) return <div className="h-full w-full bg-[#ffffff] rounded-r-[24px]" />;

  if (project && !project.connected_domain && bugs.length === 0) {
    return (
      <div className="h-full w-full bg-[#ffffff] overflow-y-auto p-[40px]">
        <div className="max-w-[800px] mx-auto">
          <SetupGuide apiKey={project.api_key} />
        </div>
      </div>
    );
  }

  if (selectedBugIds.size > 0) {
    return (
      <div className="h-full w-full bg-[#2a2a2a] rounded-r-[24px] overflow-hidden">
        <PromptGenerator
          bugs={bugs}
          selectedIds={selectedBugIds}
          onBulkAction={handleBulkAction}
        />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col items-center justify-center p-[40px] text-center bg-[#ffffff]">
      <div className="mb-[24px] text-[#1f1f1f]">
        <AnimatedLogo size={84} />
      </div>
      <h1 className="text-[20px] font-semibold text-[#1f1f1f] mb-[8px]">Виберіть баг</h1>
      <p className="text-[13px] text-[#9a9a9a] max-w-[360px] leading-relaxed">
        Виберіть баг зі списку зліва, щоб переглянути його деталі, або виділіть кілька чекбоксами для генерації промпту.
      </p>
    </div>
  );
}
