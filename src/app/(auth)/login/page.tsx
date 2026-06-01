'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import Button from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Bug } from 'lucide-react';
import Link from 'next/link';

export default function LoginPage() {
  const router  = useRouter();
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      router.push('/');
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Невірний email або пароль.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-[400px] flex flex-col gap-[24px]">
      {/* Logo */}
      <div className="flex items-center justify-center gap-[10px]">
        <div className="w-[36px] h-[36px] bg-[#1f1f1f] rounded-[10px] flex items-center justify-center">
          <Bug size={18} className="text-white" />
        </div>
        <span className="text-[20px] font-bold text-[#1f1f1f]">BuggyBag</span>
      </div>

      {/* Card */}
      <div className="bg-white rounded-[20px] border border-[#e9e9e9] p-[28px] flex flex-col gap-[20px]">
        <h1 className="text-[18px] font-bold text-[#1f1f1f]">Увійти</h1>

        <form onSubmit={handleSubmit} className="flex flex-col gap-[14px]">
          <div>
            <label className="text-[11px] font-bold text-[#9a9a9a] uppercase tracking-wider block mb-[6px]">
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
            <label className="text-[11px] font-bold text-[#9a9a9a] uppercase tracking-wider block mb-[6px]">
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
            <p className="text-[12px] font-semibold text-[#ef4444] bg-[#fef2f2] px-[12px] py-[10px] rounded-[10px]">
              {error}
            </p>
          )}

          <Button type="submit" style="primary" size="lg" loading={loading} className="w-full">
            {loading ? 'Входимо...' : 'Увійти'}
          </Button>
        </form>

        <p className="text-center text-[13px] text-[#9a9a9a]">
          Немає акаунту?{' '}
          <Link href="/register" className="text-[#1f1f1f] font-semibold hover:underline underline-offset-2">
            Зареєструватися
          </Link>
        </p>
      </div>
    </div>
  );
}
