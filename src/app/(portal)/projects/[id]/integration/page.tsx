'use client';
import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Project, ActivityLog } from '@/lib/types';
import LoadingSpinner from '@/components/ui/Feedback/LoadingSpinner';

import { Copy, Check, Terminal, Code2, Play, Circle, CheckCircle2, RefreshCw, Eye, EyeOff, AlertTriangle, Link as LinkIcon, Users, Settings, Activity, ShieldAlert, X } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { uk } from 'date-fns/locale';

const GithubLogo = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>;

function CodeBlock({ code, label }: { code: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div className="flex flex-col gap-[8px]">
      {label && <div className="text-[11px] font-bold text-[#9a9a9a] uppercase tracking-widest">{label}</div>}
      <div className="relative bg-[#ffffff] rounded-[10px] border border-[#e9e9e9] overflow-hidden group shadow-sm">
        <pre className="text-[13px] font-mono text-[#1f1f1f] p-[16px] pr-[110px] overflow-x-auto leading-relaxed whitespace-pre-wrap">{code}</pre>
        <button
          onClick={handleCopy}
          className="absolute top-[12px] right-[12px] flex items-center gap-[6px] bg-[#f4f4f5] border border-[#e9e9e9] text-[#1f1f1f] hover:text-[#000000] hover:bg-[#e9e9e9] text-[12px] font-bold px-[10px] py-[6px] rounded-[8px] transition-all opacity-0 group-hover:opacity-100">
          {copied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
          {copied ? 'Скопійовано' : 'Копіювати'}
        </button>
      </div>
    </div>
  );
}

// ── Sections ───────────────────────────────────────────────────────────────

function IntegrationSection({ project, onUpdate }: { project: Project, onUpdate: (p: Project) => void }) {
  const [isUpdating, setIsUpdating] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);
  const [showConfirmRegen, setShowConfirmRegen] = useState(false);

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
      if (res.ok) onUpdate({ ...project, is_active: newVal });
    } catch (e) { console.error(e); } finally { setIsUpdating(false); }
  };

  const handleCopyKey = async () => {
    await navigator.clipboard.writeText(project.api_key);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  };

  const handleRegenerate = async () => {
    setIsUpdating(true);
    setShowConfirmRegen(false);
    try {
      const res = await fetch('/api/projects', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: project.id, regenerate_api_key: true }),
      });
      if (res.ok) {
        const updated = await res.json();
        onUpdate(updated.project ?? project);
      }
    } catch (e) { console.error(e); } finally { setIsUpdating(false); }
  };

  const hasSeen = !!project.last_seen_at;
  const dotColor = !project.is_active ? '#ef4444' : hasSeen ? '#10b981' : '#f59e0b';

  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://your-portal.com';
  const scriptCode = `<!-- Додайте цей скрипт перед </body> -->\n<script\n  src="${origin}/buggy-bag-standalone.js"\n  data-api-key="${project.api_key}"\n  data-portal-url="${origin}"\n  async\n></script>`;
  const npmCode = `npm install buggy-bag-widget`;
  const reactCode = `import { BuggyBag } from 'buggy-bag-widget';\n\nexport default function RootLayout({ children }) {\n  return (\n    <html lang="en">\n      <body>\n        {children}\n        <BuggyBag\n          apiKey="${project.api_key}"\n          portalUrl="${origin}"\n        />\n      </body>\n    </html>\n  );\n}`;
  const bookmarkletCode = `javascript:(function(){localStorage.setItem('BUGGY_BAG_ACCESS','active');location.reload();})();`;

  return (
    <div className="flex flex-col">
      <div className="pb-[32px]">
        <h2 className="text-[16px] font-bold text-[#1f1f1f] mb-[6px]">Статус віджета</h2>
        <p className="text-[13px] text-[#9a9a9a] mb-[20px] leading-relaxed">Керуйте збором багів. Вимикайте віджет, якщо не хочете отримувати нові репорти.</p>
        
        <div className="flex items-center justify-between bg-[#ffffff] border border-[#e9e9e9] rounded-[10px] p-[20px] shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
          <div className="flex items-center gap-[12px]">
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: dotColor, flexShrink: 0 }} />
            <div>
              <span className="text-[14px] font-bold text-[#1f1f1f] block">
                {!project.is_active ? 'Збір призупинено' : hasSeen ? 'Віджет підключено' : 'Очікуємо підключення...'}
              </span>
              <span className="text-[12px] font-medium text-[#9a9a9a] mt-[2px] block">
                {project.is_active ? (hasSeen ? `Активно ${formatDistanceToNow(new Date(project.last_seen_at!), { addSuffix: true, locale: uk })}` : 'Зробіть запит до віджета, щоб ми його побачили') : 'Віджет вимкнено в налаштуваннях'}
              </span>
            </div>
          </div>
          <button onClick={toggleActive} disabled={isUpdating} className={`relative w-[44px] h-[24px] rounded-full transition-colors ${project.is_active ? 'bg-[#1f1f1f]' : 'bg-[#e9e9e9]'} ${isUpdating ? 'opacity-50' : ''}`}>
            <div className={`absolute top-[2px] left-[2px] w-[20px] h-[20px] bg-white rounded-full transition-transform shadow-sm ${project.is_active ? 'translate-x-[20px]' : 'translate-x-0'}`} />
          </button>
        </div>
      </div>

      <div className="py-[32px]">
        <h2 className="text-[16px] font-bold text-[#1f1f1f] mb-[6px]">API Ключ</h2>
        <p className="text-[13px] text-[#9a9a9a] mb-[20px] leading-relaxed">Цей ключ необхідний для ідентифікації вашого проєкту. Не передавайте його стороннім.</p>
        
        <div className="flex flex-col gap-[12px]">
          <div className="flex items-center gap-[10px] bg-[#f4f4f5] rounded-[10px] px-[16px] py-[12px]">
            <code className="flex-1 text-[13px] font-mono text-[#1f1f1f] truncate">
              {showKey ? project.api_key : project.api_key.slice(0, 6) + '••••••••••••••••••••••••••••••••' + project.api_key.slice(-4)}
            </code>
            <button onClick={() => setShowKey(!showKey)} className="text-[#9a9a9a] hover:text-[#1f1f1f] transition-colors p-[4px] rounded">
              {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
            <button onClick={handleCopyKey} className="flex items-center gap-[6px] text-[#1f1f1f] hover:text-[#000000] text-[13px] font-bold transition-colors pl-[8px] border-l border-[#e9e9e9]">
              {copiedKey ? <Check size={14} /> : <Copy size={14} />}
              {copiedKey ? 'Скопійовано' : 'Копіювати'}
            </button>
          </div>

          {showConfirmRegen ? (
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-[12px] bg-orange-500/10 border border-orange-500/20 rounded-[10px] p-[16px]">
              <AlertTriangle size={18} className="text-orange-600 shrink-0" />
              <div className="flex-1">
                <span className="text-[13px] font-bold text-orange-600 block">Ви впевнені?</span>
                <span className="text-[12px] text-orange-600/80 block">Віджет перестане працювати, доки ви не оновите ключ у коді.</span>
              </div>
              <div className="flex gap-[8px] shrink-0">
                <button onClick={handleRegenerate} disabled={isUpdating} className="bg-orange-500 hover:bg-orange-600 text-white text-[12px] font-bold px-[12px] py-[6px] rounded-[6px] transition-colors">Оновити</button>
                <button onClick={() => setShowConfirmRegen(false)} className="bg-transparent border border-orange-500/20 text-orange-600 hover:bg-orange-500/10 text-[12px] font-bold px-[12px] py-[6px] rounded-[6px] transition-colors">Скасувати</button>
              </div>
            </div>
          ) : (
            <button onClick={() => setShowConfirmRegen(true)} className="flex items-center gap-[6px] self-start text-[12px] font-bold text-[#9a9a9a] hover:text-[#1f1f1f] transition-colors">
              <RefreshCw size={13} /> Згенерувати новий ключ
            </button>
          )}
        </div>
      </div>

      <div className="py-[32px]">
        <h2 className="text-[16px] font-bold text-[#1f1f1f] mb-[6px]">Як підключити</h2>
        <p className="text-[13px] text-[#9a9a9a] mb-[24px] leading-relaxed">Вставте скрипт на ваш сайт, щоб почати збирати баги.</p>
        
        <div className="flex flex-col gap-[24px]">
          <div>
            <h3 className="text-[13px] font-bold text-[#1f1f1f] flex items-center gap-[8px] mb-[12px]">
              <Code2 size={16} /> Варіант 1: HTML Script (Рекомендовано)
            </h3>
            <CodeBlock code={scriptCode} />
          </div>

          <details className="group border border-[#e9e9e9] rounded-[10px] overflow-hidden">
            <summary className="flex items-center gap-[8px] p-[16px] cursor-pointer text-[13px] font-bold text-[#1f1f1f] bg-[#ffffff] hover:bg-[#f4f4f5] transition-colors list-none">
              <Terminal size={16} /> 
              Варіант 2: React / Next.js (NPM)
              <span className="ml-auto text-[#9a9a9a] group-open:rotate-180 transition-transform">▾</span>
            </summary>
            <div className="flex flex-col gap-[16px] p-[16px] bg-[#ffffff] border-t border-[#e9e9e9]">
              <CodeBlock code={npmCode} label="1. Встановлення пакету" />
              <CodeBlock code={reactCode} label="2. Додавання у Root Layout" />
            </div>
          </details>

          <div className="mt-[8px]">
            <h3 className="text-[13px] font-bold text-[#1f1f1f] flex items-center gap-[8px] mb-[12px]">
              <Play size={16} /> Як побачити віджет на своєму сайті?
            </h3>
            <p className="text-[13px] text-[#9a9a9a] mb-[16px] leading-relaxed">
              Віджет прихований від звичайних відвідувачів. Щоб він з'явився, додайте параметр <code className="bg-[#f4f4f5] px-[6px] py-[2px] rounded text-[#1f1f1f] font-mono text-[11px]">?bb=on</code> до URL вашого сайту або перетягніть кнопку нижче на панель закладок і натискайте її:
            </p>
            <a href={bookmarkletCode} className="inline-flex items-center gap-[8px] px-[16px] py-[10px] bg-[#f4f4f5] hover:bg-[#e9e9e9] text-[#1f1f1f] text-[13px] font-bold rounded-[8px] transition-colors cursor-grab">
              <Play size={14} /> Активувати віджет
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

function GeneralSection({ project, onUpdate }: { project: Project, onUpdate: (p: Project) => void }) {
  const [name, setName] = useState(project.name);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const router = useRouter();

  const handleSaveName = async () => {
    if (!name.trim() || name === project.name) return;
    setIsSaving(true);
    try {
      const res = await fetch('/api/projects', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: project.id, name }),
      });
      if (res.ok) {
        const updated = await res.json();
        onUpdate(updated.project ?? { ...project, name });
        router.refresh();
      }
    } catch (e) { console.error(e); } finally { setIsSaving(false); }
  };

  const handleDelete = async () => {
    if (!confirm('Ви впевнені, що хочете видалити цей проєкт? Усі баги та налаштування будуть втрачені назавжди!')) return;
    setIsDeleting(true);
    try {
      const res = await fetch('/api/projects', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: project.id }),
      });
      if (res.ok) window.location.href = '/';
    } catch (e) { console.error(e); } finally { setIsDeleting(false); }
  };

  return (
    <div className="flex flex-col">
      <div className="pb-[32px]">
        <h2 className="text-[16px] font-bold text-[#1f1f1f] mb-[6px]">Назва проєкту</h2>
        <p className="text-[13px] text-[#9a9a9a] mb-[20px] leading-relaxed">Змініть назву, яка відображається в списку ваших проєктів на порталі.</p>
        
        <div className="flex flex-col sm:flex-row gap-[12px]">
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            className="flex-1 max-w-[400px] bg-[#ffffff] border border-[#e9e9e9] rounded-[8px] px-[14px] py-[10px] text-[13px] text-[#1f1f1f] font-bold outline-none focus:border-[#1f1f1f] transition-colors placeholder:text-[#9a9a9a]"
          />
          <button
            onClick={handleSaveName}
            disabled={isSaving || name === project.name}
            className="bg-[#1f1f1f] hover:bg-[#303030] text-white text-[13px] font-bold px-[20px] py-[10px] rounded-[8px] transition-colors disabled:opacity-50 shrink-0"
          >
            {isSaving ? 'Збереження...' : 'Зберегти'}
          </button>
        </div>
      </div>

      <div className="py-[32px]">
        <h2 className="text-[16px] font-bold text-[#ef4444] mb-[6px] flex items-center gap-[8px]">
          <ShieldAlert size={18} /> Небезпечна зона
        </h2>
        <p className="text-[13px] text-[#9a9a9a] mb-[20px] leading-relaxed">Видалення проєкту — незворотна дія. Всі дані, налаштування та зібрані баги будуть втрачені.</p>
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-[16px] bg-red-500/5 border border-red-500/20 rounded-[10px] p-[20px]">
          <div>
            <span className="text-[13px] font-bold text-[#1f1f1f] block">Видалити цей проєкт</span>
            <span className="text-[12px] text-[#9a9a9a] mt-[4px] block">Впевніться, що зберігали важливі репорти.</span>
          </div>
          <button
            onClick={handleDelete}
            disabled={isDeleting}
            className="bg-[#ef4444]/10 hover:bg-[#ef4444]/20 border border-[#ef4444]/20 text-[#ef4444] text-[13px] font-bold px-[20px] py-[10px] rounded-[8px] transition-colors disabled:opacity-50 shrink-0"
          >
            {isDeleting ? 'Видаляємо...' : 'Видалити назавжди'}
          </button>
        </div>
      </div>
    </div>
  );
}

function InviteModal({ project, onUpdate, onClose }: { project: Project, onUpdate: (p: Project) => void, onClose: () => void }) {
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);

  const inviteUrl = project.invite_token ? `${typeof window !== 'undefined' ? window.location.origin : ''}/invite/${project.invite_token}` : '';

  const handleCopyLink = async () => {
    if (!inviteUrl) return;
    await navigator.clipboard.writeText(inviteUrl);
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2000);
  };

  const handleRegenerateLink = async () => {
    setIsRegenerating(true);
    try {
      const res = await fetch('/api/projects/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ project_id: project.id, action: 'regenerate' }),
      });
      if (res.ok) {
        const data = await res.json();
        onUpdate({ ...project, invite_token: data.invite_token });
      } else {
        const err = await res.json();
        alert('Помилка генерації: ' + (err.error || 'Невідома помилка'));
      }
    } catch (e) { console.error(e); } finally { setIsRegenerating(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-[20px] bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[#ffffff] rounded-[16px] w-full max-w-[480px] shadow-[0_25px_50px_rgba(0,0,0,0.12)] overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between p-[20px] shrink-0">
          <h2 className="text-[16px] font-bold text-[#1f1f1f]">Запросити учасника</h2>
          <button onClick={onClose} className="text-[#9a9a9a] hover:text-[#1f1f1f] hover:bg-[#f4f4f5] p-1 rounded-lg transition-colors"><X size={20} /></button>
        </div>
        <div className="p-[24px]">
          <p className="text-[13px] text-[#9a9a9a] mb-[16px] leading-relaxed">Поділіться цим посиланням з іншими розробниками. Вони автоматично отримають доступ до багів цього проєкту.</p>
          {inviteUrl ? (
            <div className="flex flex-col gap-[16px]">
              <div className="flex items-center gap-[10px] bg-[#f4f4f5] rounded-[10px] px-[16px] py-[12px]">
                <code className="flex-1 text-[13px] font-mono text-[#1f1f1f] truncate">{inviteUrl}</code>
                <button onClick={handleCopyLink} className="flex items-center gap-[6px] text-[#1f1f1f] hover:text-[#000000] text-[13px] font-bold transition-colors pl-[8px] border-l border-[#e9e9e9]">
                  {linkCopied ? <Check size={14} /> : <Copy size={14} />}
                  {linkCopied ? 'Скопійовано' : 'Копіювати'}
                </button>
              </div>
              <button onClick={handleRegenerateLink} disabled={isRegenerating} className="flex items-center gap-[6px] text-[12px] font-bold text-[#9a9a9a] hover:text-[#1f1f1f] transition-colors self-start">
                <RefreshCw size={13} className={isRegenerating ? 'animate-spin' : ''} /> Оновити посилання
              </button>
            </div>
          ) : (
            <button onClick={handleRegenerateLink} disabled={isRegenerating} className="bg-[#1f1f1f] hover:bg-[#303030] text-white text-[13px] font-bold px-[20px] py-[10px] rounded-[8px] transition-colors w-full">
              {isRegenerating ? 'Генеруємо...' : 'Згенерувати посилання'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function TeamSection({ project, onUpdate }: { project: Project, onUpdate: (p: Project) => void }) {
  const [showInvite, setShowInvite] = useState(false);
  const members = project.members ?? [];

  return (
    <div className="flex flex-col">
      <div className="flex items-center justify-between pb-[32px]">
        <div>
          <h2 className="text-[16px] font-bold text-[#1f1f1f] mb-[6px] flex items-center gap-[8px]">
            Команда <span className="text-[11px] bg-[#f4f4f5] text-[#9a9a9a] px-[8px] py-[2px] rounded-full">{members.length}</span>
          </h2>
          <p className="text-[13px] text-[#9a9a9a] leading-relaxed">Учасники, які мають доступ до цього проєкту.</p>
        </div>
        <button onClick={() => setShowInvite(true)} className="bg-[#1f1f1f] hover:bg-[#303030] text-white text-[13px] font-bold px-[16px] py-[8px] rounded-[8px] transition-colors shrink-0">
          Запросити
        </button>
      </div>

      {showInvite && <InviteModal project={project} onUpdate={onUpdate} onClose={() => setShowInvite(false)} />}
      
      {members.length === 0 ? (
        <div className="bg-[#ffffff] border border-dashed border-[#e9e9e9] rounded-[10px] p-[32px] text-center text-[13px] font-bold text-[#9a9a9a]">
          Поки що тут тільки ви.
        </div>
      ) : (
        <div className="flex flex-col border border-[#e9e9e9] rounded-[10px] overflow-hidden">
          {members.map((member, i) => (
            <div key={member.user_id} className="flex items-center gap-[14px] p-[16px] bg-[#ffffff] border-b border-[#e9e9e9] last:border-b-0">
              <div className="w-[36px] h-[36px] rounded-full bg-[#f4f4f5] text-[#1f1f1f] flex items-center justify-center text-[13px] font-bold uppercase shrink-0">
                {member.email[0]}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[13px] font-bold text-[#1f1f1f] truncate">{member.email}</div>
                <div className="text-[12px] font-medium text-[#9a9a9a] mt-[2px]">
                  Долучився {formatDistanceToNow(new Date(member.joined_at), { addSuffix: true, locale: uk })}
                </div>
              </div>
              <span className="text-[11px] font-bold text-[#1f1f1f] bg-[#f4f4f5] px-[10px] py-[4px] rounded-[6px] shrink-0 border border-[#e9e9e9]">
                Розробник
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function GithubSection({ project, onUpdate }: { project: Project, onUpdate: (p: Project) => void }) {
  const [repo, setRepo] = useState(project.github_repo || '');
  const [token, setToken] = useState(project.github_token || '');
  const [isSaving, setIsSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [showToken, setShowToken] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSuccess(false);
    try {
      const res = await fetch('/api/projects', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: project.id, github_repo: repo, github_token: token }),
      });
      if (res.ok) {
        const updated = await res.json();
        onUpdate(updated.project ?? { ...project, github_repo: repo, github_token: token });
        setSuccess(true);
        setTimeout(() => setSuccess(false), 3000);
      } else { alert('Помилка збереження'); }
    } catch (e) { console.error(e); alert('Помилка збереження'); } finally { setIsSaving(false); }
  };

  return (
    <div className="flex flex-col">
      <h2 className="text-[16px] font-bold text-[#1f1f1f] mb-[6px]">Інтеграція з GitHub</h2>
      <p className="text-[13px] text-[#9a9a9a] mb-[24px] leading-relaxed">Підключіть свій GitHub репозиторій, щоб генерувати повноцінні Issues прямо з порталу в один клік.</p>

      <form onSubmit={handleSave} className="flex flex-col gap-[16px] max-w-[560px]">
        <div className="flex flex-col gap-[1px] bg-[#e9e9e9] border border-[#e9e9e9] rounded-[10px] overflow-hidden">
          <div className="flex items-center bg-[#ffffff] px-[16px] py-[14px]">
            <span className="text-[13px] font-bold text-[#9a9a9a] w-[120px] shrink-0">Репозиторій</span>
            <input
              type="text"
              placeholder="Власник/Репозиторій (напр. facebook/react)"
              value={repo}
              onChange={e => setRepo(e.target.value)}
              className="flex-1 bg-transparent text-[13px] text-[#1f1f1f] font-bold outline-none placeholder:text-[#9a9a9a]"
            />
          </div>
          <div className="flex items-center bg-[#ffffff] px-[16px] py-[14px]">
            <span className="text-[13px] font-bold text-[#9a9a9a] w-[120px] shrink-0">PAT Токен</span>
            <div className="flex-1 flex items-center gap-[10px]">
              <input
                type={showToken ? 'text' : 'password'}
                placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                value={token}
                onChange={e => setToken(e.target.value)}
                className="flex-1 bg-transparent text-[13px] text-[#1f1f1f] font-bold outline-none placeholder:text-[#9a9a9a]"
              />
              {token && (
                <button type="button" onClick={() => setShowToken(!showToken)} className="text-[#9a9a9a] hover:text-[#1f1f1f] transition-colors p-[2px]">
                  {showToken ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              )}
            </div>
          </div>
        </div>
        
        <div className="flex items-center justify-between mt-[4px]">
          <div className="text-[12px] font-medium text-[#9a9a9a]">
            Створіть токен на <a href="https://github.com/settings/tokens/new" target="_blank" rel="noreferrer" className="text-[#1f1f1f] hover:underline">на сторінці GitHub</a> з доступом <span className="text-[#1f1f1f] font-bold">repo</span>.
          </div>
          <div className="flex items-center gap-[12px] shrink-0">
            {success && (
              <span className="flex items-center gap-[6px] text-[13px] font-bold text-emerald-600">
                <Check size={14} /> Збережено
              </span>
            )}
            <button type="submit" disabled={isSaving} className="bg-[#1f1f1f] hover:bg-[#303030] text-[#ffffff] text-[13px] font-bold px-[20px] py-[10px] rounded-[8px] transition-colors disabled:opacity-50">
              {isSaving ? 'Збереження...' : 'Зберегти'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

function ActivityTimeline({ logs }: { logs: ActivityLog[] }) {
  if (logs.length === 0) return <div className="text-[13px] font-bold text-[#9a9a9a]">Історія порожня.</div>;

  const getLogDetails = (log: ActivityLog) => {
    switch (log.action) {
      case 'widget_connected': return { icon: <CheckCircle2 size={16} className="text-emerald-500" />, text: 'Віджет підключено', desc: `Домен: ${log.details?.domain || 'Невідомо'}` };
      case 'bug_received': return { icon: <Circle size={16} className="text-[#9a9a9a]" />, text: 'Отримано новий баг', desc: `ID: ${log.details?.bug_id?.split('-')[0]}` };
      case 'widget_disabled': return { icon: <Circle size={16} className="text-orange-500" />, text: 'Віджет вимкнено з порталу' };
      case 'widget_enabled': return { icon: <CheckCircle2 size={16} className="text-emerald-500" />, text: 'Віджет знову увімкнено' };
      default: return { icon: <Circle size={16} className="text-[#9a9a9a]" />, text: log.action };
    }
  };

  return (
    <div className="flex flex-col">
      <h2 className="text-[16px] font-bold text-[#1f1f1f] mb-[6px]">Останні події</h2>
      <p className="text-[13px] text-[#9a9a9a] mb-[24px] leading-relaxed">Лог активності віджета та команди.</p>
      
      <div className="relative border-l border-[#e9e9e9] ml-[10px] pl-[24px] flex flex-col gap-[28px]">
        {logs.map((log) => {
          const { icon, text, desc } = getLogDetails(log);
          return (
            <div key={log.id} className="relative">
              <div className="absolute left-[-33px] top-[1px] bg-[#f4f4f5] rounded-full p-[2px]">{icon}</div>
              <div className="flex flex-col gap-[4px]">
                <span className="text-[13px] font-bold text-[#1f1f1f]">{text}</span>
                <div className="flex items-center gap-[8px]">
                  {desc && <span className="text-[12px] font-medium text-[#9a9a9a]">{desc}</span>}
                  {desc && <span className="text-[#9a9a9a]">·</span>}
                  <span className="text-[12px] font-medium text-[#9a9a9a]">
                    {formatDistanceToNow(new Date(log.created_at), { addSuffix: true, locale: uk })}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────

const NAV_ITEMS = [
  { id: 'integration', label: 'Віджет', icon: <Code2 size={16} /> },
  { id: 'general', label: 'Загальні', icon: <Settings size={16} /> },
  { id: 'team', label: 'Команда', icon: <Users size={16} /> },
  { id: 'github', label: 'GitHub', icon: <GithubLogo /> },
  { id: 'activity', label: 'Активність', icon: <Activity size={16} /> },
];
type NavId = 'integration' | 'general' | 'team' | 'github' | 'activity';

export default function IntegrationPage() {
  const { id } = useParams<{ id: string }>();
  const [project, setProject] = useState<Project | null>(null);
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeNav, setActiveNav] = useState<NavId>('integration');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [projRes, logsRes] = await Promise.all([
        fetch('/api/projects'),
        fetch(`/api/projects/activity?project_id=${id}`),
      ]);
      const projData = await projRes.json();
      const logsData = await logsRes.json();
      const found = (projData.projects ?? []).find((p: Project) => p.id === id);
      if (found) setProject(found);
      setLogs(logsData.logs ?? []);
    } finally { setLoading(false); }
  }, [id]);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (loading) return <div className="p-[40px] flex items-center justify-center h-full"><LoadingSpinner size="lg" /></div>;
  if (!project) return <div className="p-[40px] text-[#9a9a9a] font-bold text-center">Проєкт не знайдено</div>;

  return (
    <div className="flex flex-col h-full bg-[#f4f4f5]">
      {/* Header bar */}
      <div className="h-[56px] flex items-center px-[40px] bg-[#ffffff] shrink-0">
        <h1 className="text-[14px] font-bold text-[#1f1f1f]">Налаштування</h1>
      </div>

      <div className="flex flex-1 min-h-0">
        {/* Sidebar Nav */}
        <div className="w-[240px] border-r border-[#e9e9e9] bg-[#ffffff] flex flex-col p-[24px] gap-[4px] shrink-0 overflow-y-auto">
          {NAV_ITEMS.map(nav => (
            <button
              key={nav.id}
              onClick={() => setActiveNav(nav.id as NavId)}
              className={`flex items-center gap-[10px] px-[12px] py-[8px] rounded-[10px] text-[13px] font-bold transition-all ${
                activeNav === nav.id
                  ? 'bg-[#f4f4f5] text-[#1f1f1f]'
                  : 'text-[#9a9a9a] hover:text-[#1f1f1f] hover:bg-[#f4f4f5]'
              }`}
            >
              <div className="text-[#1f1f1f]">
                {nav.icon}
              </div>
              {nav.label}
            </button>
          ))}
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-[40px] pb-[80px]">
          <div className="max-w-[640px]">
            {activeNav === 'integration' && <IntegrationSection project={project} onUpdate={setProject} />}
            {activeNav === 'general' && <GeneralSection project={project} onUpdate={setProject} />}
            {activeNav === 'team' && <TeamSection project={project} onUpdate={setProject} />}
            {activeNav === 'github' && <GithubSection project={project} onUpdate={setProject} />}
            {activeNav === 'activity' && <ActivityTimeline logs={logs} />}
          </div>
        </div>
      </div>
    </div>
  );
}
