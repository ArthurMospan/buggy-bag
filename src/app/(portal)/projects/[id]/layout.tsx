import { ProjectProvider } from '@/components/layout/ProjectContext';
import ClientProjectLayout from '@/components/layout/ClientProjectLayout';

export default function ProjectLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProjectProvider>
      <ClientProjectLayout>
        {children}
      </ClientProjectLayout>
    </ProjectProvider>
  );
}
