import { TextareaHTMLAttributes, ForwardRefExoticComponent, RefAttributes } from 'react';

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  placeholder?: string;
  error?: boolean;
  rows?: number;
  maxRows?: number;
}

export const Textarea: ForwardRefExoticComponent<TextareaProps & RefAttributes<HTMLTextAreaElement>>;
