'use client';

import React, { createContext, useContext, useState, useCallback, ReactNode, useRef } from 'react';

type ToastType = 'success' | 'error';

interface ToastOptions {
  message: string;
  type?: ToastType;
}

interface ToastContextType {
  toast: (opts: ToastOptions | string) => void;
  success: (msg: string) => void;
  error: (msg: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toastData, setToastData] = useState<{ msg: string; type: ToastType; id: number } | null>(null);
  const toastIdRef = useRef(0);

  const showToast = useCallback((opts: ToastOptions | string) => {
    const data = typeof opts === 'string' ? { message: opts, type: 'success' as ToastType } : { message: opts.message, type: opts.type || 'success' };
    const id = ++toastIdRef.current;
    setToastData({ msg: data.message, type: data.type, id });
    
    setTimeout(() => {
      setToastData((prev) => (prev?.id === id ? null : prev));
    }, 4000);
  }, []);

  const success = useCallback((msg: string) => showToast({ message: msg, type: 'success' }), [showToast]);
  const error = useCallback((msg: string) => showToast({ message: msg, type: 'error' }), [showToast]);

  return (
    <ToastContext.Provider value={{ toast: showToast, success, error }}>
      {children}
      {toastData && (
        <div data-buggy-bag="true" style={{
          position: 'fixed', bottom: '32px', left: '50%', transform: 'translateX(-50%)',
          zIndex: 9999, display: 'flex', alignItems: 'center', gap: '10px',
          padding: '10px 16px', borderRadius: '12px',
          background: toastData.type === 'success' ? 'rgba(18,22,20,0.96)' : 'rgba(36,18,18,0.96)',
          border: `1px solid ${toastData.type === 'success' ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}`,
          backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
          whiteSpace: 'nowrap',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          animation: 'bbToastSlideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards'
        }}>
          <style>{`
            @keyframes bbToastSlideUp {
              from { opacity: 0; transform: translate(-50%, 16px); }
              to { opacity: 1; transform: translate(-50%, 0); }
            }
          `}</style>
          {toastData.type === 'success' ? (
            <>
              <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: 'rgba(34,197,94,0.15)', border: '1px solid rgba(34,197,94,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
              </div>
              <span style={{ fontSize: '13px', fontWeight: '600', color: 'white' }}>{toastData.msg}</span>
            </>
          ) : (
            <>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              <span style={{ fontSize: '13px', color: '#fca5a5', fontWeight: '600' }}>{toastData.msg}</span>
            </>
          )}
          <button type="button" onClick={() => setToastData(null)}
            style={{ marginLeft: '4px', background: 'transparent', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.35)', fontSize: '13px', display: 'flex', alignItems: 'center', padding: '2px' }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = 'white'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,0.35)'; }}
          >✕</button>
        </div>
      )}
    </ToastContext.Provider>
  );
}

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used within ToastProvider');
  return context;
};
