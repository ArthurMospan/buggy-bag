import ProjectSidebar from '@/components/layout/ProjectSidebar';
import { ProjectProvider } from '@/components/layout/ProjectContext';

export default function ProjectLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProjectProvider>
      <div className="flex w-full h-full">
        <ProjectSidebar />
        <div className="flex-1 overflow-auto bg-[#f4f4f5] relative">
          {children}
        </div>
      </div>
    </ProjectProvider>
  );
}
