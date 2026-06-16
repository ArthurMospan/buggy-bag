'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Bug as BugIcon } from 'lucide-react';
import { useProjectContext } from '@/components/layout/ProjectContext';
import PromptGenerator from '@/components/bugs/PromptGenerator';
import { Bug, BugStatus } from '@/lib/types';

export default function ProjectDashboardPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const { selectedBugIds, clearSelectedBugs, refreshTrigger, triggerRefresh } = useProjectContext();
  const [bugs, setBugs] = useState<Bug[]>([]);
  const [loading, setLoading] = useState(true);

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
      
      if (p && !p.connected_domain && b.length === 0) {
        router.replace(`/projects/${id}/integration`);
      } else {
        setBugs(b);
        setLoading(false);
      }
    });
  }, [id, router, refreshTrigger]);

  const handleBulkAction = async (action: 'delete' | 'status' | 'severity', value?: string) => {
    if (selectedBugIds.size === 0) return;
    const ids = Array.from(selectedBugIds);

    if (action === 'delete') {
      if (!confirm(`Ви дійсно хочете видалити ${ids.length} багів?`)) return;
      await fetch('/api/bugs', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ids }) });
    } else if (action === 'status') {
      await fetch('/api/bugs', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ids, status: value }) });
    } else if (action === 'severity') {
      await fetch('/api/bugs', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ids, severity: value }) });
    }

    clearSelectedBugs();
    triggerRefresh();
  };

  if (selectedBugIds.size > 0) {
    return (
      <div className="h-full w-full bg-[#f4f4f5]">
        <PromptGenerator
          bugs={bugs}
          selectedIds={selectedBugIds}
          onBulkAction={handleBulkAction}
        />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col items-center justify-center p-[40px] text-center bg-[#f4f4f5]">
      <div className="w-[72px] h-[72px] bg-[#ffffff] border border-[#e9e9e9] rounded-full flex items-center justify-center mb-[20px] shadow-sm">
        <BugIcon size={28} className="text-[#9a9a9a]" />
      </div>
      <h1 className="text-[20px] font-semibold text-[#1f1f1f] mb-[8px]">Виберіть баг</h1>
      <p className="text-[13px] text-[#9a9a9a] max-w-[360px] leading-relaxed">
        Виберіть баг зі списку зліва, щоб переглянути його деталі, або виділіть кілька чекбоксами для генерації промпту.
      </p>
    </div>
  );
}
