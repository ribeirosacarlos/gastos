import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { QuickAddFab } from "@/components/quick-add-fab";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Redundante com o middleware, mas garante o usuario disponivel pro
  // subtree e serve de base pro AppShell (nav mobile/desktop) que sera
  // adicionado nas Stories de Dashboard/Polish.
  const session = await requireUser();

  const [cards, user] = await Promise.all([
    db.card.findMany({
      where: { ownerUserId: session.userId, isActive: true },
      orderBy: { createdAt: "desc" },
    }),
    db.user.findUnique({ where: { id: session.userId } }),
  ]);

  return (
    <>
      {children}
      <QuickAddFab
        cards={cards.map((c) => ({
          id: c.id,
          name: c.name,
          currency: c.currency,
        }))}
        defaultCardId={user?.lastUsedCardId ?? undefined}
      />
    </>
  );
}
