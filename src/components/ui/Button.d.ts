import * as React from 'react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children?: React.ReactNode;
  style?: 'primary' | 'secondary' | 'outline' | 'ghost';
  color?: 'dark' | 'red';
  size?: 'sm' | 'md' | 'lg' | 'icon' | 'icon-lg' | 'icon-sm';
  icon?: React.ComponentType<{ size?: number; className?: string }>;
  iconSize?: number;
  disabled?: boolean;
  loading?: boolean;
  onClick?: React.MouseEventHandler<HTMLButtonElement>;
  type?: 'button' | 'submit' | 'reset';
  className?: string;
  /** @deprecated use style instead */
  variant?: string;
}

export declare function Button(props: ButtonProps): React.ReactElement;
export default Button;
