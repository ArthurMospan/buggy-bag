'use client';
import { useEffect, useState, useRef } from 'react';
import { createClient } from '@/lib/supabase';
import type { User } from '@supabase/supabase-js';
import { Check, Loader2, AlertCircle, ArrowLeft, User as UserIcon, Shield, Link as LinkIcon, Upload } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

function GitHubLogo() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z"/>
    </svg>
  );
}

function GeneralSection({ user, name, setName, handleSaveName, savingName, nameSaved, globalErr, avatarUrl, setAvatarUrl }: any) {
  const router = useRouter();
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = async () => {
        const canvas = document.createElement('canvas');
        const MAX_SIZE = 150;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_SIZE) {
            height *= MAX_SIZE / width;
            width = MAX_SIZE;
          }
        } else {
          if (height > MAX_SIZE) {
            width *= MAX_SIZE / height;
            height = MAX_SIZE;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const dataUrl = canvas.toDataURL('image/webp', 0.8);
          setAvatarUrl(dataUrl);
          
          const supabase = createClient();
          await supabase.auth.updateUser({ data: { avatar_url: dataUrl } });
          router.refresh();
        }
        setIsUploading(false);
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="flex flex-col">
      <div className="pb-[32px]">
        <h2 className="text-[16px] font-bold text-[#1f1f1f] mb-[6px]">Обліковий запис</h2>
        <p className="text-[13px] text-[#9a9a9a] mb-[20px] leading-relaxed">Ваша основна інформація в системі.</p>
        
        <div className="flex items-center gap-[16px] bg-[#ffffff] border border-[#e9e9e9] rounded-[10px] p-[20px] shadow-[0_2px_8px_rgba(0,0,0,0.04)] mb-[24px]">
          <div className="relative group w-[48px] h-[48px] shrink-0">
            {avatarUrl ? (
              <img src={avatarUrl} alt="Avatar" className="w-full h-full rounded-full object-cover border border-[#e9e9e9]" />
            ) : (
              <div className="w-full h-full rounded-full bg-[#f4f4f5] text-[#1f1f1f] flex items-center justify-center text-[18px] font-bold uppercase border border-[#e9e9e9]">
                {user?.email?.[0] ?? '?'}
              </div>
            )}
            
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="absolute inset-0 bg-[#1f1f1f]/60 text-white rounded-full opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity backdrop-blur-sm"
              disabled={isUploading}
              title="Змінити аватар"
            >
              {isUploading ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
            </button>
            <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleAvatarUpload} />
          </div>
          <div>
            <p className="text-[15px] font-bold text-[#1f1f1f] leading-tight">{name || '—'}</p>
            <p className="text-[13px] font-medium text-[#9a9a9a] mt-[2px]">{user?.email}</p>
          </div>
        </div>
      </div>

      <div className="py-[32px] border-t border-[#e9e9e9]">
        <h2 className="text-[16px] font-bold text-[#1f1f1f] mb-[6px]">Ім'я</h2>
        <p className="text-[13px] text-[#9a9a9a] mb-[20px] leading-relaxed">Як ми маємо до вас звертатися.</p>
        
        <div className="flex flex-col gap-[8px]">
          <div className="flex flex-col sm:flex-row gap-[12px]">
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleSaveName(); }}
              placeholder="Ваше ім'я"
              className="flex-1 max-w-[400px] bg-[#ffffff] border border-[#e9e9e9] rounded-[8px] px-[14px] py-[10px] text-[13px] text-[#1f1f1f] font-bold outline-none focus:border-[#1f1f1f] transition-colors placeholder:text-[#9a9a9a]"
            />
            <button
              onClick={handleSaveName}
              disabled={savingName || !name.trim()}
              className="bg-[#1f1f1f] hover:bg-[#303030] text-white text-[13px] font-bold px-[20px] py-[10px] rounded-[8px] transition-colors disabled:opacity-50 shrink-0 flex items-center justify-center gap-[6px]"
            >
              {savingName ? <Loader2 size={14} className="animate-spin" /> : nameSaved ? <Check size={14} /> : null}
              {nameSaved ? 'Збережено' : 'Зберегти'}
            </button>
          </div>
          {globalErr && (
            <p className="text-[12px] text-[#ef4444] mt-[4px] flex items-center gap-[5px]">
              <AlertCircle size={12} />{globalErr}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function ConnectionsSection({ githubIdentity, handleConnectGitHub }: any) {
  return (
    <div className="flex flex-col">
      <div className="pb-[32px]">
        <h2 className="text-[16px] font-bold text-[#1f1f1f] mb-[6px]">Інтеграції</h2>
        <p className="text-[13px] text-[#9a9a9a] mb-[24px] leading-relaxed">Підключені сервіси та соціальні мережі.</p>

        {githubIdentity ? (
          <div className="flex items-center justify-between gap-[16px] bg-[#ffffff] border border-[#e9e9e9] rounded-[10px] p-[20px]">
            <div className="flex items-center gap-[12px]">
              <div className="w-[36px] h-[36px] rounded-[8px] bg-[#f4f4f5] flex items-center justify-center shrink-0 border border-[#e9e9e9] text-[#1f1f1f]">
                <GitHubLogo />
              </div>
              <div>
                <span className="text-[14px] font-bold text-[#1f1f1f] block">GitHub підключено</span>
                <span className="text-[13px] font-medium text-[#9a9a9a] mt-[2px] block">
                  як <strong className="text-[#1f1f1f] font-bold">{githubIdentity.identity_data?.user_name ?? 'GitHub'}</strong>
                </span>
              </div>
            </div>
            <div className="flex items-center gap-[6px] text-[13px] font-bold text-[#10b981] bg-[#f0fdf4] px-[10px] py-[4px] rounded-[6px] border border-[#bbf7d0]">
              <Check size={14} /> Активно
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-[16px] bg-[#ffffff] border border-[#e9e9e9] rounded-[10px] p-[24px]">
            <div>
              <span className="text-[14px] font-bold text-[#1f1f1f] block mb-[4px]">GitHub не підключено</span>
              <p className="text-[13px] text-[#9a9a9a] leading-relaxed">
                Підключіть свій обліковий запис GitHub, щоб легко створювати Issues з репортів та керувати інтеграціями з репозиторіями.
              </p>
            </div>
            <button
              onClick={handleConnectGitHub}
              className="inline-flex items-center justify-center gap-[8px] px-[20px] py-[10px] bg-[#1f1f1f] text-white text-[13px] font-bold rounded-[8px] hover:bg-[#303030] transition-colors w-fit"
            >
              <GitHubLogo />
              Підключити GitHub
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function SecuritySection({ oldPwd, setOldPwd, newPwd, setNewPwd, confirmPwd, setConfirmPwd, handleChangePwd, savingPwd, pwdMsg }: any) {
  return (
    <div className="flex flex-col">
      <div className="pb-[32px]">
        <h2 className="text-[16px] font-bold text-[#1f1f1f] mb-[6px]">Безпека</h2>
        <p className="text-[13px] text-[#9a9a9a] mb-[20px] leading-relaxed">Керуйте своїм паролем та безпекою входу.</p>

        <form onSubmit={handleChangePwd} className="flex flex-col gap-[16px] max-w-[400px]">
          <div className="flex flex-col gap-[8px]">
            <span className="text-[13px] font-bold text-[#1f1f1f]">Поточний пароль</span>
            <input
              type="password"
              placeholder="Введіть старий пароль"
              value={oldPwd}
              onChange={e => setOldPwd(e.target.value)}
              required
              className="bg-[#ffffff] border border-[#e9e9e9] rounded-[8px] px-[14px] py-[10px] text-[13px] text-[#1f1f1f] font-bold outline-none focus:border-[#1f1f1f] transition-colors placeholder:text-[#9a9a9a]"
            />
          </div>

          <div className="flex flex-col gap-[8px]">
            <span className="text-[13px] font-bold text-[#1f1f1f]">Новий пароль</span>
            <input
              type="password"
              placeholder="Мінімум 6 символів"
              value={newPwd}
              onChange={e => setNewPwd(e.target.value)}
              required
              minLength={6}
              autoComplete="new-password"
              className="bg-[#ffffff] border border-[#e9e9e9] rounded-[8px] px-[14px] py-[10px] text-[13px] text-[#1f1f1f] font-bold outline-none focus:border-[#1f1f1f] transition-colors placeholder:text-[#9a9a9a]"
            />
          </div>

          <div className="flex flex-col gap-[8px]">
            <span className="text-[13px] font-bold text-[#1f1f1f]">Підтвердіть новий пароль</span>
            <input
              type="password"
              placeholder="Повторіть новий пароль"
              value={confirmPwd}
              onChange={e => setConfirmPwd(e.target.value)}
              required
              minLength={6}
              className="bg-[#ffffff] border border-[#e9e9e9] rounded-[8px] px-[14px] py-[10px] text-[13px] text-[#1f1f1f] font-bold outline-none focus:border-[#1f1f1f] transition-colors placeholder:text-[#9a9a9a]"
            />
          </div>
          
          {pwdMsg && (
            <p className={`text-[12px] flex items-center gap-[5px] mt-[-4px] ${pwdMsg.ok ? 'text-[#10b981]' : 'text-[#ef4444]'}`}>
              {pwdMsg.ok ? <Check size={12} /> : <AlertCircle size={12} />}
              {pwdMsg.text}
            </p>
          )}

          <button
            type="submit"
            disabled={savingPwd || !oldPwd || !newPwd || !confirmPwd}
            className="bg-[#1f1f1f] hover:bg-[#303030] text-white text-[13px] font-bold px-[20px] py-[10px] rounded-[8px] transition-colors disabled:opacity-50 w-fit flex items-center gap-[6px]"
          >
            {savingPwd && <Loader2 size={14} className="animate-spin" />}
            Зберегти пароль
          </button>
        </form>
      </div>
    </div>
  );
}

function GeneralSkeleton() {
  return (
    <div className="flex flex-col animate-pulse">
      <div className="pb-[32px]">
        <div className="h-[20px] w-[140px] bg-zinc-200 rounded mb-[6px]" />
        <div className="h-[14px] w-[240px] bg-zinc-100 rounded mb-[20px]" />
        
        <div className="flex items-center gap-[16px] bg-[#ffffff] border border-[#e9e9e9] rounded-[10px] p-[20px] shadow-[0_2px_8px_rgba(0,0,0,0.04)] mb-[24px]">
          <div className="w-[48px] h-[48px] rounded-full bg-zinc-200 shrink-0" />
          <div className="flex flex-col gap-[8px] flex-1">
            <div className="h-[16px] w-[140px] bg-zinc-200 rounded" />
            <div className="h-[12px] w-[200px] bg-zinc-100 rounded" />
          </div>
        </div>
      </div>

      <div className="py-[32px] border-t border-[#e9e9e9]">
        <div className="h-[20px] w-[100px] bg-zinc-200 rounded mb-[6px]" />
        <div className="h-[14px] w-[180px] bg-zinc-100 rounded mb-[20px]" />
        
        <div className="flex flex-col sm:flex-row gap-[12px]">
          <div className="flex-1 max-w-[400px] h-[38px] bg-zinc-100 rounded-[8px] border border-[#e9e9e9]" />
          <div className="w-[100px] h-[38px] bg-zinc-200 rounded-[8px]" />
        </div>
      </div>
    </div>
  );
}

function ConnectionsSkeleton() {
  return (
    <div className="flex flex-col animate-pulse">
      <div className="pb-[32px]">
        <div className="h-[20px] w-[120px] bg-zinc-200 rounded mb-[6px]" />
        <div className="h-[14px] w-[280px] bg-zinc-100 rounded mb-[24px]" />

        <div className="flex items-center justify-between gap-[16px] bg-[#ffffff] border border-[#e9e9e9] rounded-[10px] p-[20px] shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
          <div className="flex items-center gap-[12px]">
            <div className="w-[36px] h-[36px] rounded-[8px] bg-zinc-200 shrink-0" />
            <div className="flex flex-col gap-[8px]">
              <div className="h-[14px] w-[130px] bg-zinc-200 rounded" />
              <div className="h-[12px] w-[180px] bg-zinc-100 rounded" />
            </div>
          </div>
          <div className="w-[90px] h-[28px] bg-zinc-200 rounded-[6px]" />
        </div>
      </div>
    </div>
  );
}

function SecuritySkeleton() {
  return (
    <div className="flex flex-col animate-pulse">
      <div className="pb-[32px]">
        <div className="h-[20px] w-[100px] bg-zinc-200 rounded mb-[6px]" />
        <div className="h-[14px] w-[240px] bg-zinc-100 rounded mb-[20px]" />

        <div className="flex flex-col gap-[18px] max-w-[400px]">
          <div className="flex flex-col gap-[8px]">
            <div className="h-[14px] w-[120px] bg-zinc-200 rounded" />
            <div className="h-[38px] bg-zinc-100 rounded-[8px] border border-[#e9e9e9]" />
          </div>
          <div className="flex flex-col gap-[8px]">
            <div className="h-[14px] w-[100px] bg-zinc-200 rounded" />
            <div className="h-[38px] bg-zinc-100 rounded-[8px] border border-[#e9e9e9]" />
          </div>
          <div className="flex flex-col gap-[8px]">
            <div className="h-[14px] w-[160px] bg-zinc-200 rounded" />
            <div className="h-[38px] bg-zinc-100 rounded-[8px] border border-[#e9e9e9]" />
          </div>
          <div className="w-[140px] h-[38px] bg-zinc-200 rounded-[8px] mt-[4px]" />
        </div>
      </div>
    </div>
  );
}

const NAV_ITEMS = [
  { id: 'general', label: 'Загальні', icon: <UserIcon size={16} /> },
  { id: 'connections', label: 'Інтеграції', icon: <LinkIcon size={16} /> },
  { id: 'security', label: 'Безпека', icon: <Shield size={16} /> },
];

type NavId = 'general' | 'connections' | 'security';

export default function ProfilePage() {
  const router = useRouter();
  const [user,       setUser]       = useState<User | null>(null);
  const [loading,    setLoading]    = useState(true);
  const [name,       setName]       = useState('');
  const [avatarUrl,  setAvatarUrl]  = useState('');
  const [savingName, setSavingName] = useState(false);
  const [nameSaved,  setNameSaved]  = useState(false);
  const [oldPwd,     setOldPwd]     = useState('');
  const [newPwd,     setNewPwd]     = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [savingPwd,  setSavingPwd]  = useState(false);
  const [pwdMsg,     setPwdMsg]     = useState<{ ok: boolean; text: string } | null>(null);
  const [globalErr,  setGlobalErr]  = useState('');
  const [activeNav,  setActiveNav]  = useState<NavId>('general');

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      const u = data.user;
      setUser(u);
      const storedName = u?.user_metadata?.display_name || u?.user_metadata?.full_name || u?.user_metadata?.name || '';
      setName(storedName || (u?.email?.split('@')[0].replace(/[._-]/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) ?? ''));
      const storedAvatar = u?.user_metadata?.avatar_url || u?.user_metadata?.picture || '';
      setAvatarUrl(storedAvatar);
      setLoading(false);
    });
  }, []);

  const handleSaveName = async () => {
    if (!name.trim() || savingName) return;
    setSavingName(true);
    setGlobalErr('');
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ data: { display_name: name.trim() } });
    setSavingName(false);
    if (error) {
      setGlobalErr(error.message);
    } else { 
      setNameSaved(true); 
      setTimeout(() => setNameSaved(false), 2000); 
      router.refresh();
    }
  };

  const handleChangePwd = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!oldPwd || !newPwd || !confirmPwd || savingPwd) return;
    
    if (newPwd !== confirmPwd) {
      setPwdMsg({ ok: false, text: 'Нові паролі не збігаються' });
      return;
    }

    setSavingPwd(true);
    setPwdMsg(null);
    const supabase = createClient();

    if (user?.email) {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: oldPwd,
      });
      if (signInError) {
        setSavingPwd(false);
        setPwdMsg({ ok: false, text: 'Неправильний старий пароль' });
        return;
      }
    }

    const { error } = await supabase.auth.updateUser({ password: newPwd });
    setSavingPwd(false);
    if (error) {
      setPwdMsg({ ok: false, text: error.message });
    } else { 
      setPwdMsg({ ok: true, text: 'Пароль успішно змінено' }); 
      setOldPwd('');
      setNewPwd(''); 
      setConfirmPwd('');
    }
  };

  const handleConnectGitHub = async () => {
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: 'github',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        scopes: 'read:user user:email repo',
      },
    });
  };

  const isEmailAuth    = user?.app_metadata?.provider === 'email' || (user?.identities?.some(i => i.provider === 'email') ?? false);
  const githubIdentity = user?.identities?.find(i => i.provider === 'github');

  const getNavDescription = (id: string) => {
    switch (id) {
      case 'general': return 'Ваша інформація та ім\'я';
      case 'connections': return 'GitHub та інші сервіси';
      case 'security': return 'Паролі та способи входу';
      default: return '';
    }
  };

  // Only show security tab if email auth is used (always show during loading to prevent sidebar shifts)
  const visibleNavItems = (loading || isEmailAuth) ? NAV_ITEMS : NAV_ITEMS.filter(n => n.id !== 'security');

  return (
    <div className="h-full w-full flex flex-row bg-[#f4f4f5]">
      {/* ── Left Sidebar (Settings Nav) ── */}
      <div className="w-[360px] shrink-0 bg-[#ffffff] border-r border-[#e9e9e9] flex flex-col h-full z-20">
        <div className="pt-[24px] pb-[16px] px-[24px] shrink-0 flex items-center gap-[12px]">
          <Link
            href="/"
            className="text-[#9a9a9a] hover:text-[#1f1f1f] transition-colors p-[8px] -ml-[8px] rounded-[8px] hover:bg-[#f4f4f5]"
          >
            <ArrowLeft size={20} strokeWidth={1.5} />
          </Link>
          <h2 className="text-[20px] font-bold text-[#1f1f1f]">Профіль</h2>
        </div>
        <div className="flex-1 overflow-y-auto custom-scrollbar px-[24px] pb-[32px] flex flex-col gap-[8px]">
          {visibleNavItems.map(nav => (
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

      {/* ── Right Content Area ── */}
      <div className="flex-1 flex flex-col h-full bg-[#ffffff] overflow-y-auto custom-scrollbar relative">
        {/* Header */}
        <div className="pt-[24px] pb-[16px] shrink-0 flex items-center justify-between px-[32px] sticky top-0 z-50 bg-[#ffffff] border-b border-[#e9e9e9]">
          <h1 className="text-[24px] font-bold text-[#1f1f1f] tracking-tight">
             {visibleNavItems.find(n => n.id === activeNav)?.label}
          </h1>
        </div>

        {/* Content */}
        <div className="px-[32px] py-[32px] max-w-[800px]">
          {loading ? (
            <>
              {activeNav === 'general' && <GeneralSkeleton />}
              {activeNav === 'connections' && <ConnectionsSkeleton />}
              {activeNav === 'security' && <SecuritySkeleton />}
            </>
          ) : (
            <>
              {activeNav === 'general' && (
                <GeneralSection
                  user={user}
                  name={name}
                  setName={setName}
                  handleSaveName={handleSaveName}
                  savingName={savingName}
                  nameSaved={nameSaved}
                  globalErr={globalErr}
                  avatarUrl={avatarUrl}
                  setAvatarUrl={setAvatarUrl}
                />
              )}
              {activeNav === 'connections' && (
                <ConnectionsSection
                  githubIdentity={githubIdentity}
                  handleConnectGitHub={handleConnectGitHub}
                />
              )}
              {activeNav === 'security' && (
                <SecuritySection
                  oldPwd={oldPwd}
                  setOldPwd={setOldPwd}
                  newPwd={newPwd}
                  setNewPwd={setNewPwd}
                  confirmPwd={confirmPwd}
                  setConfirmPwd={setConfirmPwd}
                  handleChangePwd={handleChangePwd}
                  savingPwd={savingPwd}
                  pwdMsg={pwdMsg}
                />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
