'use client';
import { ReactNode } from 'react';
import { Bug } from '@/lib/types';

/**
 * Parses tech_context.viewport (e.g. "390x844") and decides whether the
 * screenshot was taken on a narrow/portrait (mobile-shaped) viewport.
 */
function isMobileShaped(bug: Bug): boolean {
  const vp = bug.tech_context?.viewport;
  if (!vp) return false;
  const m = /^(\d+)x(\d+)$/.exec(vp.trim());
  if (!m) return false;
  const width = parseInt(m[1], 10);
  const height = parseInt(m[2], 10);
  if (!width || !height) return false;
  return width < height && width <= 480;
}

interface BugScreenshotProps {
  bug: Bug;
  variant: 'page' | 'modal';
  onClick?: () => void;
  className?: string;
  /**
   * Rendered inside the SAME positioned box as the <img> (pin overlays,
   * expand button, etc). Kept pixel-aligned with the image whether or not
   * the phone-frame mockup is applied below — callers that position children
   * with percentage left/top must keep doing so unchanged.
   */
  children?: ReactNode;
}

/**
 * Renders a bug screenshot, wrapping it in a CSS phone-frame mockup when the
 * captured viewport was mobile-shaped (portrait, <=480px wide) — instead of
 * stretching/squeezing it into a desktop-oriented container.
 *
 * The phone frame is drawn with `outline` (never `border`/`padding`), so it
 * never shifts the image's own box — any percentage-positioned overlay
 * passed as `children` stays exactly aligned with the image either way.
 *
 * Desktop-shaped (or unknown-viewport) screenshots fall through to each
 * caller's original layout, unchanged.
 */
export default function BugScreenshot({ bug, variant, onClick, className, children }: BugScreenshotProps) {
  if (!bug.image_url) return null;
  const mobile = isMobileShaped(bug);

  const img = (
    <img
      src={bug.image_url}
      alt="Screenshot"
      crossOrigin="anonymous"
      className={variant === 'page' ? 'w-full h-auto object-cover block' : 'w-full object-contain max-h-[340px] cursor-zoom-in'}
      onClick={onClick}
    />
  );

  if (!mobile) {
    // Desktop-shaped (or unknown viewport) — preserve each caller's original look exactly.
    const wrapperClass = variant === 'page'
      ? `relative inline-block group w-full ${className ?? ''}`
      : `relative bg-[#f4f4f5] rounded-[12px] overflow-hidden group ${className ?? ''}`;
    return (
      <div className={wrapperClass}>
        {img}
        {children}
      </div>
    );
  }

  // Mobile-shaped — frame in a phone mockup instead of stretching it edge-to-edge.
  const frameWidth = variant === 'page' ? 300 : 220;
  const frame = (
    <div
      className="relative inline-block group"
      style={{
        width: frameWidth,
        borderRadius: 28,
        outline: '6px solid #1c1c1e',
        outlineOffset: '-6px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.18)',
        overflow: 'hidden',
      }}
    >
      {img}
      {children}
    </div>
  );

  if (variant === 'page') {
    // Ancestor (BugDetailView's screenshot container) already flex-centers this.
    return <div className={className}>{frame}</div>;
  }

  return (
    <div className={`flex flex-col items-center gap-[8px] py-[8px] ${className ?? ''}`}>
      {frame}
      <span className="text-[10px] font-semibold text-[#9a9a9a] uppercase tracking-wider">Мобільний екран</span>
    </div>
  );
}
