import { requireUser, listParticipantCandidates } from "@/lib/auth";
import { db } from "@/lib/db";
import { listCategories } from "@/lib/actions/category-actions";
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

  const [cards, user, participantCandidates, categories] = await Promise.all([
    db.card.findMany({
      where: { ownerUserId: session.userId, isActive: true },
      orderBy: { createdAt: "desc" },
    }),
    db.user.findUnique({ where: { id: session.userId } }),
    listParticipantCandidates(session.userId),
    listCategories(),
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
        categories={categories}
        defaultCardId={user?.lastUsedCardId ?? undefined}
        participantCandidates={participantCandidates}
      />
    </AppShell>
  );
}
