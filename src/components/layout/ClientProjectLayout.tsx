'use client';

import { usePathname, useSearchParams } from 'next/navigation';
import ProjectSidebar from '@/components/layout/ProjectSidebar';
import { useProjectContext } from '@/components/layout/ProjectContext';

interface ClientProjectLayoutProps {
  children: React.ReactNode;
}

/**
 * On desktop: shows [ProjectSidebar | content] side by side (flex row)
 * On mobile:
 *   - /projects/[id] with NO bugs selected   → ProjectSidebar full-screen (bug list)
 *   - /projects/[id] with bugs selected       → children full-screen (PromptGenerator)
 *   - /projects/[id]/bugs/[bugId]             → children only (ProjectSidebar returns null)
 *   - /projects/[id]/integration              → children only (ProjectSidebar returns null)
 */
export default function ClientProjectLayout({ children }: ClientProjectLayoutProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { selectedBugIds } = useProjectContext();

  // Determine if we're on the base project route (no sub-path)
  const isBaseProjectRoute =
    !pathname.match(/\/bugs\//) &&
    !pathname.includes('/integration') &&
    !pathname.includes('/setup');

  const showMobilePrompt = searchParams.get('prompt') === '1';

  // On mobile base project route:
  //   - if ?prompt=1 → show content pane (PromptGenerator)
  //   - if not ?prompt=1  → show ProjectSidebar full-screen
  const showSidebar = isBaseProjectRoute && !showMobilePrompt;
  const showContent = !isBaseProjectRoute || showMobilePrompt;

  return (
    <div className="flex w-full h-full">
      {/* ProjectSidebar: desktop always; mobile only when showSidebar */}
      <div className={`${showSidebar ? 'flex w-full' : 'hidden'} md:flex md:w-auto md:shrink-0`}>
        <ProjectSidebar />
      </div>

      {/* Content pane: desktop always; mobile only when showContent */}
      <div
        className={`flex-1 overflow-auto bg-transparent relative md:rounded-r-[24px] flex-col ${
          showContent ? 'flex' : 'hidden md:flex'
        }`}
      >
        {children}
      </div>
    </div>
  );
}
