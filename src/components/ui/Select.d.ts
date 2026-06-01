import * as React from 'react';

export interface SelectOption {
  value: string;
  label: string;
  dotColor?: string;
  avatar?: string;
  icon?: React.ComponentType<{ size?: number; className?: string }>;
}

export interface SelectProps {
  value?: string;
  onChange: (value: string) => void;
  options?: SelectOption[];
  placeholder?: string;
  className?: string;
  buttonClassName?: string;
  dropdownClassName?: string;
  disabled?: boolean;
  variant?: 'default' | 'ghost';
  triggerIcon?: React.ComponentType<{ size?: number; className?: string }>;
}

export interface MultiSelectProps {
  value?: string[];
  onChange: (value: string[]) => void;
  options?: SelectOption[];
  placeholder?: string;
  searchPlaceholder?: string;
  className?: string;
  dropdownClassName?: string;
  disabled?: boolean;
  variant?: 'default' | 'ghost';
  triggerIcon?: React.ComponentType<{ size?: number; className?: string }>;
}

export declare function Select(props: SelectProps): React.ReactElement;
export declare function MultiSelect(props: MultiSelectProps): React.ReactElement;
