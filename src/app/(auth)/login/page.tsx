'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import Button from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import Tabs from '@/components/ui/Tabs';
import { Bug } from 'lucide-react';

const TABS: { id: string; label: string }[] = [
  { id: 'login',    label: 'Увійти' },
  { id: 'register', label: 'Реєстрація' },
];

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();

  const [tab, setTab]         = useState('login');
  const [email, setEmail]     = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (tab === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
      }
      router.push('/');
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Щось пішло не так');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-[400px]">
      {/* Logo */}
      <div className="flex items-center justify-center gap-[10px] mb-[32px]">
        <div className="w-[36px] h-[36px] bg-[#1f1f1f] rounded-[10px] flex items-center justify-center">
          <Bug size={18} className="text-white" />
        </div>
        <span className="text-[20px] font-bold text-[#1f1f1f]">BuggyBag</span>
      </div>

      {/* Card */}
      <div className="bg-white rounded-[20px] border border-[#e9e9e9] p-[28px] flex flex-col gap-[20px]">
        {/* Tabs */}
        <Tabs tabs={TABS} activeTab={tab} onTabChange={setTab} className="w-full" />

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-[14px]">
          <div>
            <label className="text-[11px] font-bold text-[#9a9a9a] uppercase tracking-wider block mb-[6px]">
              Email
            </label>
            <Input
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
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
              placeholder="Мінімум 6 символів"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete={tab === 'login' ? 'current-password' : 'new-password'}
            />
          </div>

          {/* Error */}
          {error && (
            <p className="text-[12px] font-semibold text-[#ef4444] bg-[#fef2f2] px-[12px] py-[8px] rounded-[8px]">
              {error}
            </p>
          )}

          <Button
            type="submit"
            style="primary"
            size="lg"
            loading={loading}
            className="w-full mt-[4px]"
          >
            {tab === 'login' ? 'Увійти' : 'Створити акаунт'}
          </Button>
        </form>
      </div>
    </div>
  );
}
