'use client';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase';
import type { User } from '@supabase/supabase-js';
import { Check, Loader2, AlertCircle, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

function GitHubIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z"/>
    </svg>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-[#18181c] border border-[#2e2e3c] rounded-[12px] p-[24px]">
      <h2 className="text-[11px] font-bold text-[#9696b0] uppercase tracking-widest mb-[16px]">{title}</h2>
      {children}
    </div>
  );
}

export default function ProfilePage() {
  const [user,       setUser]       = useState<User | null>(null);
  const [loading,    setLoading]    = useState(true);
  const [name,       setName]       = useState('');
  const [savingName, setSavingName] = useState(false);
  const [nameSaved,  setNameSaved]  = useState(false);
  const [newPwd,     setNewPwd]     = useState('');
  const [savingPwd,  setSavingPwd]  = useState(false);
  const [pwdMsg,     setPwdMsg]     = useState<{ ok: boolean; text: string } | null>(null);
  const [globalErr,  setGlobalErr]  = useState('');

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      const u = data.user;
      setUser(u);
      const stored = u?.user_metadata?.display_name || u?.user_metadata?.full_name || '';
      setName(stored || (u?.email?.split('@')[0].replace(/[._-]/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) ?? ''));
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
    if (error) setGlobalErr(error.message);
    else { setNameSaved(true); setTimeout(() => setNameSaved(false), 2000); }
  };

  const handleChangePwd = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!newPwd || savingPwd) return;
    setSavingPwd(true);
    setPwdMsg(null);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password: newPwd });
    setSavingPwd(false);
    if (error) setPwdMsg({ ok: false, text: error.message });
    else { setPwdMsg({ ok: true, text: 'Пароль успішно змінено' }); setNewPwd(''); }
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full bg-[#141419]">
        <Loader2 size={22} className="text-[#9696b0] animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-full bg-[#141419]">

      {/* Header — 52px, aligns with sidebar */}
      <div className="sticky top-0 z-10 h-[52px] flex items-center gap-[12px] px-[40px] border-b border-[#2c2c35] bg-[#141419]/90 backdrop-blur-sm shrink-0">
        <Link href="/" className="text-[#9696b0] hover:text-[#b4b4c8] p-[5px] -ml-[5px] rounded-[6px] hover:bg-[#23232b] transition-colors" title="Назад">
          <ArrowLeft size={16} />
        </Link>
        <h1 className="text-[14px] font-semibold text-[#dcdce8]">Профіль</h1>
      </div>

      <div className="p-[40px] max-w-[640px] mx-auto flex flex-col gap-[20px] w-full">

        {/* Avatar + email summary */}
        <div className="flex items-center gap-[16px]">
          <div className="w-[52px] h-[52px] rounded-full bg-[#252538] text-white flex items-center justify-center text-[20px] font-bold uppercase shrink-0">
            {user?.email?.[0] ?? '?'}
          </div>
          <div>
            <p className="text-[16px] font-semibold text-white leading-tight">{name || '—'}</p>
            <p className="text-[13px] text-[#9696b0] mt-[2px]">{user?.email}</p>
          </div>
        </div>

        {/* Name */}
        <Section title="Ім'я">
          <div className="flex gap-[10px]">
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleSaveName(); }}
              placeholder="Ваше ім'я"
              className="flex-1 bg-[#111116] border border-[#2e2e3c] rounded-[6px] px-[12px] py-[9px] text-[13px] text-white placeholder:text-[#686884] outline-none focus:border-[#6366f1] transition-colors"
            />
            <button
              onClick={handleSaveName}
              disabled={savingName || !name.trim()}
              className="px-[16px] py-[9px] bg-white text-[#141419] text-[13px] font-semibold rounded-[6px] hover:bg-zinc-100 transition-colors disabled:opacity-40 flex items-center gap-[6px] shrink-0"
            >
              {savingName ? <Loader2 size={13} className="animate-spin" /> : nameSaved ? <Check size={13} /> : null}
              {nameSaved ? 'Збережено' : 'Зберегти'}
            </button>
          </div>
          {globalErr && (
            <p className="text-[12px] text-[#f87171] mt-[8px] flex items-center gap-[5px]">
              <AlertCircle size={12} />{globalErr}
            </p>
          )}
        </Section>

        {/* GitHub */}
        <Section title="GitHub">
          {githubIdentity ? (
            <div className="flex items-center gap-[10px]">
              <div className="w-[8px] h-[8px] rounded-full bg-[#34d399] shrink-0" />
              <span className="text-[13px] text-[#dcdce8]">
                Підключено як <strong className="text-white">{githubIdentity.identity_data?.user_name ?? 'GitHub'}</strong>
              </span>
            </div>
          ) : (
            <div className="flex flex-col gap-[10px]">
              <p className="text-[13px] text-[#9696b0]">
                GitHub не підключено. Підключіть, щоб створювати Issues та інтегруватися з репозиторіями.
              </p>
              <button
                onClick={handleConnectGitHub}
                className="inline-flex items-center gap-[10px] px-[16px] py-[9px] bg-[#23232b] border border-[#36363f] text-white text-[13px] font-semibold rounded-[6px] hover:bg-[#2e2e38] transition-colors w-fit"
              >
                <GitHubIcon />
                Підключити GitHub
              </button>
            </div>
          )}
        </Section>

        {/* Password — only for email auth */}
        {isEmailAuth && (
          <Section title="Змінити пароль">
            <form onSubmit={handleChangePwd} className="flex flex-col gap-[10px]">
              <input
                type="password"
                placeholder="Новий пароль (мін. 6 символів)"
                value={newPwd}
                onChange={e => setNewPwd(e.target.value)}
                required
                minLength={6}
                autoComplete="new-password"
                className="bg-[#111116] border border-[#2e2e3c] rounded-[6px] px-[12px] py-[9px] text-[13px] text-white placeholder:text-[#686884] outline-none focus:border-[#6366f1] transition-colors"
              />
              {pwdMsg && (
                <p className={`text-[12px] flex items-center gap-[5px] ${pwdMsg.ok ? 'text-[#34d399]' : 'text-[#f87171]'}`}>
                  {pwdMsg.ok ? <Check size={12} /> : <AlertCircle size={12} />}
                  {pwdMsg.text}
                </p>
              )}
              <button
                type="submit"
                disabled={savingPwd || !newPwd}
                className="self-start px-[16px] py-[9px] bg-white text-[#141419] text-[13px] font-semibold rounded-[6px] hover:bg-zinc-100 transition-colors disabled:opacity-40 flex items-center gap-[6px]"
              >
                {savingPwd && <Loader2 size={13} className="animate-spin" />}
                Зберегти пароль
              </button>
            </form>
          </Section>
        )}

      </div>
    </div>
  );
}
