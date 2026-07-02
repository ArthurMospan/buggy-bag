'use client';
import { useEffect, useState, useRef } from 'react';
import { createClient } from '@/lib/supabase';
import type { User } from '@supabase/supabase-js';
import { Check, Loader2, AlertCircle, ArrowLeft, User as UserIcon, Shield, Link as LinkIcon, Upload, MoreHorizontal, LogIn } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

function GitHubLogo() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z"/>
    </svg>
  );
}

function OneBLogo() {
  return (
    <img src="/oneb-logo.png" alt="OneB" className="w-[20px] h-[20px] object-contain rounded-[4px]" />
  );
}

function GeneralSection({ user, name, setName, handleSaveName, savingName, nameSaved, globalErr, avatarUrl, setAvatarUrl }: any) {
  const router = useRouter();
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [emailInput, setEmailInput] = useState(user?.email || '');
  const [savingEmail, setSavingEmail] = useState(false);
  const [emailMsg, setEmailMsg] = useState<{ok: boolean, text: string} | null>(null);

  useEffect(() => {
    if (user?.email) setEmailInput(user.email);
  }, [user?.email]);

  const handleSaveEmail = async () => {
    if (!emailInput.trim() || emailInput === user?.email) return;
    setSavingEmail(true);
    setEmailMsg(null);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({ email: emailInput });
      if (error) throw error;
      setEmailMsg({ ok: true, text: 'Листи-підтвердження надіслано на поточну та нову пошту. Будь ласка, перевірте обидві скриньки.' });
    } catch (err: any) {
      setEmailMsg({ ok: false, text: err.message || 'Помилка оновлення пошти' });
    } finally {
      setSavingEmail(false);
    }
  };

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
          // Set local preview immediately
          setAvatarUrl(dataUrl);
          
          try {
            // Upload to storage to prevent JWT cookie bloat
            const res = await fetch('/api/auth/avatar', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ base64: dataUrl }),
            });
            
            if (res.ok) {
              const { url } = await res.json();
              if (url) {
                const supabase = createClient();
                // This updates the local session cookie with the new JWT
                await supabase.auth.updateUser({ data: { avatar_url: url, custom_avatar_url: url } });
                setAvatarUrl(url); // switch to the real remote URL
                // Force a hard reload to ensure server components fetch the new metadata
                // and bypass any Next.js router cache that might hold stale data.
                window.location.reload();
              }
            } else {
              console.error('Failed to upload avatar:', await res.text());
            }
          } catch (e) {
            console.error('Avatar upload error:', e);
          }
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
        
        <div className="flex items-center gap-[16px] bg-[#ffffff] border border-[#e9e9e9] rounded-[10px] p-[20px] mb-[24px]">
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
        
        <div className="flex flex-col gap-[16px]">
          <div className="flex flex-col gap-[1px] bg-[#e9e9e9] border border-[#e9e9e9] rounded-[10px] overflow-hidden">
            <div className="flex items-center bg-[#ffffff] px-[16px] py-[14px]">
              <span className="text-[13px] font-bold text-[#9a9a9a] w-[140px] shrink-0">Повне ім'я</span>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleSaveName(); }}
                placeholder="Введіть ім'я"
                className="flex-1 bg-transparent text-[13px] text-[#1f1f1f] font-bold outline-none placeholder:text-[#9a9a9a]"
              />
            </div>
          </div>
          <div className="flex items-center justify-between">
            <div className="text-[12px] text-[#ef4444] flex items-center gap-[5px]">
              {globalErr && <><AlertCircle size={12} />{globalErr}</>}
            </div>
            <button
              onClick={handleSaveName}
              disabled={savingName || !name.trim()}
              className="bg-[#1f1f1f] hover:bg-[#303030] text-white text-[13px] font-bold px-[20px] py-[10px] rounded-[8px] transition-colors disabled:opacity-50 shrink-0 flex items-center justify-center gap-[6px]"
            >
              {savingName ? <Loader2 size={14} className="animate-spin" /> : nameSaved ? <Check size={14} /> : null}
              {nameSaved ? 'Збережено' : 'Зберегти'}
            </button>
          </div>
        </div>
      </div>

      <div className="py-[32px] border-t border-[#e9e9e9]">
        <h2 className="text-[16px] font-bold text-[#1f1f1f] mb-[6px]">Електронна пошта</h2>
        <p className="text-[13px] text-[#9a9a9a] mb-[20px] leading-relaxed">Адреса електронної пошти, яка використовується для входу.</p>
        
        <div className="flex flex-col gap-[16px]">
          <div className="flex flex-col gap-[1px] bg-[#e9e9e9] border border-[#e9e9e9] rounded-[10px] overflow-hidden">
            <div className="flex items-center bg-[#ffffff] px-[16px] py-[14px]">
              <span className="text-[13px] font-bold text-[#9a9a9a] w-[140px] shrink-0">Email</span>
              <input
                type="email"
                value={emailInput}
                onChange={e => setEmailInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleSaveEmail(); }}
                placeholder="Введіть email"
                className="flex-1 bg-transparent text-[13px] text-[#1f1f1f] font-bold outline-none placeholder:text-[#9a9a9a]"
              />
            </div>
          </div>
          <div className="flex items-center justify-between">
            <div className={`text-[12px] flex items-center gap-[5px] ${emailMsg?.ok ? 'text-[#10b981]' : 'text-[#ef4444]'}`}>
              {emailMsg && (emailMsg.ok ? <Check size={12} /> : <AlertCircle size={12} />)}
              {emailMsg?.text}
            </div>
            <button
              onClick={handleSaveEmail}
              disabled={savingEmail || !emailInput.trim() || emailInput === user?.email}
              className="bg-[#1f1f1f] hover:bg-[#303030] text-white text-[13px] font-bold px-[20px] py-[10px] rounded-[8px] transition-colors disabled:opacity-50 shrink-0 flex items-center justify-center gap-[6px]"
            >
              {savingEmail ? <Loader2 size={14} className="animate-spin" /> : null}
              Змінити Email
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function KebabMenu({ onDisconnect }: { onDisconnect: () => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    if (open) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(v => !v)}
        className="w-[32px] h-[32px] flex items-center justify-center rounded-[8px] text-[#9a9a9a] hover:text-[#1f1f1f] hover:bg-[#f4f4f5] transition-colors"
        title="Дії"
      >
        <MoreHorizontal size={16} />
      </button>
      {open && (
        <div className="absolute right-0 top-[36px] bg-white border border-[#e9e9e9] rounded-[10px] shadow-[0_4px_20px_rgba(0,0,0,0.10)] z-50 min-w-[160px] py-[4px] overflow-hidden">
          <button
            onClick={() => { setOpen(false); onDisconnect(); }}
            className="w-full text-left px-[14px] py-[10px] text-[13px] font-medium text-[#ef4444] hover:bg-[#fef2f2] transition-colors flex items-center gap-[8px]"
          >
            <LinkIcon size={13} className="opacity-70" />
            Від'єднати
          </button>
        </div>
      )}
    </div>
  );
}

function ConnectionsSection({ email, githubIdentity, handleConnectGitHub, handleDisconnectGitHub, isPrimaryGitHub, onebIdentity, handleConnectOneB, handleDisconnectOneB, isPrimaryOneb }: any) {
  return (
    <div className="flex flex-col">
      <div className="pb-[32px]">
        <h2 className="text-[16px] font-bold text-[#1f1f1f] mb-[6px]">Способи входу</h2>
        <p className="text-[13px] text-[#9a9a9a] mb-[24px] leading-relaxed">Керуйте сервісами, через які ви можете авторизуватись у системі.</p>

        <div className="flex flex-col gap-[16px]">
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
              <div className="flex items-center gap-[8px]">
                {isPrimaryGitHub ? (
                  <div className="flex items-center gap-[6px] text-[13px] font-medium text-[#6366f1] bg-[#f0f0ff] px-[8px] py-[4px] rounded-[6px]">
                    <LogIn size={13} /> Основний вхід
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-[6px] text-[13px] font-medium text-[#10b981] bg-[#f0fdf4] px-[8px] py-[4px] rounded-[6px]">
                      <Check size={14} /> Активно
                    </div>
                    <KebabMenu onDisconnect={handleDisconnectGitHub} />
                  </>
                )}
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

          {onebIdentity ? (
            <div className="flex items-center justify-between gap-[16px] bg-[#ffffff] border border-[#e9e9e9] rounded-[10px] p-[20px]">
              <div className="flex items-center gap-[12px]">
                <div className="w-[36px] h-[36px] rounded-[8px] bg-[#f4f4f5] flex items-center justify-center shrink-0 border border-[#e9e9e9] text-[#1f1f1f]">
                  <OneBLogo />
                </div>
                <div>
                  <span className="text-[14px] font-bold text-[#1f1f1f] block">OneB підключено</span>
                  <span className="text-[13px] font-medium text-[#9a9a9a] mt-[2px] block">
                    як <strong className="text-[#1f1f1f] font-bold">{onebIdentity.identity_data?.name ?? 'OneB Account'}</strong>
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-[8px]">
                {isPrimaryOneb ? (
                  <div className="flex items-center gap-[6px] text-[13px] font-medium text-[#6366f1] bg-[#f0f0ff] px-[8px] py-[4px] rounded-[6px]">
                    <LogIn size={13} /> Основний вхід
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-[6px] text-[13px] font-medium text-[#10b981] bg-[#f0fdf4] px-[8px] py-[4px] rounded-[6px]">
                      <Check size={14} /> Активно
                    </div>
                    <KebabMenu onDisconnect={handleDisconnectOneB} />
                  </>
                )}
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-[16px] bg-[#ffffff] border border-[#e9e9e9] rounded-[10px] p-[24px]">
              <div>
                <span className="text-[14px] font-bold text-[#1f1f1f] block mb-[4px]">OneB не підключено</span>
                <p className="text-[13px] text-[#9a9a9a] leading-relaxed">
                  Підключіть свій обліковий запис OneB для інтеграції з екосистемою 1B.
                </p>
              </div>
              <button
                onClick={handleConnectOneB}
                className="inline-flex items-center justify-center gap-[8px] px-[20px] py-[10px] bg-transparent border border-[#e9e9e9] text-[#1f1f1f] text-[13px] font-bold rounded-[8px] hover:bg-[#f4f4f5] transition-colors w-fit"
              >
                <OneBLogo />
                Підключити OneB
              </button>
            </div>
          )}

          {/* Рядок Email */}
          <div className="flex items-center justify-between gap-[16px] bg-[#ffffff] border border-[#e9e9e9] rounded-[10px] p-[20px]">
            <div className="flex items-center gap-[12px]">
              <div className="w-[36px] h-[36px] rounded-[8px] bg-[#f4f4f5] flex items-center justify-center shrink-0 border border-[#e9e9e9] text-[#1f1f1f]">
                <LogIn size={16} />
              </div>
              <div>
                <span className="text-[14px] font-bold text-[#1f1f1f] block">Email</span>
                <span className="text-[13px] font-medium text-[#9a9a9a] mt-[2px] block">
                  як <strong className="text-[#1f1f1f] font-bold">{email || 'Активно'}</strong>
                </span>
              </div>
            </div>
            <div className="flex items-center gap-[8px]">
              {(!isPrimaryOneb && !isPrimaryGitHub) ? (
                <div className="flex items-center gap-[6px] text-[13px] font-medium text-[#6366f1] bg-[#f0f0ff] px-[8px] py-[4px] rounded-[6px]">
                  <LogIn size={13} /> Основний вхід
                </div>
              ) : (
                <div className="flex items-center gap-[6px] text-[13px] font-medium text-[#10b981] bg-[#f0fdf4] px-[8px] py-[4px] rounded-[6px]">
                  <Check size={14} /> Активно
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SecuritySection({ handleDeleteAccount, isDeleting, showDeleteModal, setShowDeleteModal }: any) {
  return (
    <div className="flex flex-col">
      <div className="flex flex-col gap-[1px] bg-[#fee2e2] border border-[#fca5a5] rounded-[10px] overflow-hidden mt-[16px]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between bg-[#ffffff] p-[20px] gap-[16px]">
          <div>
            <h3 className="text-[14px] font-bold text-[#ef4444] mb-[4px]">Видалити акаунт</h3>
            <p className="text-[13px] text-[#9a9a9a] leading-relaxed max-w-[400px]">
              Цю дію неможливо скасувати. Усі ваші дані, проєкти та налаштування будуть видалені назавжди.
            </p>
          </div>
          <button
            onClick={() => setShowDeleteModal(true)}
            className="bg-[#ef4444] hover:bg-[#dc2626] text-white text-[13px] font-bold px-[20px] py-[10px] rounded-[8px] transition-colors shrink-0"
          >
            Видалити назавжди
          </button>
        </div>
      </div>

      {showDeleteModal && (
        <div className="fixed inset-0 bg-[#1f1f1f]/40 flex items-center justify-center z-50 p-[20px]">
          <div className="bg-white rounded-[16px] p-[24px] max-w-[400px] w-full shadow-lg border border-[#e9e9e9]">
            <h3 className="text-[18px] font-bold text-[#1f1f1f] mb-[8px]">Ви впевнені?</h3>
            <p className="text-[14px] text-[#9a9a9a] mb-[24px] leading-relaxed">
              Видалення облікового запису є незворотною дією. Всі ваші проєкти, репорти та налаштування будуть видалені назавжди.
            </p>
            <div className="flex items-center gap-[12px] justify-end">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="px-[16px] py-[8px] text-[13px] font-bold text-[#1f1f1f] hover:bg-[#f4f4f5] rounded-[8px] transition-colors"
                disabled={isDeleting}
              >
                Скасувати
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={isDeleting}
                className="bg-[#ef4444] hover:bg-[#dc2626] text-white text-[13px] font-bold px-[16px] py-[8px] rounded-[8px] transition-colors flex items-center gap-[6px]"
              >
                {isDeleting && <Loader2 size={14} className="animate-spin" />}
                Видалити
              </button>
            </div>
          </div>
        </div>
      )}
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

        <div className="flex flex-col gap-[16px]">
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
    </div>
  );
}

function SecuritySkeleton() {
  return (
    <div className="flex flex-col animate-pulse">
      <div className="pb-[32px]">
        <div className="h-[20px] w-[100px] bg-zinc-200 rounded mb-[6px]" />
        <div className="h-[14px] w-[240px] bg-zinc-100 rounded mb-[20px]" />

        <div className="flex flex-col gap-[8px]">
          <div className="h-[14px] w-[100px] bg-zinc-200 rounded" />
          <div className="h-[38px] bg-zinc-100 rounded-[8px] border border-[#e9e9e9]" />
        </div>
      </div>
    </div>
  );
}

const NAV_ITEMS = [
  { id: 'general', label: 'Загальні', icon: <UserIcon size={16} /> },
  { id: 'connections', label: 'Способи входу', icon: <LinkIcon size={16} /> },
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
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const [activeNav, setActiveNav] = useState<NavId | null>(() => {
    if (typeof window !== 'undefined' && window.innerWidth < 768) return null;
    return 'general';
  });

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      const u = data.user;
      setUser(u);
      const storedName = u?.user_metadata?.display_name || u?.user_metadata?.full_name || u?.user_metadata?.name || '';
      setName(storedName || (u?.email?.split('@')[0].replace(/[._-]/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) ?? ''));
      const storedAvatar = u?.user_metadata?.custom_avatar_url || u?.user_metadata?.avatar_url || u?.user_metadata?.picture || '';
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


  const handleDeleteAccount = async () => {
    setIsDeleting(true);
    try {
      const response = await fetch('/api/auth/delete-account', {
        method: 'DELETE',
      });
      if (!response.ok) {
        throw new Error('Failed to delete account');
      }
      const supabase = createClient();
      await supabase.auth.signOut();
      router.push('/login');
    } catch (err) {
      console.error(err);
      alert('Сталася помилка під час видалення акаунту. Спробуйте пізніше.');
      setIsDeleting(false);
      setShowDeleteModal(false);
    }
  };

  const handleConnectGitHub = async () => {
    const supabase = createClient();
    await supabase.auth.linkIdentity({
      provider: 'github',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        scopes: 'read:user user:email repo',
      },
    });
  };

  const handleConnectOneB = async () => {
    const clientId = process.env.NEXT_PUBLIC_ONEB_CLIENT_ID || 'dummy_client_id';
    const redirectUri = `${window.location.origin}/oauth2/result`;
    const state = Math.random().toString(36).substring(7);
    const scopes = process.env.NEXT_PUBLIC_ONEB_SCOPES ?? '';
    const scopeParam = scopes ? `&scope=${encodeURIComponent(scopes)}` : '';
    const authUrl = `https://account.oneb.app/oauth/authorize?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}${scopeParam}&state=${state}`;
    window.location.href = authUrl;
  };

  const handleDisconnectGitHub = async () => {
    const res = await fetch('/api/auth/unlink-github', { method: 'DELETE' });
    if (res.ok) {
      const supabase = createClient();
      const { data } = await supabase.auth.getUser();
      setUser(data.user);
    } else {
      const body = await res.json().catch(() => ({}));
      alert(body.message || 'Не вдалося відключити GitHub');
    }
  };

  const handleDisconnectOneB = async () => {
    const supabase = createClient();
    // Soft-unlink: keep oneb_id so we can re-match on reconnect, just set oneb_connected: false
    await supabase.auth.updateUser({
      data: {
        oneb_connected: false,
      }
    });
    const { data } = await supabase.auth.getUser();
    setUser(data.user);
  };

  const isEmailAuth      = user?.app_metadata?.provider === 'email' || (user?.identities?.some(i => i.provider === 'email') ?? false);
  const githubIdentity   = user?.identities?.find(i => i.provider === 'github');
  // onebIdentity: user has oneb_id AND oneb_connected is not explicitly false
  const onebIdentity     = (user?.user_metadata?.oneb_id && user?.user_metadata?.oneb_connected !== false)
    ? { identity_data: { name: user.user_metadata.full_name || 'OneB Account' } }
    : undefined;
  const hasEmailIdentity = user?.identities?.some(i => i.provider === 'email') ?? false;
  const hasOnebConnected = !!(user?.user_metadata?.oneb_id && user?.user_metadata?.oneb_connected !== false);
  
  const createdViaOneB   = !!user?.user_metadata?.created_via_oneb;
  const isPrimaryOneb    = createdViaOneB || (!hasEmailIdentity && hasOnebConnected && !githubIdentity) || (hasOnebConnected && user?.email?.endsWith('@oneb.buggy-bag'));
  const isPrimaryGitHub  = !!(githubIdentity && !hasEmailIdentity && !hasOnebConnected) || (githubIdentity && !createdViaOneB && user?.app_metadata?.providers?.length === 1 && user.app_metadata.providers[0] === 'github');

  const getNavDescription = (id: string) => {
    switch (id) {
      case 'general': return 'Ваша інформація та ім\'я';
      case 'connections': return 'GitHub та інші сервіси';
      case 'security': return 'Паролі та способи входу';
      default: return '';
    }
  };

  const visibleNavItems = NAV_ITEMS; // Security (Danger Zone) is always visible now

  return (
    <div className="h-full w-full flex flex-col md:flex-row bg-[#f4f4f5]">
      {/* ── Left Sidebar (Settings Nav) ── */}
      <div className={`md:w-[360px] md:shrink-0 bg-[#ffffff] md:border-r md:border-[#e9e9e9] flex flex-col h-full z-20 w-full ${
        activeNav ? 'hidden md:flex' : 'flex'
      }`}>
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
             {visibleNavItems.find(n => n.id === activeNav)?.label}
          </h1>
        </div>

        {/* Content */}
        <div className="px-[24px] md:px-[32px] py-[24px] md:py-[32px] max-w-[800px] w-full">
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
                  email={user?.email}
                  githubIdentity={githubIdentity}
                  handleConnectGitHub={handleConnectGitHub}
                  handleDisconnectGitHub={handleDisconnectGitHub}
                  isPrimaryGitHub={isPrimaryGitHub}
                  onebIdentity={onebIdentity}
                  handleConnectOneB={handleConnectOneB}
                  handleDisconnectOneB={handleDisconnectOneB}
                  isPrimaryOneb={isPrimaryOneb}
                />
              )}
              {activeNav === 'security' && (
                <SecuritySection
                  handleDeleteAccount={handleDeleteAccount}
                  isDeleting={isDeleting}
                  showDeleteModal={showDeleteModal}
                  setShowDeleteModal={setShowDeleteModal}
                />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
