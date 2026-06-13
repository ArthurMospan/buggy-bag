'use client';
import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { Project, ActivityLog } from '@/lib/types';
import LoadingSpinner from '@/components/ui/Feedback/LoadingSpinner';
import ProjectTabs from '@/components/bugs/ProjectTabs';
import { Copy, Check, Terminal, Code2, Play, Circle, CheckCircle2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { uk } from 'date-fns/locale';

function CodeBlock({ code, label }: { code: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div className="flex flex-col gap-[6px]">
      {label && <div className="text-[11px] font-bold text-[#9a9a9a] uppercase tracking-wider">{label}</div>}
      <div className="relative bg-[#1f1f1f] rounded-[12px] overflow-hidden">
        <pre className="text-[12px] font-mono text-[#e5e5e5] p-[14px] pr-[80px] overflow-x-auto leading-relaxed whitespace-pre-wrap">{code}</pre>
        <button onClick={handleCopy} className="absolute top-[8px] right-[8px] flex items-center gap-[4px] bg-white/10 hover:bg-white/20 text-white/70 hover:text-white text-[10px] font-bold px-[8px] py-[4px] rounded-[6px] transition-colors">
          {copied ? <Check size={10} /> : <Copy size={10} />}
          {copied ? 'Скопійовано' : 'Копіювати'}
        </button>
      </div>
    </div>
  );
}

function WidgetStatus({ project, onUpdate }: { project: Project, onUpdate: (p: Project) => void }) {
  const [isUpdating, setIsUpdating] = useState(false);

  const toggleActive = async () => {
    if (isUpdating) return;
    setIsUpdating(true);
    const newVal = !project.is_active;
    try {
      const res = await fetch('/api/projects', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: project.id, is_active: newVal }),
      });
      if (res.ok) {
        onUpdate({ ...project, is_active: newVal });
      }
    } catch (e) {
      console.error('Failed to toggle widget active state', e);
    } finally {
      setIsUpdating(false);
    }
  };

  const hasSeen = !!project.last_seen_at;
  const lastSeenText = hasSeen
    ? `Був онлайн ${formatDistanceToNow(new Date(project.last_seen_at!), { addSuffix: true, locale: uk })}`
    : 'Ще не підключено';

  const dotColor = !project.is_active ? '#ef4444' : hasSeen ? '#22c55e' : '#f59e0b';
  const statusLabel = !project.is_active ? 'Віджет вимкнено' : hasSeen ? 'Віджет підключено' : 'Очікуємо підключення...';

  return (
    <div className="flex flex-col gap-[12px] bg-[#f4f4f5] rounded-[14px] px-[16px] py-[16px]">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-[12px]">
          <span style={{ width: 10, height: 10, borderRadius: '50%', background: dotColor, display: 'inline-block', flexShrink: 0 }} />
          <div className="flex flex-col">
            <span className="text-[14px] font-semibold text-[#1f1f1f]">{statusLabel}</span>
            <span className="text-[12px] text-[#9a9a9a]">
              {project.is_active ? lastSeenText : 'Збір багів призупинено'}
              {project.connected_domain && ` • Домен: ${project.connected_domain}`}
            </span>
          </div>
        </div>
        
        <div className="flex items-center gap-[10px]">
          <span className="text-[13px] font-medium text-[#1f1f1f]">Активність</span>
          <button 
            onClick={toggleActive} 
            disabled={isUpdating}
            className={`relative w-[44px] h-[24px] rounded-full transition-colors ${project.is_active ? 'bg-[#22c55e]' : 'bg-[#d4d4d8]'} ${isUpdating ? 'opacity-50' : ''}`}
          >
            <div className={`absolute top-[2px] left-[2px] w-[20px] h-[20px] bg-white rounded-full transition-transform ${project.is_active ? 'translate-x-[20px]' : 'translate-x-0'}`} />
          </button>
        </div>
      </div>
    </div>
  );
}

function Instructions({ project }: { project: Project }) {
  const [tab, setTab] = useState<'npm' | 'script'>('npm');
  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://your-portal.com';

  const npmCode = `npm install buggy-bag-widget`;
  const reactCode = `import { BuggyBag } from 'buggy-bag-widget';

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        {children}
        <BuggyBag 
          apiKey="${project.api_key}" 
          portalUrl="${origin}" 
        />
      </body>
    </html>
  );
}`;

  const scriptCode = `<!-- Додайте цей скрипт перед </body> -->
<script
  src="${origin}/buggy-bag-standalone.js"
  data-api-key="${project.api_key}"
  data-portal-url="${origin}"
  async
></script>`;

  const bookmarkletCode = `javascript:(function(){localStorage.setItem('BUGGY_BAG_ACCESS','active');location.reload();})();`;

  return (
    <div className="flex flex-col gap-[20px]">
      <div className="flex items-center gap-[8px] border-b border-[#e9e9e9] pb-[10px]">
        <button onClick={() => setTab('npm')} className={`flex items-center gap-[6px] px-[12px] py-[6px] rounded-[8px] text-[13px] font-semibold transition-colors ${tab === 'npm' ? 'bg-[#f4f4f5] text-[#1f1f1f]' : 'text-[#9a9a9a] hover:text-[#1f1f1f]'}`}>
          <Terminal size={14} /> NPM Package
        </button>
        <button onClick={() => setTab('script')} className={`flex items-center gap-[6px] px-[12px] py-[6px] rounded-[8px] text-[13px] font-semibold transition-colors ${tab === 'script' ? 'bg-[#f4f4f5] text-[#1f1f1f]' : 'text-[#9a9a9a] hover:text-[#1f1f1f]'}`}>
          <Code2 size={14} /> Script Tag
        </button>
      </div>

      <div className="flex flex-col gap-[16px]">
        {tab === 'npm' ? (
          <>
            <p className="text-[13px] text-[#1f1f1f]">1. Встановіть пакет у ваш проєкт:</p>
            <CodeBlock code={npmCode} />
            <p className="text-[13px] text-[#1f1f1f]">2. Додайте компонент у корінь вашого додатку (наприклад, `app/layout.tsx` для Next.js):</p>
            <CodeBlock code={reactCode} />
          </>
        ) : (
          <>
            <p className="text-[13px] text-[#1f1f1f]">Вставте цей скрипт у код вашого сайту (працює на будь-якому стеку):</p>
            <CodeBlock code={scriptCode} />
          </>
        )}
      </div>

      <div className="mt-[10px]">
        <div className="text-[14px] font-bold text-[#1f1f1f] mb-[8px]">Як активувати віджет?</div>
        <p className="text-[13px] text-[#9a9a9a] mb-[12px]">Жучок прихований від звичайних відвідувачів. Щоб він з'явився, є два способи:</p>
        
        <div className="flex flex-col gap-[10px]">
          <div className="bg-[#f9f9f9] border border-[#e9e9e9] rounded-[12px] p-[12px]">
            <div className="text-[13px] font-semibold text-[#1f1f1f] mb-[4px]">Варіант А: Букмарклет (Рекомендовано)</div>
            <p className="text-[12px] text-[#9a9a9a] mb-[12px]">Перетягніть цю кнопку у панель закладок вашого браузера. Потім просто натисніть її на вашому сайті.</p>
            <a href={bookmarkletCode} draggable onClick={e => e.preventDefault()} className="inline-flex items-center gap-[8px] px-[14px] py-[8px] bg-[#1f1f1f] text-white text-[12px] font-bold rounded-[8px] cursor-grab hover:bg-[#303030] transition-colors">
              <Play size={14} /> Активувати BuggyBag
            </a>
          </div>
          <div className="bg-[#f9f9f9] border border-[#e9e9e9] rounded-[12px] p-[12px]">
            <div className="text-[13px] font-semibold text-[#1f1f1f] mb-[4px]">Варіант Б: URL Параметр</div>
            <p className="text-[12px] text-[#9a9a9a]">Додайте <code className="bg-white px-[4px] py-[2px] rounded border border-[#e9e9e9]">?bb=on</code> до адреси вашого сайту та оновіть сторінку.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function ActivityTimeline({ logs }: { logs: ActivityLog[] }) {
  if (logs.length === 0) {
    return (
      <div className="text-center py-[40px] text-[#9a9a9a] text-[13px]">
        Історія подій поки порожня.
      </div>
    );
  }

  const getLogDetails = (log: ActivityLog) => {
    switch (log.action) {
      case 'widget_connected': return { icon: <CheckCircle2 size={16} className="text-[#22c55e]" />, text: 'Віджет підключено', desc: `Домен: ${log.details?.domain || 'Невідомо'}` };
      case 'bug_received': return { icon: <Circle size={16} className="text-[#6366f1] fill-[#eef2ff]" />, text: 'Отримано новий баг', desc: `ID: ${log.details?.bug_id?.split('-')[0]}` };
      case 'widget_disabled': return { icon: <Circle size={16} className="text-[#ef4444]" />, text: 'Віджет вимкнено з порталу' };
      case 'widget_enabled': return { icon: <CheckCircle2 size={16} className="text-[#22c55e]" />, text: 'Віджет знову увімкнено' };
      default: return { icon: <Circle size={16} />, text: log.action };
    }
  };

  return (
    <div className="relative border-l border-[#e9e9e9] ml-[10px] pl-[20px] py-[10px] flex flex-col gap-[24px]">
      {logs.map((log) => {
        const { icon, text, desc } = getLogDetails(log);
        return (
          <div key={log.id} className="relative">
            <div className="absolute left-[-29px] top-[2px] bg-white rounded-full">{icon}</div>
            <div className="flex flex-col">
              <span className="text-[13px] font-semibold text-[#1f1f1f]">{text}</span>
              <div className="flex items-center gap-[8px] mt-[2px]">
                {desc && <span className="text-[12px] text-[#1f1f1f]">{desc}</span>}
                {desc && <span className="text-[#d4d4d8]">•</span>}
                <span className="text-[11px] text-[#9a9a9a]">{formatDistanceToNow(new Date(log.created_at), { addSuffix: true, locale: uk })}</span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function IntegrationPage() {
  const { id } = useParams<{ id: string }>();
  const [project, setProject] = useState<Project | null>(null);
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [projRes, logsRes] = await Promise.all([
        fetch('/api/projects'),
        fetch(`/api/projects/activity?project_id=${id}`)
      ]);
      const projData = await projRes.json();
      const logsData = await logsRes.json();
      const found = (projData.projects ?? []).find((p: Project) => p.id === id);
      if (found) setProject(found);
      setLogs(logsData.logs ?? []);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (loading) {
    return (
      <div className="p-[24px]">
        <div className="flex items-center gap-[6px] shrink-0 mb-[24px]"><ProjectTabs projectId={id} /></div>
        <div className="flex items-center justify-center py-[60px]"><LoadingSpinner size="lg" /></div>
      </div>
    );
  }

  if (!project) return <div className="p-[24px]">Project not found</div>;

  return (
    <div className="p-[24px] flex flex-col gap-[24px]">
      <div className="flex items-center justify-between gap-[16px]">
        <div>
          <h1 className="text-[20px] font-bold text-[#1f1f1f]">{project.name}</h1>
          <p className="text-[12px] text-[#9a9a9a] mt-[2px]">Налаштування та Інтеграція</p>
        </div>
        <div className="flex items-center gap-[6px] shrink-0">
          <ProjectTabs projectId={id} />
        </div>
      </div>

      <WidgetStatus project={project} onUpdate={setProject} />

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-[40px] mt-[10px]">
        <div className="lg:col-span-3 flex flex-col gap-[24px]">
          <h2 className="text-[16px] font-bold text-[#1f1f1f]">Встановлення віджета</h2>
          <Instructions project={project} />
        </div>

        <div className="lg:col-span-2 flex flex-col gap-[24px]">
          <h2 className="text-[16px] font-bold text-[#1f1f1f]">Історія активності</h2>
          <div className="bg-[#f9f9f9] border border-[#e9e9e9] rounded-[16px] p-[20px]">
            <ActivityTimeline logs={logs} />
          </div>
        </div>
      </div>
    </div>
  );
}
