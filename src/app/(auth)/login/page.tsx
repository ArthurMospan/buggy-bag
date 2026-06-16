'use client';
import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import Button from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Bug } from 'lucide-react';
import Link from 'next/link';

function GitHubIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z"/>
    </svg>
  );
}

function LoginForm() {
  const router        = useRouter();
  const searchParams  = useSearchParams();
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading]   = useState(false);
  const [ghLoading, setGhLoading] = useState(false);
  const [error, setError]       = useState('');

  useEffect(() => {
    if (searchParams.get('error') === 'oauth') {
      setError('Не вдалося увійти через GitHub. Спробуйте ще раз.');
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const redirect = searchParams.get('redirect') || '/';
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      router.push(redirect);
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Невірний email або пароль.');
    } finally {
      setLoading(false);
    }
  };

  const handleGitHub = async () => {
    setError('');
    setGhLoading(true);
    const redirect = searchParams.get('redirect') || '/';
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'github',
        options: {
          redirectTo: `${window.location.origin}/auth/callback?redirect=${encodeURIComponent(redirect)}`,
          scopes: 'read:user user:email',
        },
      });
      if (error) throw error;
      // Browser will redirect — no need to do anything else
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Щось пішло не так.');
      setGhLoading(false);
    }
  };

  return (
    <div className="w-full max-w-[400px] flex flex-col gap-[28px]">
      {/* Logo */}
      <div className="flex items-center justify-center gap-[10px]">
        <div className="w-[36px] h-[36px] bg-[#6366f1] rounded-[10px] flex items-center justify-center shadow-[0_0_20px_rgba(99,102,241,0.3)]">
          <Bug size={18} className="text-white" />
        </div>
        <span className="text-[20px] font-bold text-white tracking-tight">BuggyBag</span>
      </div>

      {/* Card */}
      <div className="bg-[#18181c] rounded-[20px] border border-[#2a2a32] p-[28px] flex flex-col gap-[20px] shadow-[0_24px_60px_rgba(0,0,0,0.6)]">
        <h1 className="text-[18px] font-bold text-white">Увійти</h1>

        {/* GitHub OAuth */}
        <button
          onClick={handleGitHub}
          disabled={ghLoading || loading}
          className="flex items-center justify-center gap-[10px] w-full px-[16px] py-[11px] bg-[#23232b] hover:bg-[#2e2e38] active:bg-[#2c2c35] text-white text-[14px] font-semibold rounded-[10px] transition-colors disabled:opacity-50 border border-[#36363f]"
        >
          <GitHubIcon />
          {ghLoading ? 'Перенаправлення...' : 'Продовжити з GitHub'}
        </button>

        {/* Divider */}
        <div className="flex items-center gap-[12px]">
          <div className="flex-1 h-px bg-[#2a2a32]" />
          <span className="text-[12px] font-medium text-[#9696b0]">або</span>
          <div className="flex-1 h-px bg-[#2a2a32]" />
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-[14px]">
          <div>
            <label className="text-[11px] font-semibold text-[#9696b0] uppercase tracking-widest block mb-[8px]">
              Email
            </label>
            <Input
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>

          <div>
            <label className="text-[11px] font-semibold text-[#9696b0] uppercase tracking-widest block mb-[8px]">
              Пароль
            </label>
            <Input
              type="password"
              placeholder="Ваш пароль"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
          </div>

          {error && (
            <p className="text-[12px] font-medium text-[#f87171] bg-[#2d1515] border border-[#5c2020]/50 px-[12px] py-[10px] rounded-[10px]">
              {error}
            </p>
          )}

          <Button type="submit" style="primary" size="lg" loading={loading} className="w-full">
            {loading ? 'Входимо...' : 'Увійти з Email'}
          </Button>
        </form>

        <p className="text-center text-[13px] text-[#9696b0]">
          Немає акаунту?{' '}
          <Link href="/register" className="text-[#818cf8] font-semibold hover:text-[#a5b4fc] transition-colors">
            Зареєструватися
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="flex justify-center items-center w-full h-full text-[#8b8d98]">Завантаження...</div>}>
      <LoginForm />
    </Suspense>
  );
}
