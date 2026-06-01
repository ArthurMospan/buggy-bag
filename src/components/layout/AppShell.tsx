import Sidebar from './Sidebar';

interface AppShellProps {
  children: React.ReactNode;
  userEmail?: string;
}

export default function AppShell({ children, userEmail = '' }: AppShellProps) {
  return (
    <div className="h-screen flex overflow-hidden bg-white p-[12px] gap-[12px]">
      <aside className="w-[220px] bg-[#f4f4f5] rounded-[16px] flex flex-col shrink-0 overflow-hidden">
        <Sidebar userEmail={userEmail} />
      </aside>
      <main className="flex-1 border border-[#f0f0f0] rounded-[16px] overflow-auto bg-white">
        {children}
      </main>
    </div>
  );
}
