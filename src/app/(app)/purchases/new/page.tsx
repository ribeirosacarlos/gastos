import { requireUser, listParticipantCandidates } from "@/lib/auth";
import { db } from "@/lib/db";
import { listCategories } from "@/lib/actions/category-actions";
import { BackLink } from "@/components/back-link";
import { NewPurchaseForm } from "./purchase-form";

export default async function NewPurchasePage({
  searchParams,
}: {
  searchParams: Promise<{ cardId?: string }>;
}) {
  const session = await requireUser();
  const { cardId: rawCardId } = await searchParams;

  const [cards, user, participantCandidates, categories] = await Promise.all([
    db.card.findMany({
      where: { ownerUserId: session.userId, isActive: true },
      orderBy: { createdAt: "desc" },
    }),
    db.user.findUnique({ where: { id: session.userId } }),
    listParticipantCandidates(session.userId),
    listCategories(),
  ]);

  const filterCardId =
    rawCardId && cards.some((c) => c.id === rawCardId) ? rawCardId : undefined;

  return (
    <main className="mx-auto max-w-sm p-4">
      <BackLink href="/purchases" label="Voltar para compras" />
      <h1 className="mb-4 text-xl font-semibold">Nova compra</h1>
      <NewPurchaseForm
        cards={cards.map((c) => ({
          id: c.id,
          name: c.name,
          currency: c.currency,
          color: c.color,
        }))}
        categories={categories}
        defaultCardId={filterCardId ?? user?.lastUsedCardId ?? undefined}
        participantCandidates={participantCandidates}
      />
    </main>
  );
}
