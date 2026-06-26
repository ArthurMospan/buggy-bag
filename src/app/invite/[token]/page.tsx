'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import logoWhite from '../../../../public/bug-logo-white.svg';

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
    <div className="min-h-screen bg-[#141419] flex items-center justify-center p-[24px]">
      <div className="w-full max-w-sm animate-fade-in-up">
        {/* Logo / Brand */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center mb-6">
            <Image src={logoWhite} alt="BuggyBag" width={80} height={80} className="w-20 h-20" />
          </div>
          
          {(state === 'loading' || state === 'joining') && (
            <>
              <h1 className="text-2xl font-semibold text-white tracking-tight">Зачекайте</h1>
              <p className="mt-2 text-sm text-white/70">Обробляємо інформацію...</p>
            </>
          )}

          {state === 'preview' && (
            <>
              <h1 className="text-2xl font-semibold text-white tracking-tight">Запрошення до проєкту</h1>
              <p className="mt-2 text-sm text-white/70">BuggyBag Portal</p>
            </>
          )}

          {(state === 'success' || state === 'already') && (
            <>
              <h1 className="text-2xl font-semibold text-white tracking-tight">
                {state === 'already' ? 'Ви вже учасник!' : 'Ласкаво просимо!'}
              </h1>
              <p className="mt-2 text-sm text-white/70">BuggyBag Portal</p>
            </>
          )}

          {state === 'error' && (
            <>
              <h1 className="text-2xl font-semibold text-[#f87171] tracking-tight">Помилка</h1>
              <p className="mt-2 text-sm text-white/70">Щось пішло не так</p>
            </>
          )}
        </div>

        <div className="flex flex-col items-center animate-fade-in-up gap-4">
          {(state === 'loading' || state === 'joining') && (
            <div className="text-center py-4">
              <div className="w-8 h-8 border-[3px] border-white/10 border-t-white/80 rounded-full animate-spin mx-auto mb-4" />
              <p className="text-sm text-white/70">
                {state === 'loading' ? 'Перевіряємо посилання...' : 'Приєднуємось до проєкту...'}
              </p>
            </div>
          )}

          {state === 'preview' && (
            <>
              <div className="text-center mb-4">
                <h2 className="text-xl font-bold text-white mb-2">{projectName}</h2>
                <p className="text-sm text-white/70 leading-relaxed px-2">
                  Вас запрошено долучитися до проєкту як член команди. Ви матимете доступ до всіх багів та налаштувань.
                </p>
              </div>

              <button
                onClick={handleJoin}
                className="w-full flex items-center justify-center gap-3 rounded-full bg-white px-6 py-4 text-sm font-semibold text-gray-900 transition-all hover:bg-gray-100 active:scale-[0.98] focus-ring cursor-pointer shadow-sm"
              >
                Прийняти запрошення
              </button>

              <p className="mt-4 text-center text-[13px] text-white/60">
                Потрібен акаунт BuggyBag?{' '}
                <Link href={`/login?redirect=/invite/${token}`} className="text-white font-semibold hover:text-white/80 transition-colors">
                  Увійдіть або зареєструйтесь
                </Link>
              </p>
            </>
          )}

          {(state === 'success' || state === 'already') && projectId && (
            <>
              <div className="text-center mb-4">
                <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>
                <p className="text-sm text-white/70 leading-relaxed px-2">
                  {state === 'already'
                    ? `Ви вже маєте доступ до проєкту «${projectName}»`
                    : `Тепер ви — член команди проєкту «${projectName}»`}
                </p>
              </div>

              <Link
                href={`/projects/${projectId}`}
                className="w-full flex items-center justify-center gap-3 rounded-full bg-white px-6 py-4 text-sm font-semibold text-gray-900 transition-all hover:bg-gray-100 active:scale-[0.98] focus-ring cursor-pointer shadow-sm"
              >
                Відкрити проєкт
              </Link>
            </>
          )}

          {state === 'error' && (
            <>
              <div className="text-center mb-4">
                <div className="w-16 h-16 bg-[#f87171]/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                </div>
                <h2 className="text-xl font-bold text-white mb-2">Посилання недійсне</h2>
                <p className="text-sm text-white/70 leading-relaxed px-2">{errorMsg}</p>
              </div>

              <Link
                href="/"
                className="w-full flex items-center justify-center gap-3 rounded-full bg-white/10 px-6 py-4 text-sm font-semibold text-white transition-all hover:bg-white/20 active:scale-[0.98] border border-white/10 focus-ring cursor-pointer shadow-sm"
              >
                На головну
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
