import * as React from 'react';

export interface TabItem {
  id: string;
  label?: string;
  href?: string;
  icon?: React.ComponentType<{ size?: number; className?: string }>;
}

export interface TabsProps {
  tabs?: TabItem[];
  activeTab?: string;
  onTabChange?: (id: string) => void;
  className?: string;
}

export default function Tabs(props: TabsProps): React.ReactElement | null;
