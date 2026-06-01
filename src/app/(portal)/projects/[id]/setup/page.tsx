'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Project } from '@/lib/types';
import Button from '@/components/ui/Button';
import LoadingSpinner from '@/components/ui/Feedback/LoadingSpinner';
import { ArrowLeft, Copy, Check, Terminal } from 'lucide-react';

function CodeBlock({ code, label }: { code: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col gap-[6px]">
      {label && (
        <div className="text-[11px] font-bold text-[#9a9a9a] uppercase tracking-wider">{label}</div>
      )}
      <div className="relative bg-[#1f1f1f] rounded-[12px] overflow-hidden">
        <pre className="text-[12px] font-mono text-[#e5e5e5] p-[16px] overflow-x-auto leading-relaxed whitespace-pre-wrap">
          {code}
        </pre>
        <button
          onClick={handleCopy}
          className="absolute top-[10px] right-[10px] flex items-center gap-[4px] bg-white/10 hover:bg-white/20 text-white/70 hover:text-white text-[10px] font-bold px-[8px] py-[4px] rounded-[6px] transition-colors"
        >
          {copied ? <Check size={11} /> : <Copy size={11} />}
          {copied ? 'Скопійовано' : 'Копіювати'}
        </button>
      </div>
    </div>
  );
}

export default function SetupPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/projects')
      .then(r => r.json())
      .then(data => {
        const found = (data.projects ?? []).find((p: Project) => p.id === id);
        setProject(found ?? null);
      })
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full py-[60px]">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="p-[24px]">
        <p className="text-[13px] text-[#9a9a9a]">Проєкт не знайдено.</p>
      </div>
    );
  }

  const apiEndpoint = 'https://buggy-bag.vercel.app/api/bugs/submit';

  const installSnippet = `npm install github:ArthurMospan/buggy-bag-widget`;

  const usageSnippet = `import { BuggyBag } from 'buggy-bag';

// Add once to your app's root component
<BuggyBag
  apiEndpoint="${apiEndpoint}"
  apiKey="${project.api_key}"
/>`;

  const curlSnippet = `curl -X POST ${apiEndpoint} \\
  -H "Content-Type: application/json" \\
  -d '{
    "api_key": "${project.api_key}",
    "description": "Test bug from curl",
    "annotations": []
  }'`;

  return (
    <div className="p-[24px] flex flex-col gap-[28px] max-w-[780px]">

      {/* Header */}
      <div className="flex items-center gap-[12px]">
        <Button style="ghost" size="icon" icon={ArrowLeft} onClick={() => router.push(`/projects/${id}`)}>
          Назад
        </Button>
        <div>
          <h1 className="text-[22px] font-bold text-[#1f1f1f]">Інтеграція</h1>
          <p className="text-[13px] text-[#9a9a9a] mt-[2px]">{project.name}</p>
        </div>
      </div>

      {/* API Key */}
      <div className="bg-white border border-[#e9e9e9] rounded-[16px] p-[20px] flex flex-col gap-[12px]">
        <h2 className="text-[15px] font-bold text-[#1f1f1f]">API ключ</h2>
        <p className="text-[13px] text-[#9a9a9a]">
          Зберігайте цей ключ у безпечному місці. Він ідентифікує ваш проєкт при надсиланні багів.
        </p>
        <CodeBlock code={project.api_key} label="Your API Key" />
      </div>

      {/* Installation steps */}
      <div className="flex flex-col gap-[20px]">
        <h2 className="text-[15px] font-bold text-[#1f1f1f]">Покрокова інтеграція</h2>

        {/* Step 1 */}
        <div className="flex gap-[16px]">
          <div className="w-[28px] h-[28px] bg-[#1f1f1f] text-white rounded-full flex items-center justify-center text-[12px] font-bold shrink-0 mt-[2px]">
            1
          </div>
          <div className="flex-1 flex flex-col gap-[10px]">
            <div>
              <p className="text-[14px] font-bold text-[#1f1f1f]">Встановіть пакет</p>
              <p className="text-[13px] text-[#9a9a9a] mt-[2px]">Додайте BuggyBag до вашого React-проєкту.</p>
            </div>
            <CodeBlock code={installSnippet} />
          </div>
        </div>

        {/* Step 2 */}
        <div className="flex gap-[16px]">
          <div className="w-[28px] h-[28px] bg-[#1f1f1f] text-white rounded-full flex items-center justify-center text-[12px] font-bold shrink-0 mt-[2px]">
            2
          </div>
          <div className="flex-1 flex flex-col gap-[10px]">
            <div>
              <p className="text-[14px] font-bold text-[#1f1f1f]">Додайте компонент</p>
              <p className="text-[13px] text-[#9a9a9a] mt-[2px]">
                Розмістіть компонент один раз у кореневому файлі вашого додатка (наприклад, <code className="bg-[#f4f4f5] px-[4px] py-[1px] rounded-[4px] text-[11px]">App.tsx</code> або <code className="bg-[#f4f4f5] px-[4px] py-[1px] rounded-[4px] text-[11px]">layout.tsx</code>).
              </p>
            </div>
            <CodeBlock code={usageSnippet} />
          </div>
        </div>

        {/* Step 3 — activate widget */}
        <div className="flex gap-[16px]">
          <div className="w-[28px] h-[28px] bg-[#1f1f1f] text-white rounded-full flex items-center justify-center text-[12px] font-bold shrink-0 mt-[2px]">
            3
          </div>
          <div className="flex-1 flex flex-col gap-[10px]">
            <div>
              <p className="text-[14px] font-bold text-[#1f1f1f]">Активуйте віджет у браузері</p>
              <p className="text-[13px] text-[#9a9a9a] mt-[2px]">
                Віджет прихований для звичайних користувачів. Щоб він з'явився, відкрийте консоль розробника у браузері (F12), виконайте цю команду та оновіть сторінку.
              </p>
            </div>
            <CodeBlock code={`localStorage.setItem('BUGGY_BAG_ACCESS', 'active');`} />
          </div>
        </div>

        {/* Step 4 — test */}
        <div className="flex gap-[16px]">
          <div className="w-[28px] h-[28px] bg-[#f4f4f5] text-[#9a9a9a] rounded-full flex items-center justify-center text-[12px] font-bold shrink-0 mt-[2px]">
            <Terminal size={13} />
          </div>
          <div className="flex-1 flex flex-col gap-[10px]">
            <div>
              <p className="text-[14px] font-bold text-[#1f1f1f]">Протестуйте через curl</p>
              <p className="text-[13px] text-[#9a9a9a] mt-[2px]">
                Перевірте з'єднання без встановлення пакета.
              </p>
            </div>
            <CodeBlock code={curlSnippet} />
          </div>
        </div>
      </div>

    </div>
  );
}
