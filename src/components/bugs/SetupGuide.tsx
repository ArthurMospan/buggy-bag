'use client';
import { useState } from 'react';
import { Copy, Check, Code2, Terminal, Play, Link as LinkIcon } from 'lucide-react';

function CodeBlock({ code, label }: { code: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div className="flex flex-col gap-[8px]">
      {label && <div className="text-[11px] font-bold text-[#9a9a9a] uppercase tracking-widest">{label}</div>}
      <div className="relative bg-[#ffffff] rounded-[10px] border border-[#e9e9e9] overflow-hidden group shadow-sm">
        <pre className="text-[13px] font-mono text-[#1f1f1f] p-[16px] pr-[110px] overflow-x-auto leading-relaxed whitespace-pre-wrap">{code}</pre>
        <button
          onClick={handleCopy}
          className="absolute top-[12px] right-[12px] flex items-center gap-[6px] bg-[#f4f4f5] border border-[#e9e9e9] text-[#1f1f1f] hover:text-[#000000] hover:bg-[#e9e9e9] text-[12px] font-bold px-[10px] py-[6px] rounded-[8px] transition-all opacity-0 group-hover:opacity-100">
          {copied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
          {copied ? 'Скопійовано' : 'Копіювати'}
        </button>
      </div>
    </div>
  );
}

export default function SetupGuide({ apiKey }: { apiKey: string }) {
  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://your-portal.com';
  const scriptCode = `<!-- Додайте цей скрипт перед </body> -->\n<script\n  src="${origin}/buggy-bag-standalone.js"\n  data-api-key="${apiKey}"\n  data-portal-url="${origin}"\n  async\n></script>`;
  const nextJsCode = `import Script from 'next/script';\n\nexport default function RootLayout({ children }) {\n  return (\n    <html lang="en">\n      <body>\n        {children}\n        <Script\n          src="${origin}/buggy-bag-standalone.js"\n          strategy="afterInteractive"\n          data-api-key="${apiKey}"\n          data-portal-url="${origin}"\n        />\n      </body>\n    </html>\n  );\n}`;
  const bookmarkletCode = `javascript:(function(){localStorage.setItem('BUGGY_BAG_ACCESS','active');location.reload();})();`;

  const [copiedUrl, setCopiedUrl] = useState(false);

  return (
    <div className="flex flex-col gap-[32px] bg-[#f9f9fa] border border-[#e9e9e9] p-[32px] rounded-[16px]">
      <div>
        <h2 className="text-[20px] font-bold text-[#1f1f1f] mb-[8px]">Підключення віджета</h2>
        <p className="text-[14px] text-[#9a9a9a] leading-relaxed">Вставте скрипт на ваш сайт, щоб почати збирати баги.</p>
      </div>
      
      <div className="flex flex-col gap-[24px]">
        <div>
          <h3 className="text-[14px] font-bold text-[#1f1f1f] flex items-center gap-[8px] mb-[12px]">
            <Code2 size={18} className="text-[#4F46E5]" /> Варіант 1: HTML Script (Рекомендовано)
          </h3>
          <CodeBlock code={scriptCode} />
        </div>

        <details className="group bg-[#ffffff] border border-[#e9e9e9] rounded-[10px] overflow-hidden">
          <summary className="flex items-center gap-[8px] p-[16px] cursor-pointer text-[14px] font-bold text-[#1f1f1f] hover:bg-[#f4f4f5] transition-colors list-none">
            <Terminal size={18} className="text-[#1f1f1f]" /> 
            Варіант 2: Next.js (App Router)
            <span className="ml-auto text-[#9a9a9a] group-open:rotate-180 transition-transform">▾</span>
          </summary>
          <div className="flex flex-col gap-[16px] p-[16px] bg-[#f9f9fa] border-t border-[#e9e9e9]">
            <p className="text-[13px] text-[#9a9a9a] leading-relaxed m-0">
              Використовуйте <code className="bg-[#ffffff] border border-[#e9e9e9] px-[6px] py-[2px] rounded text-[#1f1f1f] font-mono text-[11px]">next/script</code> для підключення, щоб завжди отримувати найсвіжіші оновлення віджета.
            </p>
            <CodeBlock code={nextJsCode} label="Додавання у Root Layout" />
          </div>
        </details>

        <div className="bg-[#ffffff] border border-[#e9e9e9] rounded-[10px] p-[20px]">
          <h3 className="text-[14px] font-bold text-[#1f1f1f] flex items-center gap-[8px] mb-[12px]">
            <Play size={18} className="text-[#f59e0b]" /> Як побачити віджет на своєму сайті?
          </h3>
          <p className="text-[13px] text-[#9a9a9a] mb-[20px] leading-relaxed">
            Віджет прихований від звичайних відвідувачів. Щоб він з'явився, ви можете активувати його двома способами:
          </p>
          
          <div className="flex flex-col gap-[16px]">
            <div className="flex items-center gap-[12px]">
              <div className="w-[28px] h-[28px] rounded-full bg-[#f4f4f5] flex items-center justify-center text-[12px] font-bold text-[#1f1f1f] shrink-0">1</div>
              <div className="flex-1">
                <p className="text-[13px] font-medium text-[#1f1f1f] mb-[6px]">Додайте параметр до URL вашого сайту</p>
                <div className="flex items-center gap-[8px]">
                  <code className="text-[13px] font-mono font-bold text-[#4F46E5] bg-[#f0f4ff] px-[10px] py-[6px] rounded-[6px]">?bb=on</code>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText('?bb=on');
                      setCopiedUrl(true);
                      setTimeout(() => setCopiedUrl(false), 2000);
                    }}
                    className="flex items-center gap-[6px] px-[12px] py-[6px] rounded-[6px] bg-[#f4f4f5] hover:bg-[#e9e9e9] text-[#1f1f1f] text-[12px] font-bold transition-colors"
                  >
                    {copiedUrl ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                    Копіювати
                  </button>
                </div>
              </div>
            </div>
            
            <div className="h-px bg-[#e9e9e9]" />
            
            <div className="flex items-center gap-[12px]">
              <div className="w-[28px] h-[28px] rounded-full bg-[#f4f4f5] flex items-center justify-center text-[12px] font-bold text-[#1f1f1f] shrink-0">2</div>
              <div className="flex-1 flex flex-col sm:flex-row sm:items-center justify-between gap-[12px]">
                <p className="text-[13px] font-medium text-[#1f1f1f]">Перетягніть цю кнопку на панель закладок і натискайте її</p>
                <a href={bookmarkletCode} className="inline-flex items-center justify-center gap-[8px] px-[16px] py-[8px] bg-[#1f1f1f] hover:bg-[#303030] text-[#ffffff] text-[12px] font-bold rounded-[8px] transition-colors cursor-grab shrink-0">
                  <LinkIcon size={14} /> BuggyBag Widget
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
