import { requireUser } from "@/lib/auth";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Redundante com o middleware, mas garante o usuario disponivel pro
  // subtree e serve de base pro AppShell (nav mobile/desktop) que sera
  // adicionado nas Stories de Dashboard/Polish.
  await requireUser();

  return <>{children}</>;
}
