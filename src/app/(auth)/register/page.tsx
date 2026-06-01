'use client';
import { useState } from 'react';
import { createClient } from '@/lib/supabase';
import Button from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Bug, MailCheck } from 'lucide-react';
import Link from 'next/link';

export default function RegisterPage() {
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const [success, setSuccess]   = useState(false);

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
        {success ? (
          /* ── Success state ── */
          <div className="flex flex-col items-center gap-[16px] py-[8px]">
            <div className="w-[56px] h-[56px] bg-[#ecfdf5] rounded-full flex items-center justify-center">
              <MailCheck size={26} className="text-[#10b981]" />
            </div>
            <div className="text-center flex flex-col gap-[8px]">
              <h2 className="text-[17px] font-bold text-[#1f1f1f]">Перевірте пошту</h2>
              <p className="text-[13px] text-[#9a9a9a] leading-relaxed">
                Ми надіслали підтвердження на{' '}
                <strong className="text-[#1f1f1f]">{email}</strong>.
                Перейдіть за посиланням у листі, щоб активувати акаунт.
              </p>
            </div>
            <div className="w-full pt-[4px] border-t border-[#f0f0f0]">
              <p className="text-center text-[13px] text-[#9a9a9a] mt-[12px]">
                <Link href="/login" className="text-[#1f1f1f] font-semibold hover:underline underline-offset-2">
                  Повернутися до входу
                </Link>
              </p>
            </div>
          </div>
        ) : (
          /* ── Registration form ── */
          <>
            <h1 className="text-[18px] font-bold text-[#1f1f1f]">Реєстрація</h1>

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
                  placeholder="Мінімум 6 символів"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  minLength={6}
                  autoComplete="new-password"
                />
              </div>

              {error && (
                <p className="text-[12px] font-semibold text-[#ef4444] bg-[#fef2f2] px-[12px] py-[10px] rounded-[10px]">
                  {error}
                </p>
              )}

              <Button type="submit" style="primary" size="lg" loading={loading} className="w-full">
                {loading ? 'Реєструємо...' : 'Створити акаунт'}
              </Button>
            </form>

            <p className="text-center text-[13px] text-[#9a9a9a]">
              Вже є акаунт?{' '}
              <Link href="/login" className="text-[#1f1f1f] font-semibold hover:underline underline-offset-2">
                Увійти
              </Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
