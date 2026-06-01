import * as React from 'react';

export interface EmptyStateProps {
  icon?: React.ComponentType<{ size?: number; className?: string }>;
  title?: string;
  description?: string;
  action?: string;
  onAction?: () => void;
  className?: string;
}

export declare function EmptyState(props: EmptyStateProps): React.ReactElement;
export default EmptyState;
