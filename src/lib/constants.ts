import { BugStatus, BugSeverity } from './types';

export const STATUS_CFG: { value: BugStatus; label: string; color: string; bg: string }[] = [
  { value: 'open',        label: 'Новий',      color: '#ef4444', bg: 'rgba(239,68,68,0.1)' },
  { value: 'in_progress', label: 'В роботі',   color: '#f97316', bg: '#fff7ed' },
  { value: 'resolved',    label: 'Виправлено', color: '#10b981', bg: '#f0fdf4' },
];

export function getSeverityColor(num: number) {
  if (num >= 8) return { color: '#ef4444', bg: 'rgba(239,68,68,0.1)' };
  if (num >= 5) return { color: '#f97316', bg: 'rgba(249,115,22,0.1)' };
  if (num >= 3) return { color: '#fbbf24', bg: 'rgba(251,191,36,0.1)' };
  return { color: '#34d399', bg: 'rgba(52,211,153,0.1)' };
}

export const SEVERITY_CFG: { value: BugSeverity; label: string; color: string; bg: string }[] = Array.from({ length: 10 }, (_, i) => {
  const num = i + 1;
  const { color, bg } = getSeverityColor(num);
  return { value: num.toString(), label: num.toString(), color, bg };
});
