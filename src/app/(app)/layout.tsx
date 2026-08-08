import { requireUser, getOtherUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { QuickAddFab } from "@/components/quick-add-fab";
import { AppShell } from "@/components/app-shell";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Redundante com o middleware, mas garante o usuario disponivel pro
  // subtree.
  const session = await requireUser();

  const [cards, user, otherUser] = await Promise.all([
    db.card.findMany({
      where: { ownerUserId: session.userId, isActive: true },
      orderBy: { createdAt: "desc" },
    }),
    db.user.findUnique({ where: { id: session.userId } }),
    getOtherUser(session.userId),
  ]);

  return (
    <AppShell>
      {children}
      <QuickAddFab
        cards={cards.map((c) => ({
          id: c.id,
          name: c.name,
          currency: c.currency,
          color: c.color,
        }))}
        defaultCardId={user?.lastUsedCardId ?? undefined}
        otherUserName={otherUser?.name}
      />
    </AppShell>
  );
}
