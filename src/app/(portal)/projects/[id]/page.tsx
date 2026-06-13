'use client';
import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { Bug, BugStatus, Project } from '@/lib/types';
import BugCard from '@/components/bugs/BugCard';
import BugDetailModal from '@/components/bugs/BugDetailModal';
import PromptGenerator from '@/components/bugs/PromptGenerator';
import EmptyState from '@/components/ui/Feedback/EmptyState';
import LoadingSpinner from '@/components/ui/Feedback/LoadingSpinner';
import Button from '@/components/ui/Button';
import ProjectTabs from '@/components/bugs/ProjectTabs';
import { Bug as BugIcon, RefreshCw, LayoutGrid, List } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { uk } from 'date-fns/locale';

function formatDay(dateStr: string): string {
  const d = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const isSameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  if (isSameDay(d, today)) return 'Сьогодні';
  if (isSameDay(d, yesterday)) return 'Вчора';
  return d.toLocaleDateString('uk-UA', { day: 'numeric', month: 'long', year: 'numeric' });
}

const STATUS_LABEL: Record<string, string> = { open: 'Новий', in_progress: 'В роботі', resolved: 'Виправлено', closed: 'Закрито' };
const STATUS_COLOR: Record<string, string> = { open: '#6366f1', in_progress: '#f97316', resolved: '#10b981', closed: '#9a9a9a' };
const STATUS_BG: Record<string, string>    = { open: '#eef2ff', in_progress: '#fff7ed', resolved: '#f0fdf4', closed: '#f4f4f5' };
const SEVERITY_COLOR: Record<string, string> = { low: '#6b7280', medium: '#f59e0b', high: '#f97316', critical: '#dc2626' };

function BugGrid({ bugs, selectedIds, onSelect, onOpen }: {
  bugs: Bug[]; selectedIds: Set<string>;
  onSelect: (id: string, e: React.MouseEvent) => void; onOpen: (bug: Bug) => void;
}) {
  const groups: { label: string; bugs: Bug[] }[] = [];
  bugs.forEach(bug => {
    const label = formatDay(bug.created_at ?? new Date().toISOString());
    const last = groups[groups.length - 1];
    if (last && last.label === label) last.bugs.push(bug);
    else groups.push({ label, bugs: [bug] });
  });
  return (
    <div className="flex flex-col gap-[24px]">
      {groups.map(group => (
        <div key={group.label}>
          <div className="flex items-center gap-[10px] mb-[12px]">
            <span className="text-[11px] font-bold text-[#9a9a9a] uppercase tracking-wider">{group.label}</span>
            <div className="flex-1 h-[1px] bg-[#e9e9e9]" />
            <span className="text-[11px] text-[#c0c0c0]">{group.bugs.length}</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-[16px]">
            {group.bugs.map(bug => (
              <BugCard key={bug.id} bug={bug} selected={selectedIds.has(bug.id)} onClick={() => onOpen(bug)} onSelect={e => onSelect(bug.id, e)} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function BugTable({ bugs, selectedIds, onSelect, onOpen }: {
  bugs: Bug[]; selectedIds: Set<string>;
  onSelect: (id: string, e: React.MouseEvent) => void; onOpen: (bug: Bug) => void;
}) {
  return (
    <div className="border border-[#e9e9e9] rounded-[14px] overflow-hidden">
      <table className="w-full border-collapse">
        <thead>
          <tr className="bg-[#f9f9f9] border-b border-[#e9e9e9]">
            <th className="w-[40px] px-[12px] py-[10px]" />
            <th className="w-[80px] px-[12px] py-[10px] text-left text-[11px] font-bold text-[#9a9a9a] uppercase tracking-wider">Скрін</th>
            <th className="px-[12px] py-[10px] text-left text-[11px] font-bold text-[#9a9a9a] uppercase tracking-wider">Опис</th>
            <th className="px-[12px] py-[10px] text-left text-[11px] font-bold text-[#9a9a9a] uppercase tracking-wider">Route</th>
            <th className="w-[80px] px-[12px] py-[10px] text-left text-[11px] font-bold text-[#9a9a9a] uppercase tracking-wider">Severity</th>
            <th className="w-[110px] px-[12px] py-[10px] text-left text-[11px] font-bold text-[#9a9a9a] uppercase tracking-wider">Статус</th>
            <th className="w-[110px] px-[12px] py-[10px] text-left text-[11px] font-bold text-[#9a9a9a] uppercase tracking-wider">Дата</th>
          </tr>
        </thead>
        <tbody>
          {bugs.map((bug, i) => (
            <tr key={bug.id} onClick={() => onOpen(bug)}
              className={`cursor-pointer transition-colors hover:bg-[#f9f9f9] ${i < bugs.length - 1 ? 'border-b border-[#f0f0f0]' : ''} ${selectedIds.has(bug.id) ? 'bg-[#eef2ff]' : ''}`}>
              <td className="px-[12px] py-[10px]" onClick={e => { e.stopPropagation(); onSelect(bug.id, e); }}>
                <div className={`w-[16px] h-[16px] rounded-[4px] border-2 transition-colors ${selectedIds.has(bug.id) ? 'bg-[#6366f1] border-[#6366f1]' : 'border-[#d1d5db]'}`} />
              </td>
              <td className="px-[12px] py-[10px]">
                {bug.image_url
                  ? <img src={bug.image_url} alt="" className="w-[64px] h-[40px] object-cover rounded-[6px] bg-[#f4f4f5]" />
                  : <div className="w-[64px] h-[40px] rounded-[6px] bg-[#f4f4f5] flex items-center justify-center"><BugIcon size={14} className="text-[#cfcfcf]" /></div>
                }
              </td>
              <td className="px-[12px] py-[10px] max-w-[220px]">
                <span className="text-[13px] font-semibold text-[#1f1f1f] line-clamp-2 block">{bug.description || '—'}</span>
              </td>
              <td className="px-[12px] py-[10px]">
                <code className="text-[11px] font-mono text-[#6366f1] bg-[#eef2ff] px-[6px] py-[2px] rounded-[4px] whitespace-nowrap">
                  {bug.tech_context?.route ?? '—'}
                </code>
              </td>
              <td className="px-[12px] py-[10px]">
                <span className="text-[11px] font-bold capitalize" style={{ color: SEVERITY_COLOR[bug.severity ?? 'low'] }}>{bug.severity ?? 'low'}</span>
              </td>
              <td className="px-[12px] py-[10px]">
                <span className="text-[11px] font-bold px-[8px] py-[3px] rounded-[6px] whitespace-nowrap"
                  style={{ color: STATUS_COLOR[bug.status], background: STATUS_BG[bug.status] }}>
                  {STATUS_LABEL[bug.status] ?? bug.status}
                </span>
              </td>
              <td className="px-[12px] py-[10px] whitespace-nowrap">
                <span className="text-[11px] text-[#9a9a9a]">{formatDistanceToNow(new Date(bug.created_at), { addSuffix: true, locale: uk })}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function StatCard({ label, value, active, onClick }: { label: string; value: number; active?: boolean; onClick?: () => void }) {
  return (
    <button onClick={onClick}
      className={`text-left rounded-[14px] p-[14px] border transition-all ${active ? 'bg-[#1f1f1f] border-[#1f1f1f]' : 'bg-[#f9f9f9] border-[#e9e9e9] hover:border-[#cfcfcf]'}`}>
      <div className={`text-[10px] font-bold uppercase tracking-wider mb-[4px] ${active ? 'text-white/60' : 'text-[#9a9a9a]'}`}>{label}</div>
      <div className={`text-[26px] font-bold leading-none ${active ? 'text-white' : 'text-[#1f1f1f]'}`}>{value}</div>
    </button>
  );
}

export default function ProjectPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [project, setProject]           = useState<Project | null>(null);
  const [bugs, setBugs]                 = useState<Bug[]>([]);
  const [loading, setLoading]           = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedBug, setSelectedBug]   = useState<Bug | null>(null);
  const [selectedIds, setSelectedIds]   = useState<Set<string>>(new Set());
  const [viewMode, setViewMode]         = useState<'grid' | 'table'>('grid');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [projRes, bugsRes] = await Promise.all([
        fetch('/api/projects'),
        fetch(`/api/bugs?project_id=${id}${statusFilter ? `&status=${statusFilter}` : ''}`),
      ]);
      const projData = await projRes.json();
      const bugsData = await bugsRes.json();
      const found = (projData.projects ?? []).find((p: Project) => p.id === id);
      if (found) setProject(found);
      setBugs(bugsData.bugs ?? []);
    } finally {
      setLoading(false);
    }
  }, [id, statusFilter]);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    const bugId = searchParams.get('bug');
    if (bugId && bugs.length > 0) {
      const found = bugs.find(b => b.id === bugId);
      if (found) setSelectedBug(found);
    }
  }, [searchParams, bugs]);

  const handleStatusChange = async (bugId: string, status: BugStatus) => {
    const res = await fetch('/api/bugs', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: bugId, status }) });
    if (res.ok) { setBugs(prev => prev.map(b => b.id === bugId ? { ...b, status } : b)); setSelectedBug(prev => prev?.id === bugId ? { ...prev, status } : prev); }
  };

  const handleSeverityChange = async (bugId: string, severity: import('@/lib/types').BugSeverity) => {
    const res = await fetch('/api/bugs', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: bugId, severity }) });
    if (res.ok) { setBugs(prev => prev.map(b => b.id === bugId ? { ...b, severity } : b)); setSelectedBug(prev => prev?.id === bugId ? { ...prev, severity } : prev); }
  };

  const toggleSelect = (bugId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedIds(prev => { const n = new Set(prev); n.has(bugId) ? n.delete(bugId) : n.add(bugId); return n; });
  };

  const currentBugIndex = selectedBug ? bugs.findIndex(b => b.id === selectedBug.id) : -1;
  const handlePrev = () => { if (currentBugIndex > 0) setSelectedBug(bugs[currentBugIndex - 1]); };
  const handleNext = () => { if (currentBugIndex < bugs.length - 1) setSelectedBug(bugs[currentBugIndex + 1]); };

  const openCount  = bugs.filter(b => b.status === 'open').length;
  const inProgress = bugs.filter(b => b.status === 'in_progress').length;
  const resolved   = bugs.filter(b => b.status === 'resolved').length;

  const handleStatFilter = (status: string) => setStatusFilter(prev => prev === status ? '' : status);

  const closeModal = () => {
    setSelectedBug(null);
    const params = new URLSearchParams(searchParams.toString());
    params.delete('bug');
    router.replace(`/projects/${id}${params.toString() ? '?' + params.toString() : ''}`, { scroll: false });
  };

  return (
    <div className="p-[24px] flex flex-col gap-[20px]">

      <div className="flex items-center justify-between gap-[16px]">
        <div>
          <h1 className="text-[20px] font-bold text-[#1f1f1f]">{project?.name ?? '...'}</h1>
          <p className="text-[12px] text-[#9a9a9a] mt-[2px]">{openCount} нових · {inProgress} в роботі</p>
        </div>
        <div className="flex items-center gap-[6px] shrink-0">
          <ProjectTabs projectId={id} />
          <PromptGenerator bugs={bugs} selectedIds={selectedIds} onSelectedIdsChange={setSelectedIds} onStatusChange={handleStatusChange} />
          <Button style="ghost" size="icon-lg" icon={RefreshCw} onClick={fetchData} title="Оновити" />
        </div>
      </div>

      <div className="grid grid-cols-4 gap-[10px]">
        <StatCard label="Всього"     value={bugs.length} active={statusFilter === ''}            onClick={() => setStatusFilter('')} />
        <StatCard label="Нові"       value={openCount}   active={statusFilter === 'open'}        onClick={() => handleStatFilter('open')} />
        <StatCard label="В роботі"   value={inProgress}  active={statusFilter === 'in_progress'} onClick={() => handleStatFilter('in_progress')} />
        <StatCard label="Виправлені" value={resolved}    active={statusFilter === 'resolved'}    onClick={() => handleStatFilter('resolved')} />
      </div>

      <div className="flex items-center justify-between gap-[12px]">
        {selectedIds.size > 0 ? (
          <div className="flex items-center gap-[10px] bg-[#eef2ff] border border-[#c7d2fe] rounded-[10px] px-[14px] py-[8px]">
            <span className="text-[12px] font-bold text-[#4338ca]">Вибрано {selectedIds.size} {selectedIds.size === 1 ? 'баг' : 'баги'} для промпту</span>
            <button onClick={() => setSelectedIds(new Set())} className="text-[11px] text-[#6366f1] hover:underline ml-2">Зняти</button>
          </div>
        ) : <div />}
        <div className="flex items-center gap-[2px] bg-[#f4f4f5] rounded-[10px] p-[3px]">
          <button onClick={() => setViewMode('grid')} title="Сітка"
            className={`p-[6px] rounded-[8px] transition-colors ${viewMode === 'grid' ? 'bg-white shadow-sm text-[#1f1f1f]' : 'text-[#9a9a9a] hover:text-[#1f1f1f]'}`}>
            <LayoutGrid size={16} />
          </button>
          <button onClick={() => setViewMode('table')} title="Таблиця"
            className={`p-[6px] rounded-[8px] transition-colors ${viewMode === 'table' ? 'bg-white shadow-sm text-[#1f1f1f]' : 'text-[#9a9a9a] hover:text-[#1f1f1f]'}`}>
            <List size={16} />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-[60px]"><LoadingSpinner size="lg" /></div>
      ) : bugs.length === 0 ? (
        <EmptyState icon={BugIcon} title="Багів поки немає"
          description={statusFilter ? 'Немає багів з таким статусом.' : "Баги з'являться тут після першої помилки від вашого віджета."} />
      ) : viewMode === 'grid' ? (
        <BugGrid bugs={bugs} selectedIds={selectedIds} onSelect={(id, e) => toggleSelect(id, e)} onOpen={setSelectedBug} />
      ) : (
        <BugTable bugs={bugs} selectedIds={selectedIds} onSelect={(id, e) => toggleSelect(id, e)} onOpen={setSelectedBug} />
      )}

      <BugDetailModal
        bug={selectedBug}
        onClose={closeModal}
        onStatusChange={handleStatusChange}
        onSeverityChange={handleSeverityChange}
        onPrev={currentBugIndex > 0 ? handlePrev : undefined}
        onNext={currentBugIndex < bugs.length - 1 ? handleNext : undefined}
        hasPrev={currentBugIndex > 0}
        hasNext={currentBugIndex < bugs.length - 1}
      />
    </div>
  );
}
