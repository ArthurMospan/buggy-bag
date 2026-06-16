'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

type State = 'loading' | 'preview' | 'joining' | 'success' | 'already' | 'error';

export default function InvitePage() {
  const { token } = useParams<{ token: string }>();
  const router = useRouter();
  const [state, setState] = useState<State>('loading');
  const [projectName, setProjectName] = useState('');
  const [projectId, setProjectId] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (!token) return;
    fetch(`/api/projects/invite?token=${token}`)
      .then(r => r.json())
      .then(d => {
        if (d.project) {
          setProjectName(d.project.name);
          setState('preview');
        } else {
          setErrorMsg(d.error || 'Невірне посилання');
          setState('error');
        }
      })
      .catch(() => {
        setErrorMsg('Помилка мережі');
        setState('error');
      });
  }, [token]);

  const handleJoin = async () => {
    setState('joining');
    const res = await fetch('/api/projects/invite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'join', token }),
    });

    if (res.status === 401) {
      // Not logged in — redirect to login, come back after
      router.push(`/login?redirect=/invite/${token}`);
      return;
    }

    const data = await res.json();

    if (res.ok) {
      const pid = data.project_id;
      setProjectId(pid);
      setState(data.already_member || data.error?.includes('owner') ? 'already' : 'success');
    } else {
      setErrorMsg(data.error || 'Помилка');
      setState('error');
    }
  };

  return (
    <div className="min-h-screen bg-[#f9f9f9] flex items-center justify-center p-[24px]">
      <div className="bg-white rounded-[20px] border border-[#e9e9e9] shadow-sm w-full max-w-[440px] overflow-hidden">
        {/* Header */}
        <div className="bg-zinc-950 px-[32px] py-[28px] flex items-center gap-[14px]">
          <img src="/bug-logo.svg" alt="BuggyBag" width={32} height={32} className="brightness-125" />
          <span className="text-white font-bold text-[20px] tracking-tight">BuggyBag</span>
        </div>

        <div className="p-[32px]">
          {state === 'loading' && (
            <div className="text-center py-[20px]">
              <div className="w-[32px] h-[32px] border-[3px] border-zinc-200 border-t-zinc-800 rounded-full animate-spin mx-auto mb-[16px]" />
              <p className="text-[14px] text-[#9a9a9a]">Перевіряємо посилання...</p>
            </div>
          )}

          {state === 'preview' && (
            <div className="flex flex-col gap-[20px]">
              <div>
                <div className="text-[11px] font-bold text-[#9a9a9a] uppercase tracking-wider mb-[6px]">Запрошення до проєкту</div>
                <h1 className="text-[22px] font-bold text-[#1f1f1f]">{projectName}</h1>
                <p className="text-[14px] text-[#9a9a9a] mt-[8px]">
                  Вас запрошено долучитися до проєкту як член команди. Ви матимете доступ до всіх багів та налаштувань.
                </p>
              </div>

              <button
                onClick={handleJoin}
                className="w-full bg-[#1f1f1f] hover:bg-[#303030] text-white py-[14px] rounded-[12px] text-[15px] font-bold transition-colors"
              >
                Прийняти запрошення
              </button>

              <p className="text-[12px] text-[#9a9a9a] text-center">
                Потрібен акаунт BuggyBag.{' '}
                <Link href={`/login?redirect=/invite/${token}`} className="text-[#6366f1] font-semibold hover:underline">
                  Увійдіть або зареєструйтесь
                </Link>
              </p>
            </div>
          )}

          {state === 'joining' && (
            <div className="text-center py-[20px]">
              <div className="w-[32px] h-[32px] border-[3px] border-zinc-200 border-t-zinc-800 rounded-full animate-spin mx-auto mb-[16px]" />
              <p className="text-[14px] text-[#9a9a9a]">Приєднуємось до проєкту...</p>
            </div>
          )}

          {(state === 'success' || state === 'already') && projectId && (
            <div className="flex flex-col items-center gap-[20px] text-center py-[8px]">
              <div className="w-[64px] h-[64px] bg-[#f0fdf4] rounded-full flex items-center justify-center">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <div>
                <h2 className="text-[20px] font-bold text-[#1f1f1f] mb-[6px]">
                  {state === 'already' ? 'Ви вже учасник!' : 'Ласкаво просимо!'}
                </h2>
                <p className="text-[14px] text-[#9a9a9a]">
                  {state === 'already'
                    ? `Ви вже маєте доступ до проєкту «${projectName}»`
                    : `Тепер ви — член команди проєкту «${projectName}»`}
                </p>
              </div>
              <Link
                href={`/projects/${projectId}`}
                className="w-full bg-[#1f1f1f] hover:bg-[#303030] text-white py-[14px] rounded-[12px] text-[15px] font-bold transition-colors text-center"
              >
                Відкрити проєкт
              </Link>
            </div>
          )}

          {state === 'error' && (
            <div className="flex flex-col items-center gap-[16px] text-center py-[8px]">
              <div className="w-[64px] h-[64px] bg-[#fff1f2] rounded-full flex items-center justify-center">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
              </div>
              <div>
                <h2 className="text-[20px] font-bold text-[#1f1f1f] mb-[6px]">Посилання недійсне</h2>
                <p className="text-[14px] text-[#9a9a9a]">{errorMsg}</p>
              </div>
              <Link href="/" className="text-[#6366f1] font-bold text-[14px] hover:underline">
                На головну
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
