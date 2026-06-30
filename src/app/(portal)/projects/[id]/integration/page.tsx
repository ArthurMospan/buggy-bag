'use client';
import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Project, ActivityLog } from '@/lib/types';
import LoadingSpinner from '@/components/ui/Feedback/LoadingSpinner';

import SetupGuide from '@/components/bugs/SetupGuide';
import { Copy, Check, Terminal, Code2, Play, Circle, CheckCircle2, RefreshCw, Eye, EyeOff, AlertTriangle, Link as LinkIcon, Users, Settings, Activity, ShieldAlert, X, ArrowLeft, Power, Globe, ExternalLink, Send } from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/components/ui/ToastContext';
import { formatDistanceToNow } from 'date-fns';
import { uk } from 'date-fns/locale';

const GithubLogo = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>;
const YoutrackLogo = () => <img src="/icons/YouTrack_icon.svg" alt="YouTrack" width="16" height="16" className="grayscale opacity-80" />;
const QuickTeamLogo = () => <img src="/logo-min.svg" alt="QuickTeam" width="16" height="16" className="grayscale opacity-80" />;

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
  const hasSeen = !!project.last_seen_at;
  const isOnline = hasSeen && (new Date().getTime() - new Date(project.last_seen_at!).getTime() < 15 * 60 * 1000);
  
  let dotColor = '#f59e0b';
  let statusText = 'Очікуємо підключення...';
  let subText = 'Зробіть запит до віджета, щоб ми його побачили';

  if (!project.is_active) {
    dotColor = '#ef4444';
    statusText = 'Збір призупинено';
    subText = 'Віджет вимкнено в налаштуваннях';
  } else if (hasSeen) {
    if (isOnline) {
      dotColor = '#10b981';
      statusText = 'Віджет онлайн';
      subText = `Активно ${formatDistanceToNow(new Date(project.last_seen_at!), { addSuffix: true, locale: uk })}`;
    } else {
      dotColor = '#9a9a9a';
      statusText = 'Неактивний';
      subText = `Останній сигнал ${formatDistanceToNow(new Date(project.last_seen_at!), { addSuffix: true, locale: uk })}`;
    }
  }

  return (
    <div className="flex flex-col">
      <div className="pb-[32px]">
        <h2 className="text-[16px] font-bold text-[#1f1f1f] mb-[6px]">Статус віджета</h2>
        <p className="text-[13px] text-[#9a9a9a] mb-[20px] leading-relaxed">Поточний стан інтеграції вашого проєкту.</p>
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-[20px] bg-[#ffffff] border border-[#e9e9e9] rounded-[12px] p-[24px]">
          <div className="flex items-center gap-[16px]">
            {project.connected_domain ? (
              <div className="w-[48px] h-[48px] bg-[#f8f8f9] border border-[#e9e9e9] rounded-[12px] flex items-center justify-center shrink-0 overflow-hidden">
                {project.favicon_url ? (
                  <>
                    <img 
                      src={project.favicon_url} 
                      alt="" 
                      className="w-[24px] h-[24px] rounded-[4px] object-contain" 
                      onError={(e) => { 
                        e.currentTarget.style.display = 'none'; 
                        e.currentTarget.nextElementSibling?.classList.remove('hidden'); 
                      }} 
                    />
                    <Globe size={24} className="text-[#9a9a9a] hidden" />
                  </>
                ) : (
                  <Globe size={24} className="text-[#9a9a9a]" />
                )}
              </div>
            ) : (
              <div className="w-[48px] h-[48px] bg-[#f4f4f5] border border-[#e9e9e9] rounded-[12px] flex items-center justify-center shrink-0">
                <Globe size={24} className="text-[#d4d4d8]" />
              </div>
            )}
            <div>
              <div className="flex items-center gap-[8px] mb-[4px]">
                <div className="relative flex items-center justify-center w-[10px] h-[10px]">
                  {isOnline && project.is_active && <div className="absolute inset-0 rounded-full animate-ping opacity-50" style={{ background: dotColor }} />}
                  <div className="w-[8px] h-[8px] rounded-full relative z-10" style={{ background: dotColor }} />
                </div>
                <span className="text-[15px] font-bold text-[#1f1f1f] leading-tight">
                  {statusText}
                </span>
              </div>
              <span className="text-[13px] font-medium text-[#71717a] block">
                {subText}
              </span>
            </div>
          </div>
          
          {project.connected_domain && (
            <div className="flex flex-col sm:items-end gap-[4px] shrink-0">
              <div className="flex items-center gap-[6px] text-[13px] font-medium text-[#9a9a9a]">
                Підключений домен:
              </div>
              <a href={project.connected_domain.startsWith('http') ? project.connected_domain : `https://${project.connected_domain}`} target="_blank" rel="noreferrer" className="flex items-center gap-[6px] text-[14px] font-bold text-[#1f1f1f] hover:text-[#4F46E5] transition-colors mt-[2px] pr-[2px]">
                {project.connected_domain}
                <ExternalLink size={14} className="opacity-50" />
              </a>
            </div>
          )}
        </div>
      </div>

      <div className="pt-[8px]">
        <SetupGuide apiKey={project.api_key} widgetPassword={project.widget_password} />
      </div>
    </div>
  );
}

function GeneralSection({ project, onUpdate }: { project: Project, onUpdate: (p: Project) => void }) {
  const [name, setName] = useState(project.name);
  const [password, setPassword] = useState(project.widget_password || '');
  const [isSaving, setIsSaving] = useState(false);
  const [successStatus, setSuccessStatus] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const router = useRouter();
  const { success, error } = useToast();

  const handleSaveSettings = async () => {
    if ((name === project.name && password === (project.widget_password || '')) || !name.trim()) return;
    setIsSaving(true);
    setSuccessStatus(false);
    try {
      const res = await fetch('/api/projects', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: project.id, name, widget_password: password }),
      });
      if (res.ok) {
        const updated = await res.json();
        onUpdate(updated.project ?? { ...project, name, widget_password: password });
        window.dispatchEvent(new CustomEvent('projects-updated'));
        router.refresh();
        setSuccessStatus(true);
        success('Налаштування збережено');
        setTimeout(() => setSuccessStatus(false), 3000);
      } else {
        error('Помилка збереження');
      }
    } catch (e) { console.error(e); error('Помилка збереження'); } finally { setIsSaving(false); }
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
      if (res.ok) {
        window.dispatchEvent(new CustomEvent('projects-updated'));
        success('Проєкт видалено');
        router.push('/');
      } else {
        error('Помилка видалення');
      }
    } catch (e) { console.error(e); error('Помилка видалення'); } finally { setIsDeleting(false); }
  };

  const toggleActive = async () => {
    if (isUpdatingStatus) return;
    setIsUpdatingStatus(true);
    const newVal = !project.is_active;
    try {
      const res = await fetch('/api/projects', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: project.id, is_active: newVal }),
      });
      if (res.ok) {
        onUpdate({ ...project, is_active: newVal });
        success(`Віджет ${newVal ? 'увімкнено' : 'вимкнено'}`);
      } else {
        error('Помилка зміни статусу');
      }
    } catch (e) { console.error(e); error('Помилка зміни статусу'); } finally { setIsUpdatingStatus(false); }
  };

  return (
    <div className="flex flex-col">
      <div className="pb-[32px]">
        <h2 className="text-[16px] font-bold text-[#1f1f1f] mb-[6px]">Основні налаштування</h2>
        <p className="text-[13px] text-[#9a9a9a] mb-[20px] leading-relaxed">Керуйте назвою проєкту та паролем для віджета.</p>
        
        <div className="flex flex-col gap-[16px]">
          <div className="flex flex-col gap-[1px] bg-[#e9e9e9] border border-[#e9e9e9] rounded-[10px] overflow-hidden">
            <div className="flex items-center bg-[#ffffff] px-[16px] py-[14px]">
              <span className="text-[13px] font-bold text-[#9a9a9a] w-[140px] shrink-0">Назва проєкту</span>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                className="flex-1 bg-transparent text-[13px] text-[#1f1f1f] font-bold outline-none placeholder:text-[#9a9a9a]"
              />
            </div>
            <div className="flex items-center bg-[#ffffff] px-[16px] py-[14px]">
              <span className="text-[13px] font-bold text-[#9a9a9a] w-[140px] shrink-0">Пароль віджета</span>
              <input
                type="text"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="on (за замовчуванням)"
                className="flex-1 bg-transparent text-[13px] text-[#1f1f1f] font-bold outline-none placeholder:text-[#9a9a9a]"
              />
            </div>
          </div>

          <div className="flex items-end justify-between mt-[4px]">
            <div className="text-[12px] font-medium text-[#9a9a9a] max-w-[400px]">
              Замість стандартного параметра <code className="bg-[#f4f4f5] px-1 py-0.5 rounded text-[#1f1f1f]">?bb=on</code>, ви можете задати свій секретний пароль (напр. <code className="bg-[#f4f4f5] px-1 py-0.5 rounded text-[#1f1f1f]">?bb=my_secret</code>). Залиште порожнім, щоб використовувати значення за замовчуванням.
            </div>
            <div className="flex items-center gap-[12px] shrink-0 pb-[2px]">
              {successStatus && (
                <span className="flex items-center gap-[6px] text-[13px] font-bold text-emerald-600">
                  <Check size={14} /> Збережено
                </span>
              )}
              <button
                onClick={handleSaveSettings}
                disabled={isSaving || (name === project.name && password === (project.widget_password || ''))}
                className="bg-[#1f1f1f] hover:bg-[#303030] text-[#ffffff] text-[13px] font-bold px-[20px] py-[10px] rounded-[8px] transition-colors disabled:opacity-50"
              >
                {isSaving ? 'Збереження...' : 'Зберегти'}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="py-[32px] border-t border-[#e9e9e9]">
        <h2 className="text-[16px] font-bold text-[#1f1f1f] mb-[6px] flex items-center gap-[8px]">
          <Power size={18} /> Керування збором
        </h2>
        <p className="text-[13px] text-[#9a9a9a] mb-[20px] leading-relaxed">Вимкніть віджет, якщо не хочете отримувати нові репорти.</p>
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-[16px] bg-[#ffffff] border border-[#e9e9e9] rounded-[10px] p-[20px]">
          <div>
            <span className="text-[13px] font-bold text-[#1f1f1f] block">Статус віджета: {project.is_active ? 'Активний' : 'Вимкнений'}</span>
            <span className="text-[12px] text-[#9a9a9a] mt-[4px] block">Відвідувачі {project.is_active ? 'можуть' : 'не можуть'} надсилати баги.</span>
          </div>
          <button onClick={toggleActive} disabled={isUpdatingStatus} className={`relative w-[44px] h-[24px] rounded-full transition-colors ${project.is_active ? 'bg-[#1f1f1f]' : 'bg-[#e9e9e9]'} ${isUpdatingStatus ? 'opacity-50' : ''} shrink-0`}>
            <div className={`absolute top-[2px] left-[2px] w-[20px] h-[20px] bg-white rounded-full transition-transform shadow-sm ${project.is_active ? 'translate-x-[20px]' : 'translate-x-0'}`} />
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
  const { success, error } = useToast();

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
        success('Посилання згенеровано');
      } else {
        const err = await res.json();
        error('Помилка генерації: ' + (err.error || 'Невідома помилка'));
      }
    } catch (e) { console.error(e); error('Помилка генерації'); } finally { setIsRegenerating(false); }
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
  const { success: toastSuccess, error } = useToast();

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
        toastSuccess('Налаштування збережено');
        setTimeout(() => setSuccess(false), 3000);
      } else { error('Помилка збереження'); }
    } catch (e) { console.error(e); error('Помилка збереження'); } finally { setIsSaving(false); }
  };

  return (
    <div className="flex flex-col">
      <h2 className="text-[16px] font-bold text-[#1f1f1f] mb-[6px]">Інтеграція з GitHub</h2>
      <p className="text-[13px] text-[#9a9a9a] mb-[24px] leading-relaxed">Підключіть свій GitHub репозиторій, щоб генерувати повноцінні Issues прямо з порталу в один клік.</p>

      <form onSubmit={handleSave} className="flex flex-col gap-[16px]">
        <div className="flex flex-col gap-[1px] bg-[#e9e9e9] border border-[#e9e9e9] rounded-[10px] overflow-hidden">
          <div className="flex items-center bg-[#ffffff] px-[16px] py-[14px]">
            <span className="text-[13px] font-bold text-[#9a9a9a] w-[120px] shrink-0">Репозиторій</span>
            <input
              type="text"
              name="bb_repo"
              id="bb_repo"
              autoComplete="off"
              data-lpignore="true"
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
                name="bb_pat_token"
                id="bb_pat_token"
                autoComplete="new-password"
                data-lpignore="true"
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

function YoutrackSection({ project, onUpdate }: { project: Project, onUpdate: (p: Project) => void }) {
  const [url, setUrl] = useState(project.youtrack_url || '');
  const [token, setToken] = useState(project.youtrack_token || '');
  const [ytProject, setYtProject] = useState(project.youtrack_project || '');
  const [isSaving, setIsSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [showToken, setShowToken] = useState(false);
  const { success: toastSuccess, error } = useToast();

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSuccess(false);
    try {
      const res = await fetch('/api/projects', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: project.id, youtrack_url: url, youtrack_token: token, youtrack_project: ytProject }),
      });
      if (res.ok) {
        const updated = await res.json();
        onUpdate(updated.project ?? { ...project, youtrack_url: url, youtrack_token: token, youtrack_project: ytProject });
        setSuccess(true);
        toastSuccess('Налаштування збережено');
        setTimeout(() => setSuccess(false), 3000);
      } else { error('Помилка збереження'); }
    } catch (e) { console.error(e); error('Помилка збереження'); } finally { setIsSaving(false); }
  };

  return (
    <div className="flex flex-col">
      <h2 className="text-[16px] font-bold text-[#1f1f1f] mb-[6px]">Інтеграція з YouTrack</h2>
      <p className="text-[13px] text-[#9a9a9a] mb-[24px] leading-relaxed">Підключіть свій YouTrack інстанс, щоб генерувати повноцінні Issues прямо з порталу в один клік.</p>

      <form onSubmit={handleSave} className="flex flex-col gap-[16px]">
        <div className="flex flex-col gap-[1px] bg-[#e9e9e9] border border-[#e9e9e9] rounded-[10px] overflow-hidden">
          <div className="flex items-center bg-[#ffffff] px-[16px] py-[14px]">
            <span className="text-[13px] font-bold text-[#9a9a9a] w-[140px] shrink-0">URL інстансу</span>
            <input
              type="text"
              name="bb_yt_url"
              id="bb_yt_url"
              autoComplete="off"
              data-lpignore="true"
              placeholder="https://your-domain.youtrack.cloud"
              value={url}
              onChange={e => setUrl(e.target.value)}
              className="flex-1 bg-transparent text-[13px] text-[#1f1f1f] font-bold outline-none placeholder:text-[#9a9a9a]"
            />
          </div>
          <div className="flex items-center bg-[#ffffff] px-[16px] py-[14px]">
            <span className="text-[13px] font-bold text-[#9a9a9a] w-[140px] shrink-0">Permanent Token</span>
            <div className="flex-1 flex items-center gap-[10px]">
              <input
                type={showToken ? 'text' : 'password'}
                name="bb_yt_token"
                id="bb_yt_token"
                autoComplete="new-password"
                data-lpignore="true"
                placeholder="perm:xxxxxxxxxxxxxxxxxxxx"
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
          <div className="flex items-center bg-[#ffffff] px-[16px] py-[14px]">
            <span className="text-[13px] font-bold text-[#9a9a9a] w-[140px] shrink-0">Короткий код</span>
            <input
              type="text"
              name="bb_yt_project"
              id="bb_yt_project"
              autoComplete="off"
              data-lpignore="true"
              placeholder="Напр. FIN"
              value={ytProject}
              onChange={e => setYtProject(e.target.value)}
              className="flex-1 bg-transparent text-[13px] text-[#1f1f1f] font-bold outline-none placeholder:text-[#9a9a9a]"
            />
          </div>
        </div>
        
        <div className="flex items-end justify-between mt-[4px]">
          <div className="text-[12px] font-medium text-[#9a9a9a] max-w-[400px]">
            <p className="mb-[6px]">
              Створіть токен у профілі: <span className="text-[#1f1f1f] font-bold">Profile → Account Security → New Token</span>.
            </p>
            <p>
              Короткий код (Project ID) — це префікс ваших задач (напр. <span className="text-[#1f1f1f] font-bold">FIN</span> для задачі FIN-123). Його можна знайти в налаштуваннях проєкту в YouTrack.
            </p>
          </div>
          <div className="flex items-center gap-[12px] shrink-0 pb-[2px]">
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

function TelegramSection({ project, onUpdate }: { project: Project, onUpdate: (p: Project) => void }) {
  const [chatId, setChatId] = useState(project.telegram_chat_id || '');
  const [token, setToken] = useState(project.telegram_bot_token || '');
  const [isSaving, setIsSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [showToken, setShowToken] = useState(false);
  const { success: toastSuccess, error } = useToast();

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSuccess(false);
    try {
      const res = await fetch('/api/projects', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: project.id, telegram_chat_id: chatId, telegram_bot_token: token }),
      });
      if (res.ok) {
        const updated = await res.json();
        onUpdate(updated.project ?? { ...project, telegram_chat_id: chatId, telegram_bot_token: token });
        setSuccess(true);
        toastSuccess('Налаштування збережено');
        setTimeout(() => setSuccess(false), 3000);
      } else { error('Помилка збереження'); }
    } catch (e) { console.error(e); error('Помилка збереження'); } finally { setIsSaving(false); }
  };

  return (
    <div className="flex flex-col">
      <h2 className="text-[16px] font-bold text-[#1f1f1f] mb-[6px]">Інтеграція з Telegram</h2>
      <p className="text-[13px] text-[#9a9a9a] mb-[24px] leading-relaxed">Підключіть Telegram бота, щоб миттєво отримувати сповіщення про нові баги.</p>

      <form onSubmit={handleSave} className="flex flex-col gap-[16px]">
        <div className="flex flex-col gap-[1px] bg-[#e9e9e9] border border-[#e9e9e9] rounded-[10px] overflow-hidden">
          <div className="flex items-center bg-[#ffffff] px-[16px] py-[14px]">
            <span className="text-[13px] font-bold text-[#9a9a9a] w-[140px] shrink-0">ID чату (Chat ID)</span>
            <input
              type="text"
              name="bb_tg_chat"
              id="bb_tg_chat"
              autoComplete="off"
              data-lpignore="true"
              placeholder="-1001234567890 або 123456789"
              value={chatId}
              onChange={e => setChatId(e.target.value)}
              className="flex-1 bg-transparent text-[13px] text-[#1f1f1f] font-bold outline-none placeholder:text-[#9a9a9a]"
            />
          </div>
          <div className="flex items-center bg-[#ffffff] px-[16px] py-[14px]">
            <span className="text-[13px] font-bold text-[#9a9a9a] w-[140px] shrink-0">Токен бота</span>
            <div className="flex-1 flex items-center gap-[10px]">
              <input
                type={showToken ? 'text' : 'password'}
                name="bb_tg_token"
                id="bb_tg_token"
                autoComplete="new-password"
                data-lpignore="true"
                placeholder="123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11"
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
        
        <div className="flex items-end justify-between mt-[4px]">
          <div className="text-[12px] font-medium text-[#9a9a9a] max-w-[500px]">
            <ol className="list-decimal pl-[16px] space-y-[6px]">
              <li>
                Створіть бота через <a href="https://t.me/botfather" target="_blank" rel="noreferrer" className="text-[#1f1f1f] font-bold hover:underline">@BotFather</a> у Telegram та скопіюйте сюди його <b>Token</b>.
              </li>
              <li>
                Напишіть боту <a href="https://t.me/userinfobot" target="_blank" rel="noreferrer" className="text-[#1f1f1f] font-bold hover:underline">@userinfobot</a>, щоб дізнатись свій особистий <b>Chat ID</b>.
              </li>
              <li className="text-[11px] text-[#9a9a9a]/80">
                <i>Щоб отримувати баги в групу — додайте бота в групу і дізнайтесь її ID через @raw_data_bot.</i>
              </li>
            </ol>
          </div>
          <div className="flex items-center gap-[12px] shrink-0 pb-[2px]">
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

function QuickTeamSection({ project, onUpdate }: { project: Project, onUpdate: (p: Project) => void }) {
  const [token, setToken] = useState(project.quickteam_token || '');
  const [qtOrg, setQtOrg] = useState(project.quickteam_organization_id || '');
  const [isSaving, setIsSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [showToken, setShowToken] = useState(false);
  const { success: toastSuccess, error } = useToast();

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSuccess(false);
    try {
      const res = await fetch('/api/projects', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: project.id, quickteam_token: token, quickteam_organization_id: qtOrg }),
      });
      if (res.ok) {
        const updated = await res.json();
        onUpdate(updated.project ?? { ...project, quickteam_token: token, quickteam_organization_id: qtOrg });
        setSuccess(true);
        toastSuccess('Налаштування збережено');
        setTimeout(() => setSuccess(false), 3000);
      } else { error('Помилка збереження'); }
    } catch (e) { console.error(e); error('Помилка збереження'); } finally { setIsSaving(false); }
  };

  return (
    <div className="flex flex-col">
      <h2 className="text-[16px] font-bold text-[#1f1f1f] mb-[6px]">Інтеграція з QuickTeam</h2>
      <p className="text-[13px] text-[#9a9a9a] mb-[24px] leading-relaxed">Підключіть свій таскменеджер QuickTeam, щоб створювати задачі автоматично в один клік.</p>

      <form onSubmit={handleSave} className="flex flex-col gap-[16px]">
        <div className="flex flex-col gap-[1px] bg-[#e9e9e9] border border-[#e9e9e9] rounded-[10px] overflow-hidden">
          <div className="flex items-center bg-[#ffffff] px-[16px] py-[14px]">
            <span className="text-[13px] font-bold text-[#9a9a9a] w-[140px] shrink-0">API Key</span>
            <div className="flex-1 flex items-center gap-[10px]">
              <input
                type={showToken ? 'text' : 'password'}
                name="bb_qt_token"
                id="bb_qt_token"
                autoComplete="new-password"
                data-lpignore="true"
                placeholder="qt_12345abcdef..."
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
          <div className="flex items-center bg-[#ffffff] px-[16px] py-[14px]">
            <span className="text-[13px] font-bold text-[#9a9a9a] w-[140px] shrink-0">Organization ID</span>
            <input
              type="text"
              name="bb_qt_org"
              id="bb_qt_org"
              autoComplete="off"
              data-lpignore="true"
              placeholder="ID організації в QuickTeam"
              value={qtOrg}
              onChange={e => setQtOrg(e.target.value)}
              className="flex-1 bg-transparent text-[13px] text-[#1f1f1f] font-bold outline-none placeholder:text-[#9a9a9a]"
            />
          </div>
        </div>
        
        <div className="flex items-end justify-between mt-[4px]">
          <div className="text-[12px] font-medium text-[#9a9a9a] max-w-[400px]">
            <p className="mb-[6px]">
              Перейдіть у <a href="https://qt-workspace.vercel.app" target="_blank" rel="noreferrer" className="text-[#1f1f1f] hover:underline">QuickTeam</a>: <span className="text-[#1f1f1f] font-bold">Налаштування → Інтеграції → Активуємо BuggyBag Portal</span>.
            </p>
            <p>
              Скопіюйте звідти дані (API Key та Organization ID) і вставте їх сюди.
            </p>
          </div>
          <div className="flex items-center gap-[12px] shrink-0 pb-[2px]">
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
  { id: 'telegram', label: 'Telegram', icon: <Send size={16} /> },
  { id: 'github', label: 'GitHub', icon: <GithubLogo /> },
  { id: 'youtrack', label: 'YouTrack', icon: <YoutrackLogo /> },
  { id: 'quickteam', label: 'QuickTeam', icon: <QuickTeamLogo /> },
  { id: 'activity', label: 'Активність', icon: <Activity size={16} /> },
];
type NavId = 'integration' | 'general' | 'team' | 'telegram' | 'github' | 'youtrack' | 'quickteam' | 'activity';

export default function IntegrationPage() {
  const { id } = useParams<{ id: string }>();
  const [project, setProject] = useState<Project | null>(null);
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  // On mobile: start with null so the nav list is shown first.
  // On desktop: default to 'integration'.
  const [activeNav, setActiveNav] = useState<NavId | null>(() => {
    if (typeof window !== 'undefined' && window.innerWidth < 768) return null;
    return 'integration';
  });

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

  const getNavDescription = (id: string) => {
    switch (id) {
      case 'integration': return 'Налаштування віджета та статус';
      case 'general': return 'Назва проєкту та видалення';
      case 'team': return 'Управління доступом та учасники';
      case 'telegram': return 'Сповіщення про нові баги';
      case 'github': return 'Інтеграція репозиторію та токени';
      case 'youtrack': return 'Інтеграція з YouTrack';
      case 'quickteam': return 'Інтеграція з QuickTeam';
      case 'activity': return 'Останні події та лог роботи';
      default: return '';
    }
  };

  return (
    <div className="h-full w-full flex flex-col md:flex-row bg-[#f4f4f5]">

      {/* ── Left Sidebar (Settings Nav) — desktop always visible, mobile only when no section selected ── */}
      <div className={`md:w-[360px] md:shrink-0 bg-[#ffffff] md:border-r md:border-[#e9e9e9] flex flex-col h-full z-20 w-full ${
        // On mobile: hide nav when a section is active (user tapped into a section)
        activeNav ? 'hidden md:flex' : 'flex'
      }`}>
        <div className="pt-[24px] pb-[16px] px-[24px] shrink-0 flex items-center gap-[12px]">
          <Link
            href={`/projects/${id}`}
            className="text-[#9a9a9a] hover:text-[#1f1f1f] transition-colors p-[8px] -ml-[8px] rounded-[8px] hover:bg-[#f4f4f5]"
          >
            <ArrowLeft size={20} strokeWidth={1.5} />
          </Link>
          <h2 className="text-[20px] font-bold text-[#1f1f1f]">Налаштування</h2>
        </div>
        <div className="flex-1 overflow-y-auto custom-scrollbar px-[24px] pb-[32px] flex flex-col gap-[8px]">
          {NAV_ITEMS.map(nav => (
            <div
              key={nav.id}
              onClick={() => setActiveNav(nav.id as NavId)}
              className={`group flex items-center gap-[12px] px-[16px] py-[12px] rounded-[12px] cursor-pointer transition-colors ${
                activeNav === nav.id
                  ? 'bg-[#f0f4ff]'
                  : 'bg-[#f4f4f5] hover:bg-[#e9e9e9]'
              }`}
            >
              <div className={`w-[28px] h-[28px] rounded-[50px] flex items-center justify-center shrink-0 ${activeNav === nav.id ? 'bg-[#4F46E5] text-white' : 'bg-[#e9e9e9] text-[#1f1f1f]'}`}>
                {nav.icon}
              </div>
              <div className="flex flex-col flex-1 min-w-0">
                <p className={`text-[13px] font-bold leading-tight ${activeNav === nav.id ? 'text-[#4F46E5]' : 'text-[#1f1f1f]'}`}>
                  {nav.label}
                </p>
                <p className="text-[11px] text-[#9a9a9a] mt-[2px] truncate">
                  {getNavDescription(nav.id)}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Right Content Area — desktop always visible, mobile only when section selected ── */}
      <div className={`flex-1 flex flex-col h-full bg-[#ffffff] overflow-y-auto custom-scrollbar relative ${
        !activeNav ? 'hidden md:flex' : 'flex'
      }`}>
        {/* Header */}
        <div className="pt-[24px] pb-[16px] shrink-0 flex items-center gap-[12px] px-[24px] md:px-[32px] sticky top-0 z-50 bg-[#ffffff] border-b border-[#e9e9e9]">
          <button 
            className="md:hidden p-[8px] -ml-[8px] rounded-[8px] hover:bg-[#f4f4f5] text-[#9a9a9a] hover:text-[#1f1f1f] transition-colors"
            onClick={() => setActiveNav(null)}
          >
            <ArrowLeft size={20} strokeWidth={1.5} />
          </button>
          <h1 className="text-[24px] font-bold text-[#1f1f1f] tracking-tight">
             {NAV_ITEMS.find(n => n.id === activeNav)?.label}
          </h1>
        </div>

        {/* Content */}
        <div className="px-[16px] md:px-[32px] py-[32px] max-w-[800px]">
          {activeNav === 'integration' && <IntegrationSection project={project} onUpdate={setProject} />}
          {activeNav === 'general' && <GeneralSection project={project} onUpdate={setProject} />}
          {activeNav === 'team' && <TeamSection project={project} onUpdate={setProject} />}
          {activeNav === 'telegram' && <TelegramSection project={project} onUpdate={setProject} />}
          {activeNav === 'github' && <GithubSection project={project} onUpdate={setProject} />}
          {activeNav === 'youtrack' && <YoutrackSection project={project} onUpdate={setProject} />}
          {activeNav === 'quickteam' && <QuickTeamSection project={project} onUpdate={setProject} />}
          {activeNav === 'activity' && <ActivityTimeline logs={logs} />}
        </div>
      </div>
    </div>
  );
}
