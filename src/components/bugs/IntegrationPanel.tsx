'use client';
import { useState, useEffect } from 'react';
import { Project } from '@/lib/types';
import { Copy, Check, CheckCircle2, Circle } from 'lucide-react';

function CodeBlock({ code, label }: { code: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div className="flex flex-col gap-[6px]">
      {label && <div className="text-[11px] font-bold text-[#9a9a9a] uppercase tracking-wider">{label}</div>}
      <div className="relative bg-[#1f1f1f] rounded-[12px] overflow-hidden">
        <pre className="text-[12px] font-mono text-[#e5e5e5] p-[14px] pr-[80px] overflow-x-auto leading-relaxed whitespace-pre-wrap">{code}</pre>
        <button onClick={handleCopy} className="absolute top-[8px] right-[8px] flex items-center gap-[4px] bg-white/10 hover:bg-white/20 text-white/70 hover:text-white text-[10px] font-bold px-[8px] py-[4px] rounded-[6px] transition-colors">
          {copied ? <Check size={10} /> : <Copy size={10} />}
          {copied ? 'Скопійовано' : 'Копіювати'}
        </button>
      </div>
    </div>
  );
}

type PingStatus = 'idle' | 'checking' | 'connected' | 'error';

function ConnectionStatus({ apiKey }: { apiKey: string }) {
  const [status, setStatus] = useState<PingStatus>('idle');

  const check = async () => {
    setStatus('checking');
    try {
      const res = await fetch('/api/ping', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ api_key: apiKey }),
      });
      setStatus(res.ok ? 'connected' : 'error');
    } catch {
      setStatus('error');
    }
  };

  useEffect(() => { check(); }, []);

  const dot: Record<PingStatus, string> = {
    idle: '#9a9a9a', checking: '#f59e0b', connected: '#22c55e', error: '#ef4444',
  };
  const label: Record<PingStatus, string> = {
    idle: 'Перевірка...', checking: 'Перевірка...', connected: 'Сервер підключено ✓', error: 'Сервер недоступний',
  };

  return (
    <div className="flex items-center justify-between bg-[#f4f4f5] rounded-[14px] px-[16px] py-[12px]">
      <div className="flex items-center gap-[8px]">
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: dot[status], display: 'inline-block', flexShrink: 0 }} />
        <span className="text-[13px] font-semibold text-[#1f1f1f]">{label[status]}</span>
      </div>
      <button
        onClick={check}
        disabled={status === 'checking'}
        className="text-[11px] font-bold text-[#9a9a9a] hover:text-[#1f1f1f] transition-colors disabled:opacity-40"
      >
        {status === 'checking' ? '...' : 'Перевірити'}
      </button>
    </div>
  );
}

function Step({ num, title, children }: { num: number; title: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-[14px]">
      <div className="flex flex-col items-center">
        <div className="w-[28px] h-[28px] rounded-full bg-[#1f1f1f] text-white text-[12px] font-bold flex items-center justify-center shrink-0">
          {num}
        </div>
        <div className="flex-1 w-[1px] bg-[#e9e9e9] mt-[6px]" />
      </div>
      <div className="flex flex-col gap-[10px] pb-[20px] flex-1 min-w-0">
        <div className="text-[14px] font-bold text-[#1f1f1f] mt-[4px]">{title}</div>
        {children}
      </div>
    </div>
  );
}

export default function IntegrationPanel({ project }: { project: Project }) {
  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://your-portal.com';

  const installCode = `npm install github:ArthurMospan/buggy-bag-widget`;

  const usageCode = `// Вставте це в кореневий layout вашого проєкту
// Наприклад: app/layout.tsx або pages/_app.tsx

import { BuggyBag } from 'buggy-bag';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        {children}

        <BuggyBag
          apiEndpoint="${origin}/api/bugs/submit"
          apiKey="${project.api_key}"
          portalUrl="${origin}"
        />
      </body>
    </html>
  );
}`;

  const bookmarkletCode = `javascript:(function(){localStorage.setItem('BUGGY_BAG_ACCESS','active');location.reload();})();`;

  return (
    <div className="flex flex-col gap-[20px]">

      {/* Status */}
      <ConnectionStatus apiKey={project.api_key} />

      {/* Intro */}
      <p className="text-[13px] text-[#9a9a9a] leading-relaxed">
        Щоб ловити баги з вашого сайту, потрібно встановити віджет. Це займе ~5 хвилин — просто йдіть по кроках нижче.
      </p>

      {/* Steps */}
      <div>
        <Step num={1} title="Встановіть пакет">
          <p className="text-[12px] text-[#9a9a9a]">
            Відкрийте термінал у папці вашого проєкту і виконайте команду:
          </p>
          <CodeBlock code={installCode} />
        </Step>

        <Step num={2} title="Додайте віджет в проєкт">
          <p className="text-[12px] text-[#9a9a9a]">
            Вставте компонент <code className="bg-[#f4f4f5] px-[4px] py-[1px] rounded text-[#1f1f1f]">BuggyBag</code> у
            кореневий layout — він повинен завантажуватись на кожній сторінці. API ключ вже підставлений:
          </p>
          <CodeBlock code={usageCode} />
          <p className="text-[11px] text-[#9a9a9a]">
            💡 <strong>Де це?</strong> У Next.js це зазвичай <code className="bg-[#f4f4f5] px-[3px] rounded">app/layout.tsx</code>.
            У Vite/React — <code className="bg-[#f4f4f5] px-[3px] rounded">src/main.tsx</code>.
          </p>
        </Step>

        <Step num={3} title="Активуйте віджет на сторінці">
          <p className="text-[12px] text-[#9a9a9a]">
            Жучок прихований від звичайних користувачів. Щоб його побачити — потрібна активація.
            Є два варіанти:
          </p>
          <div className="flex flex-col gap-[10px]">
            <div className="bg-[#f9f9f9] border border-[#e9e9e9] rounded-[12px] p-[12px]">
              <div className="text-[12px] font-bold text-[#1f1f1f] mb-[4px]">Варіант А — букмарклет (рекомендовано)</div>
              <p className="text-[11px] text-[#9a9a9a] mb-[10px]">
                Перетягніть кнопку нижче в панель закладок браузера. Потім на вашому сайті — один клік і жучок з'явиться.
              </p>
              <div className="flex items-center gap-[10px]">
                <a
                  href={bookmarkletCode}
                  draggable
                  onClick={e => e.preventDefault()}
                  className="inline-flex items-center gap-[8px] px-[14px] py-[7px] bg-[#1f1f1f] text-white text-[12px] font-bold rounded-[8px] cursor-grab select-none hover:bg-[#303030] transition-colors"
                >
                  🐛 Активувати BuggyBag
                </a>
                <span className="text-[11px] text-[#9a9a9a]">← перетягніть в закладки</span>
              </div>
            </div>
            <div className="bg-[#f9f9f9] border border-[#e9e9e9] rounded-[12px] p-[12px]">
              <div className="text-[12px] font-bold text-[#1f1f1f] mb-[4px]">Варіант Б — URL параметр</div>
              <p className="text-[11px] text-[#9a9a9a]">
                Відкрийте ваш сайт і додайте <code className="bg-white border border-[#e9e9e9] px-[4px] py-[1px] rounded">?bb=on</code> в кінець адреси.
                Наприклад: <code className="bg-white border border-[#e9e9e9] px-[4px] py-[1px] rounded">localhost:3000?bb=on</code>
              </p>
            </div>
          </div>
        </Step>

        <div className="flex gap-[14px]">
          <div className="w-[28px] shrink-0 flex items-center justify-center">
            <CheckCircle2 size={20} className="text-[#10b981]" />
          </div>
          <div className="text-[13px] text-[#9a9a9a] mt-[2px]">
            Все! Баги будуть з'являтись на цій сторінці автоматично після натискання кнопки жучка на вашому сайті.
          </div>
        </div>
      </div>

      {/* API Key for reference */}
      <CodeBlock code={project.api_key} label="Ваш API ключ" />

      {/* Uninstall */}
      <div className="border border-[#e9e9e9] rounded-[14px] p-[16px] flex flex-col gap-[10px]">
        <div className="text-[12px] font-bold text-[#1f1f1f]">Видалити інтеграцію</div>
        <p className="text-[11px] text-[#9a9a9a]">
          Щоб повністю прибрати BuggyBag з проєкту, виконай два кроки:
        </p>
        <CodeBlock code={`npm uninstall buggy-bag`} label="1. Видалити пакет" />
        <p className="text-[11px] text-[#9a9a9a]">
          2. Прибери <code className="bg-[#f4f4f5] px-[3px] rounded text-[#1f1f1f]">&lt;BuggyBag ... /&gt;</code> з кореневого layout — того ж файлу, куди ти його додавав.
        </p>
      </div>

      {/* Security note */}
      <div className="bg-[#f9f9f9] border border-[#e9e9e9] rounded-[14px] p-[16px] flex flex-col gap-[8px]">
        <div className="text-[12px] font-bold text-[#1f1f1f]">🔒 Безпека</div>
        <p className="text-[11px] text-[#9a9a9a] leading-relaxed">
          <strong className="text-[#1f1f1f]">Віджет прихований за захистом</strong> — звичайні відвідувачі не бачать жучка і не знають про його існування. Активація можлива лише через букмарклет або <code className="bg-white px-[3px] rounded">?bb=on</code>.
        </p>
        <p className="text-[11px] text-[#9a9a9a] leading-relaxed">
          <strong className="text-[#1f1f1f]">API ключ напівпублічний</strong> — він вбудований у клієнтський JS, тому технічно його можна знайти. Але він дозволяє лише <em>надсилати баги</em> в цей проєкт — читати чи видаляти дані через нього неможливо. Сервер обмежує 30 відправок на годину з одного ключа.
        </p>
        <p className="text-[11px] text-[#9a9a9a] leading-relaxed">
          <strong className="text-[#1f1f1f]">Рекомендація</strong> — не використовуй BuggyBag на production-сайтах з публічним трафіком. Він призначений для staging/dev середовищ або внутрішніх інструментів.
        </p>
      </div>
    </div>
  );
}
ll" />

      {/* Uninstall */}
      <div className="border border-[#e9e9e9] rounded-[14px] p-[16px] flex flex-col gap-[10px]">
        <div className="text-[12px] font-bold text-[#1f1f1f]">Видалити інтеграцію</div>
        <p className="text-[11px] text-[#9a9a9a]">Щоб повністю прибрати BuggyBag з проєкту, виконай два кроки:</p>
        <CodeBlock code="npm uninstall buggy-bag" label="1. Видалити пакет" />
        <p className="text-[11px] text-[#9a9a9a]">2. Прибери <code className="bg-[#f4f4f5] px-[3px] rounded text-[#1f1f1f]">&lt;BuggyBag ... /&gt;</code> з кореневого layout.</p>
      </div>

      <div className="bg-[#f9f9f9] border border-[#e9e9e9] rounded-[14px] p-[16px] flex flex-col gap-[8px]">
        <div className="text-[12px] font-bold text-[#1f1f1f]">🔒 Безпека</div>
        <p className="text-[11px] text-[#9a9a9a] leading-relaxed"><strong className="text-[#1f1f1f]">Віджет прихований</strong> — звичайні відвідувачі не бачать жучка. Активація лише через букмарклет або <code className="bg-white px-[3px] rounded">?bb=on</code>.</p>
        <p className="text-[11px] text-[#9a9a9a] leading-relaxed"><strong className="text-[#1f1f1f]">API ключ напівпублічний</strong> — дозволяє лише надсилати баги, не читати дані. Сервер обмежує 30 відправок на годину.</p>
        <p className="text-[11px] text-[#9a9a9a] leading-relaxed"><strong className="text-[#1f1f1f]">Рекомендація</strong> — використовуй на staging/dev, не на production з публічним трафіком.</p>
      </div>
    </div>
  );
}
цей проєкт — читати чи видаляти дані через нього неможливо. Сервер обмежує 30 відправок на годину.
        </p>
        <p className="text-[11px] text-[#9a9a9a] leading-relaxed">
          <strong className="text-[#1f1f1f]">Рекомендація</strong> — використовуй на staging/dev, не на production з публічним трафіком.
        </p>
      </div>
    </div>
  );
}
значений для staging/dev середовищ.
        </p>
      </div>
    </div>
  );
}
тів.
        </p>
      </div>
    </div>
  );
}
