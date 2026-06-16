export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#141419] flex items-center justify-center p-[24px]">
      {children}
    </div>
  );
}
