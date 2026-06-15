import { AppShell } from "@/components/layout/app-shell";
import { LivePageRefresh } from "@/components/live/live-page-refresh";

export default function MainLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <AppShell>
      <LivePageRefresh />
      {children}
    </AppShell>
  );
}
