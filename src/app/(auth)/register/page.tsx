'use client';
import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import Button from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Bug, MailCheck } from 'lucide-react';
import Link from 'next/link';

function GitHubIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z"/>
    </svg>
  );
}

import Image from 'next/image';
import logoWhite from '../../../../public/bug-logo-white.svg';
import onebLogo from '../../../../public/oneb-logo.png';

function OneBLogo() {
  return <Image src={onebLogo} alt="OneB" width={18} height={18} className="object-contain rounded-[4px]" />;
}

function RegisterForm() {
  const searchParams = useSearchParams();
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading]   = useState(false);
  const [ghLoading, setGhLoading] = useState(false);
  const [error, setError]       = useState('');
  const [success, setSuccess]   = useState(false);

  useEffect(() => {
    if (searchParams.get('error') === 'oauth') {
      setError('Не вдалося зареєструватися через GitHub. Спробуйте ще раз.');
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) throw error;
      setSuccess(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Щось пішло не так. Спробуйте ще раз.');
    } finally {
      setLoading(false);
    }
  };

  const handleGitHub = async () => {
    setError('');
    setGhLoading(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'github',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          scopes: 'read:user user:email',
        },
      });
      if (error) throw error;
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Щось пішло не так.');
      setGhLoading(false);
    }
  };

  const handleOneB = async () => {
    setError('');
    const clientId = process.env.NEXT_PUBLIC_ONEB_CLIENT_ID || 'dummy_client_id';
    const redirectUri = `${window.location.origin}/oauth2/result`;
    const state = Math.random().toString(36).substring(7);
    const scopes = process.env.NEXT_PUBLIC_ONEB_SCOPES ?? '';
    const scopeParam = scopes ? `&scope=${encodeURIComponent(scopes)}` : '';
    const authUrl = `https://account.oneb.app/oauth/authorize?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}${scopeParam}&state=${state}`;
    window.location.href = authUrl;
  };

  return (
    <div className="w-full max-w-sm animate-fade-in-up">
      {/* Logo / Brand */}
      <div className="text-center mb-10">
        <div className="inline-flex items-center justify-center mb-6">
          <Image src={logoWhite} alt="BuggyBag" width={80} height={80} className="w-20 h-20" />
        </div>
        <h1 className="text-2xl font-semibold text-white tracking-tight">
          Реєстрація
        </h1>
        <p className="mt-2 text-sm text-white/70">
          Створіть новий акаунт
        </p>
      </div>

      <div className="flex flex-col items-center animate-fade-in-up gap-4">
        {success ? (
          <div className="flex flex-col items-center gap-[16px] py-[8px] bg-white/5 border border-white/10 rounded-2xl p-6 w-full shadow-sm text-center">
            <div className="w-[56px] h-[56px] bg-[rgba(16,185,129,0.12)] rounded-full flex items-center justify-center">
              <MailCheck size={26} className="text-[#34d399]" />
            </div>
            <div className="flex flex-col gap-[8px]">
              <h2 className="text-[17px] font-bold text-white">Перевірте пошту</h2>
              <p className="text-[13px] text-white/70 leading-relaxed">
                Ми надіслали підтвердження на{' '}
                <strong className="text-white">{email}</strong>.
                Перейдіть за посиланням у листі, щоб активувати акаунт.
              </p>
            </div>
            <div className="w-full pt-[4px] border-t border-white/10 mt-2">
              <p className="text-center text-[13px] text-white/60 mt-[12px]">
                <Link href="/login" className="text-white font-semibold hover:text-white/80 transition-colors">
                  Повернутися до входу
                </Link>
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* GitHub OAuth */}
            <button
              onClick={handleGitHub}
              disabled={ghLoading || loading}
              className="w-full flex items-center justify-center gap-3 rounded-full bg-white px-6 py-3 text-sm font-semibold text-gray-900 transition-all hover:bg-gray-100 active:scale-[0.98] focus-ring cursor-pointer shadow-sm"
            >
              <GitHubIcon />
              {ghLoading ? 'Перенаправлення...' : 'Зареєструватися з GitHub'}
            </button>

            {/* OneB OAuth */}
            <button
              onClick={handleOneB}
              disabled={ghLoading || loading}
              className="w-full flex items-center justify-center gap-3 rounded-full bg-white px-6 py-3 text-sm font-semibold text-gray-900 transition-all hover:bg-gray-100 active:scale-[0.98] focus-ring cursor-pointer shadow-sm"
            >
              <OneBLogo />
              Зареєструватися з OneB
            </button>

            <div className="flex items-center gap-3 w-full my-2">
              <div className="flex-1 h-px bg-white/10" />
              <span className="text-[12px] font-medium text-white/40">або з Email</span>
              <div className="flex-1 h-px bg-white/10" />
            </div>

            <form onSubmit={handleSubmit} className="w-full flex flex-col gap-4">
              <input
                type="email"
                placeholder="Email адреса"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="w-full px-6 py-4 bg-white/5 border border-white/10 rounded-2xl text-center text-white text-base font-medium outline-none focus:border-white/40 focus:bg-white/10 transition-all placeholder:text-white/30"
              />

              <input
                type="password"
                placeholder="Мінімум 6 символів"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                minLength={6}
                autoComplete="new-password"
                className="w-full px-6 py-4 bg-white/5 border border-white/10 rounded-2xl text-center text-white text-base font-medium outline-none focus:border-white/40 focus:bg-white/10 transition-all placeholder:text-white/30"
              />

              {error && (
                <p className="text-[12px] font-medium text-[#f87171] text-center mt-1">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={loading || ghLoading}
                className="w-full flex items-center justify-center gap-3 rounded-full bg-white/10 px-6 py-4 text-sm font-semibold text-white transition-all hover:bg-white/20 active:scale-[0.98] border border-white/10 focus-ring cursor-pointer shadow-sm mt-2"
              >
                {loading ? 'Реєструємо...' : 'Створити акаунт'}
              </button>
            </form>

            <p className="mt-4 text-center text-[13px] text-white/60">
              Вже є акаунт?{' '}
              <Link href="/login" className="text-white font-semibold hover:text-white/80 transition-colors">
                Увійти
              </Link>
            </p>

            <p className="mt-6 text-center text-xs text-white/40">
              Продовжуючи, ви погоджуєтесь з умовами використання.
            </p>
          </>
        )}
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<div className="flex justify-center items-center w-full h-full text-[#8b8d98]">Завантаження...</div>}>
      <RegisterForm />
    </Suspense>
  );
}
