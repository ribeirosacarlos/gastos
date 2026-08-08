import { BottomNav } from "@/components/bottom-nav";
import { SidebarNav } from "@/components/sidebar-nav";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-full md:pl-48">
      <SidebarNav />
      <div className="mx-auto max-w-2xl pb-20 md:pb-4">{children}</div>
      <BottomNav />
    </div>
  );
}
