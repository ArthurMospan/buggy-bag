import React, { forwardRef } from 'react';
// UI Kit Input Component
// Strict rule enforced: All inputs are 36px height (h-9)
// Matches button heights for perfect alignment in forms

export const Input = forwardRef(({
  className = '',
  icon: Icon,
  error,
  ...props
}, ref) => {
  return (
    <div className="relative w-full">
      {Icon && (
        <Icon
          size={14}
          className="absolute left-[12px] top-1/2 -translate-y-1/2 text-[#9a9a9a]"
        />
      )}
      <input
        ref={ref}
        className={`
          h-[36px] w-full bg-[#f4f4f5] border border-[#e9e9e9] rounded-[10px]
          text-[13px] text-[#1f1f1f] focus:border-[#1f1f1f] outline-none
          transition-colors placeholder:text-[#9a9a9a] flex items-center
          disabled:opacity-50 disabled:cursor-not-allowed
          ${Icon ? 'pl-[36px]' : 'pl-[12px]'} pr-[12px]
          ${error ? 'border-red-500/30 focus:border-red-500 bg-[#fff0f0]' : ''}
          ${className}
        `}
        {...props}
      />
    </div>
  );
});
Input.displayName = 'Input';
