# BuggyBag Portal Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a closed admin portal for receiving, viewing, and exporting bug reports (screenshots + annotations) submitted via the BuggyBag NPM widget.

**Architecture:** Next.js App Router with a server-side API (`/api/bugs/submit`) that stores uploaded base64 screenshots to Supabase Storage and bug metadata to a Supabase `bugs` table. The frontend is a single-page dashboard with sidebar navigation, a bug grid, detail modal with pin overlay, and an AI prompt generator that formats bugs into copyable structured text.

**Tech Stack:** Next.js 15 (App Router), TypeScript, Tailwind CSS v4, Supabase (Database + Storage), lucide-react

---

## Design System Tokens (reference for all tasks)

These are copied from the qt-workspace UI kit and must be used consistently:

```
Background surfaces: #f4f4f5 (panel), #f0f0f0 (inset), #ffffff (card)
Card border: #e9e9e9
Text: #1f1f1f (primary), #9a9a9a (muted), #cfcfcf (placeholder)
Separator: #f0f0f0
Border radius: rounded-[24px] (dialog), rounded-[16px] (card/panel), rounded-[12px] (nested), rounded-[10px] (input/button), rounded-[8px] (badge)
Label pattern: text-[11px] font-bold text-[#9a9a9a] uppercase tracking-wider
Body text: text-[13px] font-semibold text-[#1f1f1f]
Shadow: shadow-[0_8px_30px_rgba(0,0,0,0.08)]
Status colors: open=#6366f1, in_progress=#f97316, resolved=#10b981, closed=#9a9a9a
```

---

## File Map

```
buggy-bag-portal/
  src/
    app/
      layout.tsx                    — Root HTML shell, loads AppShell
      page.tsx                      — Main dashboard (bugs list page)
      api/
        bugs/
          route.ts                  — GET /api/bugs (list with optional ?project_id= filter)
          submit/
            route.ts                — POST /api/bugs/submit (receive from widget)
    components/
      ui/
        Button.tsx                  — Copied from qt-workspace
        Input.tsx                   — Copied from qt-workspace
        Surface.tsx                 — Copied from qt-workspace
        Card.tsx                    — Copied from qt-workspace (Layout/Card)
        Badge.tsx                   — Copied from qt-workspace (DataDisplay/Badge)
        Table.tsx                   — Copied from qt-workspace (Layout/Table)
        Select.tsx                  — Copied from qt-workspace (simplified)
        Dialog.tsx                  — Copied from qt-workspace
        EmptyState.tsx              — Copied from qt-workspace (Feedback/EmptyState)
        LoadingSpinner.tsx          — Simplified (no design-token dependency)
        index.ts                    — Barrel export
      layout/
        Sidebar.tsx                 — Left sidebar with nav links
        AppShell.tsx                — Full-screen layout: sidebar + content
      bugs/
        BugCard.tsx                 — Card for bug in grid view
        BugDetailModal.tsx          — Full dialog: screenshot + pin overlay + metadata
        PromptGenerator.tsx         — Bug-to-AI-prompt formatter with textarea
    lib/
      supabase.ts                   — Supabase browser + server clients
      types.ts                      — Bug, Annotation, BugStatus TS types
  .env.local                        — Supabase keys (not committed)
  .env.local.example                — Template with key names
  next.config.ts
  package.json
```

---

## Task 1: Initialize Next.js Project

**Files:**
- Create: `package.json`, `next.config.ts`, `tsconfig.json`, `tailwind.config.ts`, `src/app/layout.tsx`, `src/app/page.tsx`
- Create: `.env.local.example`

- [ ] **Step 1: Scaffold Next.js in the existing empty directory**

```bash
# Run from c:\Users\Arthu\QuickTeam\buggy-bag-portal
npx create-next-app@latest . --typescript --tailwind --app --eslint --import-alias "@/*" --yes
```

Expected output: `Success! Created buggy-bag-portal...`

- [ ] **Step 2: Install additional dependencies**

```bash
npm install @supabase/supabase-js lucide-react
```

- [ ] **Step 3: Create .env.local.example**

```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

Copy this to `.env.local` and fill in real values from your Supabase project dashboard.

- [ ] **Step 4: Verify dev server starts**

```bash
npm run dev
```

Expected: Server running at http://localhost:3000 with default Next.js page.

- [ ] **Step 5: Commit**

```bash
git init
git add .
git commit -m "chore: scaffold Next.js project with TypeScript, Tailwind, Supabase"
```

---

## Task 2: Copy & Adapt UI Kit Components

**Files:**
- Create: `src/components/ui/Button.tsx`
- Create: `src/components/ui/Input.tsx`
- Create: `src/components/ui/Surface.tsx`
- Create: `src/components/ui/Card.tsx`
- Create: `src/components/ui/Badge.tsx`
- Create: `src/components/ui/Table.tsx`
- Create: `src/components/ui/Select.tsx`
- Create: `src/components/ui/Dialog.tsx`
- Create: `src/components/ui/EmptyState.tsx`
- Create: `src/components/ui/LoadingSpinner.tsx`
- Create: `src/components/ui/Tabs.tsx`
- Create: `src/components/ui/index.ts`

> **Note:** Alert.jsx and LoadingSpinner.jsx from qt-workspace import from `@/lib/design/tokens` which doesn't exist in this project. Create simplified standalone versions below.

- [ ] **Step 1: Create src/components/ui/Button.tsx**

```tsx
'use client';
import React from 'react';

const SIZES: Record<string, string> = {
  sm:        'h-[28px] px-[12px] text-[12px] rounded-[10px]',
  md:        'h-[32px] px-[16px] text-[13px] rounded-[10px]',
  lg:        'h-[36px] px-[18px] text-[13px] rounded-[10px]',
  icon:      'w-[32px] h-[32px] rounded-[10px] p-0',
  'icon-lg': 'w-[36px] h-[36px] rounded-[10px] p-0',
  'icon-sm': 'w-[28px] h-[28px] rounded-[10px] p-0',
};

const STYLES: Record<string, Record<string, string>> = {
  primary:   { dark: 'bg-[#1f1f1f] text-white hover:bg-[#303030]',                red: 'bg-[#ef4444] text-white hover:bg-[#dc2626]' },
  secondary: { dark: 'bg-[#f5f5f5] text-[#1f1f1f] hover:bg-[#ebebeb]',           red: 'bg-[#f5f5f5] text-[#ef4444] hover:bg-[#ebebeb]' },
  ghost:     { dark: 'bg-transparent text-[#9a9a9a] hover:text-[#1f1f1f] hover:bg-[#f0f0f0]', red: 'bg-transparent text-[#ef4444] hover:bg-[#fee2e2]' },
};

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  style?: 'primary' | 'secondary' | 'ghost';
  color?: 'dark' | 'red';
  size?: 'sm' | 'md' | 'lg' | 'icon' | 'icon-lg' | 'icon-sm';
  icon?: React.ElementType;
  iconSize?: number;
  loading?: boolean;
}

export function Button({
  children, style = 'primary', color = 'dark', size = 'lg',
  icon: Icon, iconSize, disabled = false, loading = false,
  onClick, type = 'button', className = '', ...props
}: ButtonProps) {
  const effectiveColor = color === 'red' ? 'red' : 'dark';
  const base = 'inline-flex items-center justify-center gap-[6px] font-bold leading-none transition-colors focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed shrink-0';
  const sizeClass = SIZES[size] ?? SIZES.lg;
  const styleClass = STYLES[style]?.[effectiveColor] ?? STYLES.primary.dark;
  const defaultIconSize = size === 'lg' ? 16 : size === 'sm' ? 12 : 14;
  const finalIconSize = iconSize ?? defaultIconSize;

  return (
    <button type={type} onClick={onClick} disabled={disabled || loading}
      className={`${base} ${sizeClass} ${styleClass} ${className}`} {...props}>
      {loading ? (
        <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
      ) : (
        <>
          {Icon && <Icon size={finalIconSize} />}
          {children && <span className={size.startsWith('icon') ? 'sr-only' : ''}>{children}</span>}
        </>
      )}
    </button>
  );
}

export default Button;
```

- [ ] **Step 2: Create src/components/ui/Input.tsx**

```tsx
import React, { forwardRef } from 'react';
import { LucideIcon } from 'lucide-react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  icon?: LucideIcon;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(({ className = '', icon: Icon, error, ...props }, ref) => (
  <div className="relative w-full">
    {Icon && <Icon size={14} className="absolute left-[12px] top-1/2 -translate-y-1/2 text-[#9a9a9a]" />}
    <input
      ref={ref}
      className={`h-[36px] w-full bg-[#f4f4f5] border border-transparent rounded-[10px] text-[13px] text-[#1f1f1f] focus:border-[#1f1f1f] outline-none transition-colors placeholder:text-[#a3a3a3] disabled:opacity-50 disabled:cursor-not-allowed ${Icon ? 'pl-[36px]' : 'pl-[12px]'} pr-[12px] ${error ? 'border-red-500 focus:border-red-500 bg-red-50' : ''} ${className}`}
      {...props}
    />
    {error && <p className="mt-1 text-[11px] text-red-500">{error}</p>}
  </div>
));
Input.displayName = 'Input';
```

- [ ] **Step 3: Create src/components/ui/Surface.tsx**

```tsx
'use client';

const VARIANTS: Record<string, string> = {
  panel: 'bg-[#f4f4f5] rounded-[16px]',
  card:  'bg-white rounded-[16px]',
  inset: 'bg-[#f0f0f0] rounded-[16px]',
};

const PADDING: Record<string, string> = {
  none: '', xs: 'p-[8px]', sm: 'p-[12px]', md: 'p-[16px]',
  lg: 'p-[20px]', xl: 'p-[24px]', xxl: 'p-[32px]',
};

interface SurfaceProps {
  variant?: 'panel' | 'card' | 'inset';
  padding?: 'none' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'xxl';
  className?: string;
  children?: React.ReactNode;
}

export default function Surface({ variant = 'panel', padding = 'md', className = '', children }: SurfaceProps) {
  return (
    <div className={`${VARIANTS[variant]} ${PADDING[padding]} ${className}`}>
      {children}
    </div>
  );
}
```

- [ ] **Step 4: Create src/components/ui/Card.tsx**

```tsx
'use client';

interface CardProps {
  children?: React.ReactNode;
  variant?: 'white' | 'gray';
  padding?: 'sm' | 'md' | 'lg' | 'xl';
  interactive?: boolean;
  onClick?: () => void;
  className?: string;
}

export default function Card({ children, variant = 'white', padding = 'md', interactive = false, onClick, className = '' }: CardProps) {
  const variantMap = {
    white: 'bg-[#ffffff] border border-[#e9e9e9]',
    gray:  'bg-[#f4f4f5]',
  };
  const paddingMap = { sm: 'p-[12px]', md: 'p-[16px]', lg: 'p-[20px]', xl: 'p-[24px]' };

  return (
    <div
      onClick={onClick}
      className={`rounded-[16px] ${variantMap[variant]} ${paddingMap[padding]} ${interactive ? 'cursor-pointer hover:bg-[#fcfcfc] hover:border-[#cfcfcf] hover:ring-4 hover:ring-[#1f1f1f]/5 transition-all duration-200' : ''} ${className}`}
    >
      {children}
    </div>
  );
}
```

- [ ] **Step 5: Create src/components/ui/Badge.tsx**

```tsx
'use client';

interface BadgeProps {
  children?: React.ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'error' | 'info';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export default function Badge({ children, variant = 'default', size = 'md', className = '' }: BadgeProps) {
  const variants = {
    default: 'bg-[#1f1f1f]/5 text-[#404040]',
    success: 'bg-[#10b981]/10 text-[#047857]',
    warning: 'bg-[#fbbf24]/10 text-[#b45309]',
    danger:  'bg-[#ef4444]/10 text-[#b91c1c]',
    error:   'bg-[#f97316]/10 text-[#c2410c]',
    info:    'bg-[#6366f1]/10 text-[#4338ca]',
  };
  const sizes = {
    sm: 'px-[8px] py-[2px] rounded-[6px] text-[9px] font-medium',
    md: 'px-[10px] py-[3px] rounded-[6px] text-[11px] font-medium',
    lg: 'px-[12px] py-[4px] rounded-[8px] text-[12px] font-medium',
  };

  return (
    <span className={`inline-flex items-center ${variants[variant]} ${sizes[size]} ${className}`}>
      {children}
    </span>
  );
}
```

- [ ] **Step 6: Create src/components/ui/LoadingSpinner.tsx** (standalone, no token imports)

```tsx
'use client';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizes = {
  sm: { container: 20, stroke: 2 },
  md: { container: 32, stroke: 2.5 },
  lg: { container: 48, stroke: 3 },
};

export default function LoadingSpinner({ size = 'md', className = '' }: LoadingSpinnerProps) {
  const { container, stroke } = sizes[size];
  const r = container / 2 - stroke / 2;
  const circ = 2 * Math.PI * r;

  return (
    <svg width={container} height={container} viewBox={`0 0 ${container} ${container}`}
      className={`animate-spin ${className}`}>
      <circle cx={container / 2} cy={container / 2} r={r} fill="none" stroke="#e9e9e9" strokeWidth={stroke} />
      <circle cx={container / 2} cy={container / 2} r={r} fill="none" stroke="#1f1f1f" strokeWidth={stroke}
        strokeDasharray={circ * 0.25} strokeLinecap="round" />
    </svg>
  );
}
```

- [ ] **Step 7: Create src/components/ui/Dialog.tsx**

Copy content exactly from `c:\Users\Arthu\QuickTeam\qt-workspace\src\components\ui\Dialog.jsx`, rename to `.tsx`, add TypeScript interface:

```tsx
'use client';
import { useEffect, ReactNode } from 'react';
import { X } from 'lucide-react';

interface DialogProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showCloseButton?: boolean;
}

export default function Dialog({ isOpen, onClose, title, children, className = '', size = 'md', showCloseButton = true }: DialogProps) {
  useEffect(() => {
    if (isOpen) document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = 'unset'; };
  }, [isOpen]);

  if (!isOpen) return null;

  const sizeClasses = { sm: 'max-w-[480px]', md: 'max-w-[640px]', lg: 'max-w-[900px]', xl: 'max-w-[1200px]' };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 backdrop-blur-sm pt-12 overflow-y-auto" onClick={onClose}>
      <div className={`bg-white rounded-[24px] shadow-[0_25px_50px_rgba(0,0,0,0.15)] w-full mx-4 ${sizeClasses[size]} ${className}`} onClick={e => e.stopPropagation()}>
        {title && (
          <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-[#f0f0f0] shrink-0">
            <h2 className="text-[18px] font-bold text-[#1f1f1f]">{title}</h2>
            {showCloseButton && (
              <button onClick={onClose} className="p-1 text-[#9a9a9a] hover:text-[#1f1f1f] hover:bg-[#f4f4f5] rounded-[8px] transition-colors">
                <X size={20} />
              </button>
            )}
          </div>
        )}
        <div className="px-6 py-5 overflow-y-auto max-h-[calc(100vh-200px)]">{children}</div>
      </div>
    </div>
  );
}
```

- [ ] **Step 8: Create src/components/ui/EmptyState.tsx**

```tsx
'use client';
import { LucideIcon } from 'lucide-react';
import { Button } from './Button';

interface EmptyStateProps {
  icon?: LucideIcon;
  title?: string;
  description?: string;
  action?: string;
  onAction?: () => void;
  className?: string;
}

export default function EmptyState({ icon: IconComponent, title, description, action, onAction, className = '' }: EmptyStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center text-center py-16 px-6 ${className}`}>
      {IconComponent && (
        <div className="w-[64px] h-[64px] bg-[#f4f4f5] rounded-full flex items-center justify-center mb-[18px] text-[#cfcfcf]">
          <IconComponent size={32} />
        </div>
      )}
      {title && <h4 className="text-[16px] font-bold text-[#1f1f1f] mb-[6px]">{title}</h4>}
      {description && <p className="text-[#9a9a9a] text-[13px] max-w-[280px] px-4 leading-relaxed">{description}</p>}
      {action && onAction && (
        <div className="mt-5">
          <Button style="secondary" size="md" onClick={onAction}>{action}</Button>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 9: Create src/components/ui/Tabs.tsx**

```tsx
'use client';
import { LucideIcon } from 'lucide-react';

interface Tab {
  id: string;
  label?: string;
  icon?: LucideIcon;
}

interface TabsProps {
  tabs: Tab[];
  activeTab: string;
  onTabChange: (id: string) => void;
  className?: string;
}

export default function Tabs({ tabs, activeTab, onTabChange, className = '' }: TabsProps) {
  const iconOnly = tabs.every(t => !t.label);
  return (
    <div className={`inline-flex items-center bg-[#f4f4f5] rounded-[10px] p-[3px] gap-[2px] ${className}`}>
      {tabs.map(tab => {
        const Icon = tab.icon;
        const isActive = tab.id === activeTab;
        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`inline-flex items-center justify-center gap-[5px] rounded-[8px] transition-all font-bold text-[13px] ${iconOnly ? 'w-[28px] h-[28px]' : 'h-[30px] px-[12px]'} ${isActive ? 'bg-white shadow-sm text-[#1f1f1f]' : 'text-[#9a9a9a] hover:text-[#1f1f1f]'}`}
          >
            {Icon && <Icon size={14} />}
            {tab.label && <span>{tab.label}</span>}
          </button>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 10: Create src/components/ui/Select.tsx**

```tsx
'use client';
import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';

export interface SelectOption {
  value: string;
  label: string;
  dotColor?: string;
}

interface SelectProps {
  value: string;
  onChange: (v: string) => void;
  options: SelectOption[];
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export function Select({ value, onChange, options, placeholder = 'Оберіть...', className = '', disabled = false }: SelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setIsOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const selected = options.find(o => o.value === value);

  return (
    <div className={`relative ${className}`} ref={ref}>
      <button type="button" disabled={disabled} onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between gap-[8px] bg-[#f4f4f5] hover:bg-[#ebebeb] rounded-[10px] px-[12px] h-[36px] text-[13px] font-medium text-[#1f1f1f] transition-colors focus:outline-none disabled:opacity-50">
        <div className="flex items-center gap-[8px]">
          {selected?.dotColor && <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: selected.dotColor }} />}
          <span>{selected ? selected.label : <span className="text-[#a3a3a3]">{placeholder}</span>}</span>
        </div>
        <ChevronDown size={14} className={`text-[#9a9a9a] shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      {isOpen && (
        <div className="absolute z-50 top-full mt-[4px] min-w-full w-max max-w-[300px] bg-white border border-[#f0f0f0] rounded-[12px] shadow-[0_8px_30px_rgba(0,0,0,0.08)] py-[6px]">
          {options.map(opt => (
            <button key={opt.value} type="button" onClick={() => { onChange(opt.value); setIsOpen(false); }}
              className={`w-full flex items-center justify-between px-[12px] h-[36px] text-[13px] hover:bg-[#f4f4f5] transition-colors ${value === opt.value ? 'bg-[#f4f4f5] font-bold' : 'font-medium'}`}>
              <div className="flex items-center gap-[8px]">
                {opt.dotColor && <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: opt.dotColor }} />}
                <span>{opt.label}</span>
              </div>
              {value === opt.value && <Check size={12} className="text-[#1f1f1f]" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 11: Create src/components/ui/index.ts**

```ts
export { default as Button, Button as ButtonComponent } from './Button';
export { Input } from './Input';
export { default as Surface } from './Surface';
export { default as Card } from './Card';
export { default as Badge } from './Badge';
export { default as Dialog } from './Dialog';
export { default as EmptyState } from './EmptyState';
export { default as LoadingSpinner } from './LoadingSpinner';
export { default as Tabs } from './Tabs';
export { Select } from './Select';
export { default as Table } from './Table';
```

- [ ] **Step 12: Copy Table.tsx**

Copy `c:\Users\Arthu\QuickTeam\qt-workspace\src\components\ui\Layout\Table.jsx` to `src/components/ui/Table.tsx`. Change `useState` import to TypeScript and add `'use client';` at top. No other changes needed.

- [ ] **Step 13: Commit**

```bash
git add src/components/ui
git commit -m "feat: add UI kit components copied from qt-workspace"
```

---

## Task 3: TypeScript Types

**Files:**
- Create: `src/lib/types.ts`

- [ ] **Step 1: Create src/lib/types.ts**

```ts
export type BugStatus = 'open' | 'in_progress' | 'resolved' | 'closed';

export interface Annotation {
  x: number;       // percentage 0-100 of image width
  y: number;       // percentage 0-100 of image height
  text: string;    // pin label/description
  index?: number;  // display number on pin
}

export interface Bug {
  id: string;
  project_id: string;
  image_url: string | null;
  json_annotations: Annotation[];
  status: BugStatus;
  description: string | null;
  created_at: string; // ISO 8601
}

// Payload that the NPM widget POSTs to /api/bugs/submit
export interface SubmitBugPayload {
  project_id: string;
  base64_image: string;        // "data:image/png;base64,..."
  annotations: Annotation[];
  description?: string;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/types.ts
git commit -m "feat: add TypeScript types for Bug, Annotation, SubmitBugPayload"
```

---

## Task 4: Supabase SQL Setup + Client

**Files:**
- Create: `src/lib/supabase.ts`

### SQL to run in Supabase SQL Editor

> Copy and run this in your Supabase project → SQL Editor → New Query

```sql
-- 1. Create bugs table
create table public.bugs (
  id              uuid default gen_random_uuid() primary key,
  project_id      text not null,
  image_url       text,
  json_annotations jsonb not null default '[]'::jsonb,
  status          text not null default 'open',
  description     text,
  created_at      timestamptz default now() not null
);

-- 2. Index for fast filtering by project
create index bugs_project_id_idx on public.bugs (project_id);
create index bugs_status_idx on public.bugs (status);
create index bugs_created_at_idx on public.bugs (created_at desc);

-- 3. Enable Row Level Security
alter table public.bugs enable row level security;

-- 4. Policy: service_role bypasses RLS by default.
--    For anon/authenticated: allow reading all bugs (portal is internal)
create policy "Allow public read" on public.bugs
  for select using (true);

-- 5. Storage bucket for screenshots
insert into storage.buckets (id, name, public)
values ('bug-screenshots', 'bug-screenshots', true)
on conflict (id) do nothing;

-- 6. Storage policy: allow upload via service_role (API route will use it)
create policy "Allow service upload" on storage.objects
  for insert with check (bucket_id = 'bug-screenshots');

create policy "Allow public read screenshots" on storage.objects
  for select using (bucket_id = 'bug-screenshots');
```

- [ ] **Step 1: Run the SQL above in Supabase dashboard**

Navigate to: Project → SQL Editor → New query → paste and run.

Expected: Table `public.bugs` created, bucket `bug-screenshots` created.

- [ ] **Step 2: Add Supabase credentials to .env.local**

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

Find these in: Supabase dashboard → Settings → API.

- [ ] **Step 3: Create src/lib/supabase.ts**

```ts
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Browser client — for client components and pages
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Server client with service role — for API routes that write data
export function createServerClient() {
  return createClient(supabaseUrl, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
```

- [ ] **Step 4: Commit**

```bash
git add src/lib/supabase.ts .env.local.example
git commit -m "feat: add Supabase client with browser and server-role instances"
```

---

## Task 5: API Route — POST /api/bugs/submit

**Files:**
- Create: `src/app/api/bugs/submit/route.ts`

This endpoint receives bug data from the NPM widget: `{ project_id, base64_image, annotations, description }`. It uploads the image to Supabase Storage and inserts a row to the `bugs` table.

- [ ] **Step 1: Create src/app/api/bugs/submit/route.ts**

```ts
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { SubmitBugPayload } from '@/lib/types';

export async function POST(req: NextRequest) {
  try {
    const body: SubmitBugPayload = await req.json();
    const { project_id, base64_image, annotations = [], description } = body;

    if (!project_id) {
      return NextResponse.json({ error: 'project_id is required' }, { status: 400 });
    }

    const supabase = createServerClient();
    let image_url: string | null = null;

    // Upload image if provided
    if (base64_image) {
      // Strip data URL prefix: "data:image/png;base64,<data>"
      const matches = base64_image.match(/^data:(.+);base64,(.+)$/);
      if (!matches) {
        return NextResponse.json({ error: 'Invalid base64_image format' }, { status: 400 });
      }
      const mimeType = matches[1];
      const base64Data = matches[2];
      const ext = mimeType.split('/')[1] ?? 'png';
      const fileName = `${project_id}/${Date.now()}.${ext}`;

      // Decode base64 to Uint8Array
      const binaryString = atob(base64Data);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('bug-screenshots')
        .upload(fileName, bytes, { contentType: mimeType, upsert: false });

      if (uploadError) {
        return NextResponse.json({ error: uploadError.message }, { status: 500 });
      }

      const { data: { publicUrl } } = supabase.storage
        .from('bug-screenshots')
        .getPublicUrl(uploadData.path);

      image_url = publicUrl;
    }

    // Insert bug record
    const { data, error } = await supabase
      .from('bugs')
      .insert({ project_id, image_url, json_annotations: annotations, description: description ?? null })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, bug: data }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Allow cross-origin requests from widget domains
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
```

- [ ] **Step 2: Add CORS headers middleware**

Create `src/middleware.ts` to add CORS to all `/api/bugs/submit` responses:

```ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(req: NextRequest) {
  const response = NextResponse.next();
  if (req.nextUrl.pathname.startsWith('/api/bugs/submit')) {
    response.headers.set('Access-Control-Allow-Origin', '*');
    response.headers.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type');
  }
  return response;
}

export const config = { matcher: '/api/:path*' };
```

- [ ] **Step 3: Test the endpoint manually**

With `npm run dev` running, send a test POST:

```bash
curl -X POST http://localhost:3000/api/bugs/submit \
  -H "Content-Type: application/json" \
  -d '{"project_id":"test-project","base64_image":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==","annotations":[{"x":50,"y":50,"text":"Test bug","index":1}],"description":"This is a test bug"}'
```

Expected response: `{"success":true,"bug":{"id":"...","project_id":"test-project",...}}`

- [ ] **Step 4: Commit**

```bash
git add src/app/api/bugs/submit/route.ts src/middleware.ts
git commit -m "feat: add POST /api/bugs/submit endpoint with Supabase Storage upload"
```

---

## Task 6: API Route — GET /api/bugs

**Files:**
- Create: `src/app/api/bugs/route.ts`

- [ ] **Step 1: Create src/app/api/bugs/route.ts**

```ts
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const project_id = searchParams.get('project_id');
    const status = searchParams.get('status');

    const supabase = createServerClient();

    let query = supabase
      .from('bugs')
      .select('*')
      .order('created_at', { ascending: false });

    if (project_id) query = query.eq('project_id', project_id);
    if (status) query = query.eq('status', status);

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ bugs: data });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { id, status } = await req.json();
    if (!id || !status) {
      return NextResponse.json({ error: 'id and status are required' }, { status: 400 });
    }

    const supabase = createServerClient();
    const { data, error } = await supabase
      .from('bugs')
      .update({ status })
      .eq('id', id)
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ bug: data });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

- [ ] **Step 2: Test GET**

```bash
curl http://localhost:3000/api/bugs
```

Expected: `{"bugs":[...]}` (empty array initially)

- [ ] **Step 3: Commit**

```bash
git add src/app/api/bugs/route.ts
git commit -m "feat: add GET /api/bugs and PATCH status update endpoints"
```

---

## Task 7: App Layout — Sidebar + Shell

**Files:**
- Create: `src/components/layout/Sidebar.tsx`
- Create: `src/components/layout/AppShell.tsx`
- Modify: `src/app/layout.tsx`

- [ ] **Step 1: Create src/components/layout/Sidebar.tsx**

```tsx
'use client';
import { Bug, Settings, LayoutDashboard } from 'lucide-react';

const NAV = [
  { href: '/', icon: LayoutDashboard, label: 'Дашборд' },
];

export default function Sidebar() {
  return (
    <aside className="w-[220px] shrink-0 h-full bg-[#f4f4f5] flex flex-col py-[16px] px-[12px] gap-[4px]">
      {/* Logo */}
      <div className="flex items-center gap-[10px] px-[12px] py-[10px] mb-[12px]">
        <div className="w-[28px] h-[28px] bg-[#1f1f1f] rounded-[8px] flex items-center justify-center">
          <Bug size={14} className="text-white" />
        </div>
        <span className="text-[14px] font-bold text-[#1f1f1f]">BuggyBag</span>
      </div>

      {/* Nav */}
      {NAV.map(({ href, icon: Icon, label }) => (
        <a
          key={href}
          href={href}
          className="flex items-center gap-[10px] px-[12px] py-[9px] rounded-[10px] text-[13px] font-semibold text-[#9a9a9a] hover:text-[#1f1f1f] hover:bg-[#ebebeb] transition-colors"
        >
          <Icon size={15} />
          {label}
        </a>
      ))}
    </aside>
  );
}
```

- [ ] **Step 2: Create src/components/layout/AppShell.tsx**

```tsx
'use client';
import Sidebar from './Sidebar';

export default function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="h-screen flex overflow-hidden bg-white">
      <Sidebar />
      <main className="flex-1 overflow-auto bg-[#f8f8f8]">
        {children}
      </main>
    </div>
  );
}
```

- [ ] **Step 3: Update src/app/layout.tsx**

```tsx
import type { Metadata } from 'next';
import { Geist } from 'next/font/google';
import './globals.css';
import AppShell from '@/components/layout/AppShell';

const geist = Geist({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'BuggyBag Portal',
  description: 'Bug reports admin dashboard',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="uk">
      <body className={geist.className}>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
```

- [ ] **Step 4: Verify layout renders**

```bash
npm run dev
```

Open http://localhost:3000 — should see sidebar on left + content area on right.

- [ ] **Step 5: Commit**

```bash
git add src/components/layout src/app/layout.tsx
git commit -m "feat: add app shell with sidebar layout"
```

---

## Task 8: Bug Card + Detail Modal

**Files:**
- Create: `src/components/bugs/BugCard.tsx`
- Create: `src/components/bugs/BugDetailModal.tsx`

- [ ] **Step 1: Create src/components/bugs/BugCard.tsx**

```tsx
'use client';
import { Bug as BugType, BugStatus } from '@/lib/types';
import Badge from '@/components/ui/Badge';
import { formatDistanceToNow } from 'date-fns';

const STATUS_CONFIG: Record<BugStatus, { label: string; variant: 'info' | 'warning' | 'success' | 'default'; dot: string }> = {
  open:        { label: 'Open',        variant: 'info',    dot: '#6366f1' },
  in_progress: { label: 'In Progress', variant: 'warning', dot: '#f97316' },
  resolved:    { label: 'Resolved',    variant: 'success', dot: '#10b981' },
  closed:      { label: 'Closed',      variant: 'default', dot: '#9a9a9a' },
};

interface BugCardProps {
  bug: BugType;
  onClick: () => void;
}

export default function BugCard({ bug, onClick }: BugCardProps) {
  const cfg = STATUS_CONFIG[bug.status] ?? STATUS_CONFIG.open;
  const pinCount = bug.json_annotations?.length ?? 0;
  const timeAgo = formatDistanceToNow(new Date(bug.created_at), { addSuffix: true });

  return (
    <div
      onClick={onClick}
      className="bg-white border border-[#e9e9e9] rounded-[16px] overflow-hidden cursor-pointer hover:border-[#cfcfcf] hover:ring-4 hover:ring-[#1f1f1f]/5 transition-all duration-200"
    >
      {/* Screenshot thumbnail */}
      <div className="w-full h-[160px] bg-[#f4f4f5] overflow-hidden relative">
        {bug.image_url ? (
          <img src={bug.image_url} alt="Bug screenshot" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-[#cfcfcf]">
            <span className="text-[12px] font-semibold">Без скріншота</span>
          </div>
        )}
        {/* Pin count overlay */}
        {pinCount > 0 && (
          <div className="absolute top-[8px] right-[8px] bg-black/60 text-white text-[10px] font-bold px-[8px] py-[3px] rounded-full">
            {pinCount} пін{pinCount === 1 ? '' : 'и'}
          </div>
        )}
      </div>

      {/* Card body */}
      <div className="p-[14px] flex flex-col gap-[8px]">
        <div className="flex items-center justify-between">
          <Badge variant={cfg.variant} size="sm">{cfg.label}</Badge>
          <span className="text-[10px] font-semibold text-[#cfcfcf]">{timeAgo}</span>
        </div>

        <div>
          <div className="text-[11px] font-bold text-[#9a9a9a] uppercase tracking-wider mb-[2px]">{bug.project_id}</div>
          {bug.description && (
            <p className="text-[12px] text-[#1f1f1f] font-semibold line-clamp-2 leading-relaxed">{bug.description}</p>
          )}
        </div>
      </div>
    </div>
  );
}
```

> Note: Install date-fns: `npm install date-fns`

- [ ] **Step 2: Create src/components/bugs/BugDetailModal.tsx**

```tsx
'use client';
import { useState } from 'react';
import { Bug as BugType, BugStatus, Annotation } from '@/lib/types';
import Dialog from '@/components/ui/Dialog';
import Badge from '@/components/ui/Badge';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { format } from 'date-fns';

const STATUS_OPTIONS = [
  { value: 'open',        label: 'Open',        dotColor: '#6366f1' },
  { value: 'in_progress', label: 'In Progress',  dotColor: '#f97316' },
  { value: 'resolved',    label: 'Resolved',     dotColor: '#10b981' },
  { value: 'closed',      label: 'Closed',       dotColor: '#9a9a9a' },
];

interface BugDetailModalProps {
  bug: BugType | null;
  onClose: () => void;
  onStatusChange: (id: string, status: BugStatus) => void;
}

function PinOverlay({ annotations }: { annotations: Annotation[] }) {
  const [hovered, setHovered] = useState<number | null>(null);
  return (
    <>
      {annotations.map((ann, i) => (
        <div
          key={i}
          className="absolute"
          style={{ left: `${ann.x}%`, top: `${ann.y}%`, transform: 'translate(-50%, -50%)' }}
          onMouseEnter={() => setHovered(i)}
          onMouseLeave={() => setHovered(null)}
        >
          <div className="w-[22px] h-[22px] bg-[#ef4444] text-white rounded-full flex items-center justify-center text-[10px] font-bold shadow-lg cursor-pointer border-2 border-white">
            {ann.index ?? i + 1}
          </div>
          {hovered === i && ann.text && (
            <div className="absolute bottom-[28px] left-1/2 -translate-x-1/2 bg-[#1f1f1f] text-white text-[11px] font-semibold px-[10px] py-[6px] rounded-[8px] whitespace-nowrap shadow-lg z-10 max-w-[200px] text-center">
              {ann.text}
              <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-[#1f1f1f]" />
            </div>
          )}
        </div>
      ))}
    </>
  );
}

export default function BugDetailModal({ bug, onClose, onStatusChange }: BugDetailModalProps) {
  const [status, setStatus] = useState<BugStatus>(bug?.status ?? 'open');
  const [saving, setSaving] = useState(false);

  if (!bug) return null;

  const handleStatusSave = async () => {
    setSaving(true);
    await onStatusChange(bug.id, status);
    setSaving(false);
  };

  return (
    <Dialog isOpen={!!bug} onClose={onClose} title="Деталі баг-репорту" size="lg">
      <div className="flex flex-col gap-[20px]">

        {/* Screenshot with pins */}
        {bug.image_url && (
          <div className="relative bg-[#f4f4f5] rounded-[12px] overflow-hidden">
            <img src={bug.image_url} alt="Screenshot" className="w-full object-contain max-h-[400px]" />
            {bug.json_annotations?.length > 0 && (
              <div className="absolute inset-0">
                <PinOverlay annotations={bug.json_annotations} />
              </div>
            )}
          </div>
        )}

        {/* Metadata */}
        <div className="grid grid-cols-2 gap-[12px]">
          <div className="bg-[#f4f4f5] rounded-[12px] p-[14px]">
            <div className="text-[10px] font-bold text-[#9a9a9a] uppercase tracking-wider mb-[4px]">Проєкт</div>
            <div className="text-[14px] font-bold text-[#1f1f1f]">{bug.project_id}</div>
          </div>
          <div className="bg-[#f4f4f5] rounded-[12px] p-[14px]">
            <div className="text-[10px] font-bold text-[#9a9a9a] uppercase tracking-wider mb-[4px]">Дата</div>
            <div className="text-[14px] font-bold text-[#1f1f1f]">{format(new Date(bug.created_at), 'dd.MM.yyyy HH:mm')}</div>
          </div>
        </div>

        {/* Description */}
        {bug.description && (
          <div>
            <div className="text-[11px] font-bold text-[#9a9a9a] uppercase tracking-wider mb-[6px]">Опис</div>
            <p className="text-[13px] text-[#1f1f1f] leading-relaxed bg-[#f4f4f5] rounded-[12px] p-[14px]">{bug.description}</p>
          </div>
        )}

        {/* Annotations list */}
        {bug.json_annotations?.length > 0 && (
          <div>
            <div className="text-[11px] font-bold text-[#9a9a9a] uppercase tracking-wider mb-[8px]">Піни ({bug.json_annotations.length})</div>
            <div className="flex flex-col gap-[6px]">
              {bug.json_annotations.map((ann, i) => (
                <div key={i} className="flex items-start gap-[10px] bg-[#f4f4f5] rounded-[10px] px-[12px] py-[10px]">
                  <div className="w-[20px] h-[20px] bg-[#ef4444] text-white rounded-full flex items-center justify-center text-[9px] font-bold shrink-0 mt-[1px]">
                    {ann.index ?? i + 1}
                  </div>
                  <span className="text-[13px] text-[#1f1f1f] font-semibold">{ann.text}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Status changer */}
        <div className="flex items-end gap-[10px] pt-[4px] border-t border-[#f0f0f0]">
          <div className="flex-1">
            <div className="text-[11px] font-bold text-[#9a9a9a] uppercase tracking-wider mb-[6px]">Статус</div>
            <Select value={status} onChange={v => setStatus(v as BugStatus)} options={STATUS_OPTIONS} />
          </div>
          <Button style="primary" size="lg" loading={saving} onClick={handleStatusSave}>
            Зберегти
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
```

- [ ] **Step 3: Install date-fns**

```bash
npm install date-fns
```

- [ ] **Step 4: Commit**

```bash
git add src/components/bugs
git commit -m "feat: add BugCard grid component and BugDetailModal with pin overlay"
```

---

## Task 9: AI Prompt Generator

**Files:**
- Create: `src/components/bugs/PromptGenerator.tsx`

- [ ] **Step 1: Create src/components/bugs/PromptGenerator.tsx**

```tsx
'use client';
import { useState } from 'react';
import { Bug } from '@/lib/types';
import { Button } from '@/components/ui/Button';
import { Sparkles, Copy, Check } from 'lucide-react';
import Dialog from '@/components/ui/Dialog';

interface PromptGeneratorProps {
  bugs: Bug[];
}

function formatBugsToPrompt(bugs: Bug[]): string {
  const lines: string[] = [
    '# Bug Report Summary',
    `Generated: ${new Date().toLocaleString('uk-UA')}`,
    `Total bugs: ${bugs.length}`,
    '',
  ];

  bugs.forEach((bug, i) => {
    lines.push(`---`);
    lines.push(`## Bug #${i + 1}`);
    lines.push(`Project: ${bug.project_id}`);
    lines.push(`Status: ${bug.status}`);
    lines.push(`Date: ${new Date(bug.created_at).toLocaleString('uk-UA')}`);

    if (bug.description) {
      lines.push(`Description: ${bug.description}`);
    }

    if (bug.image_url) {
      lines.push(`Screenshot: ${bug.image_url}`);
    }

    if (bug.json_annotations?.length > 0) {
      lines.push(`Annotations (${bug.json_annotations.length}):`);
      bug.json_annotations.forEach((ann, j) => {
        lines.push(`  ${ann.index ?? j + 1}. ${ann.text} (x:${ann.x.toFixed(1)}%, y:${ann.y.toFixed(1)}%)`);
      });
    }

    lines.push('');
  });

  return lines.join('\n');
}

export default function PromptGenerator({ bugs }: PromptGeneratorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const activeBugs = bugs.filter(b => b.status === 'open' || b.status === 'in_progress');
  const prompt = formatBugsToPrompt(activeBugs);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(prompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <>
      <Button style="secondary" size="lg" icon={Sparkles} onClick={() => setIsOpen(true)}>
        AI Баг-репорт
      </Button>

      <Dialog isOpen={isOpen} onClose={() => setIsOpen(false)} title="AI Prompt Generator" size="lg">
        <div className="flex flex-col gap-[16px]">
          <p className="text-[13px] text-[#9a9a9a]">
            Зібрано <strong className="text-[#1f1f1f]">{activeBugs.length}</strong> активних багів (open + in_progress). Скопіюйте текст нижче і вставте в AI-помічника.
          </p>

          <textarea
            readOnly
            value={prompt}
            rows={16}
            className="w-full bg-[#f4f4f5] border border-transparent rounded-[12px] text-[12px] font-mono text-[#1f1f1f] p-[14px] focus:outline-none resize-none leading-relaxed"
          />

          <div className="flex gap-[8px]">
            <Button style="primary" size="lg" icon={copied ? Check : Copy} onClick={handleCopy} className="flex-1">
              {copied ? 'Скопійовано!' : 'Копіювати'}
            </Button>
            <Button style="secondary" size="lg" onClick={() => setIsOpen(false)}>
              Закрити
            </Button>
          </div>
        </div>
      </Dialog>
    </>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/bugs/PromptGenerator.tsx
git commit -m "feat: add AI prompt generator that formats active bugs to copyable text"
```

---

## Task 10: Dashboard Page (main page.tsx)

**Files:**
- Modify: `src/app/page.tsx`
- Modify: `src/app/globals.css` — remove Next.js default styles, keep Tailwind directives

- [ ] **Step 1: Clean up src/app/globals.css**

Replace entire content with:

```css
@import "tailwindcss";
```

- [ ] **Step 2: Write src/app/page.tsx**

```tsx
'use client';
import { useEffect, useState, useCallback } from 'react';
import { Bug, BugStatus } from '@/lib/types';
import BugCard from '@/components/bugs/BugCard';
import BugDetailModal from '@/components/bugs/BugDetailModal';
import PromptGenerator from '@/components/bugs/PromptGenerator';
import EmptyState from '@/components/ui/EmptyState';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { Select } from '@/components/ui/Select';
import { Bug as BugIcon, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/Button';

const STATUS_FILTER_OPTIONS = [
  { value: '',           label: 'Всі статуси' },
  { value: 'open',       label: 'Open',        dotColor: '#6366f1' },
  { value: 'in_progress',label: 'In Progress', dotColor: '#f97316' },
  { value: 'resolved',   label: 'Resolved',    dotColor: '#10b981' },
  { value: 'closed',     label: 'Closed',      dotColor: '#9a9a9a' },
];

export default function DashboardPage() {
  const [bugs, setBugs] = useState<Bug[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedBug, setSelectedBug] = useState<Bug | null>(null);

  const fetchBugs = useCallback(async () => {
    setLoading(true);
    const qs = statusFilter ? `?status=${statusFilter}` : '';
    const res = await fetch(`/api/bugs${qs}`);
    const data = await res.json();
    setBugs(data.bugs ?? []);
    setLoading(false);
  }, [statusFilter]);

  useEffect(() => { fetchBugs(); }, [fetchBugs]);

  const handleStatusChange = async (id: string, status: BugStatus) => {
    const res = await fetch('/api/bugs', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status }),
    });
    if (res.ok) {
      setBugs(prev => prev.map(b => b.id === id ? { ...b, status } : b));
      setSelectedBug(prev => prev?.id === id ? { ...prev, status } : prev);
    }
  };

  // Stats
  const openCount = bugs.filter(b => b.status === 'open').length;
  const inProgressCount = bugs.filter(b => b.status === 'in_progress').length;

  return (
    <div className="p-[24px] flex flex-col gap-[24px] min-h-full">

      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[22px] font-bold text-[#1f1f1f]">Баг-репорти</h1>
          <p className="text-[13px] text-[#9a9a9a] mt-[2px]">
            {openCount} відкритих · {inProgressCount} в роботі
          </p>
        </div>
        <div className="flex items-center gap-[8px]">
          <PromptGenerator bugs={bugs} />
          <Button style="ghost" size="icon-lg" icon={RefreshCw} onClick={fetchBugs}>Refresh</Button>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-4 gap-[12px]">
        {[
          { label: 'Всього',      value: bugs.length,                         color: '#1f1f1f' },
          { label: 'Open',        value: openCount,                           color: '#6366f1' },
          { label: 'In Progress', value: inProgressCount,                    color: '#f97316' },
          { label: 'Resolved',    value: bugs.filter(b=>b.status==='resolved').length, color: '#10b981' },
        ].map(stat => (
          <div key={stat.label} className="bg-white border border-[#e9e9e9] rounded-[16px] p-[16px]">
            <div className="text-[11px] font-bold text-[#9a9a9a] uppercase tracking-wider">{stat.label}</div>
            <div className="text-[28px] font-bold mt-[4px]" style={{ color: stat.color }}>{stat.value}</div>
          </div>
        ))}
      </div>

      {/* Filter bar */}
      <div className="flex items-center gap-[10px]">
        <div className="w-[180px]">
          <Select value={statusFilter} onChange={setStatusFilter} options={STATUS_FILTER_OPTIONS} />
        </div>
      </div>

      {/* Bug grid */}
      {loading ? (
        <div className="flex items-center justify-center py-[60px]">
          <LoadingSpinner size="lg" />
        </div>
      ) : bugs.length === 0 ? (
        <EmptyState
          icon={BugIcon}
          title="Багів поки немає"
          description="Коли ваш NPM-віджет надішле перший баг, він з'явиться тут."
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-[16px]">
          {bugs.map(bug => (
            <BugCard key={bug.id} bug={bug} onClick={() => setSelectedBug(bug)} />
          ))}
        </div>
      )}

      {/* Detail modal */}
      <BugDetailModal
        bug={selectedBug}
        onClose={() => setSelectedBug(null)}
        onStatusChange={handleStatusChange}
      />
    </div>
  );
}
```

- [ ] **Step 3: Verify full app in browser**

```bash
npm run dev
```

Open http://localhost:3000. Should see:
- Sidebar with BuggyBag logo
- Dashboard title + stats (zeros)
- Empty state with bug icon
- "AI Баг-репорт" button in header

- [ ] **Step 4: Send a test bug from curl and reload**

```bash
curl -X POST http://localhost:3000/api/bugs/submit \
  -H "Content-Type: application/json" \
  -d "{\"project_id\":\"my-website\",\"base64_image\":\"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==\",\"annotations\":[{\"x\":50,\"y\":30,\"text\":\"Кнопка не клікається\",\"index\":1}],\"description\":\"Кнопка Submit не реагує на клік в Safari\"}"
```

Reload dashboard — bug card should appear.

- [ ] **Step 5: Test AI Prompt Generator**

Click "AI Баг-репорт" button. Modal should show formatted text with bug details. Copy button should work.

- [ ] **Step 6: Test detail modal**

Click on a bug card. Modal should open with screenshot (1px test image), annotations list, status selector. Change status and click "Зберегти" — status badge on card should update.

- [ ] **Step 7: Commit**

```bash
git add src/app/page.tsx src/app/globals.css
git commit -m "feat: complete dashboard with bug grid, stats, filters, detail modal, AI prompt generator"
```

---

## Self-Review

### Spec Coverage Check

| Requirement | Task |
|---|---|
| Next.js App Router + TypeScript + Tailwind + Supabase | Task 1 |
| Copy UI kit from qt-workspace | Task 2 |
| SQL table `bugs` with id, project_id, image_url, json_annotations, status | Task 4 |
| Supabase Storage bucket for screenshots | Task 4 |
| POST `/api/bugs/submit` (base64 + pins → Supabase) | Task 5 |
| Dashboard with all bugs from DB | Task 10 |
| AI Prompt Generator with textarea for copying | Task 9 |
| Bug detail with image + annotations overlay | Task 8 |
| Status update from portal | Task 8 + 6 |

All requirements covered. ✓

### Placeholder Scan

No TBD, no TODO, no "similar to task N" patterns. All code blocks are complete. ✓

### Type Consistency

- `Bug`, `BugStatus`, `Annotation`, `SubmitBugPayload` defined in Task 3 and used consistently in Tasks 5, 6, 8, 9, 10. ✓
- `STATUS_OPTIONS` values match `BugStatus` union type. ✓
- `Select` component `value/onChange` signatures match usage in Tasks 8 and 10. ✓
