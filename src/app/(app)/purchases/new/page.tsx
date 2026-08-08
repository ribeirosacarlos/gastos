import { requireUser, getOtherUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { BackLink } from "@/components/back-link";
import { NewPurchaseForm } from "./purchase-form";

export default async function NewPurchasePage() {
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
    <main className="mx-auto max-w-sm p-4">
      <BackLink href="/purchases" label="Voltar para compras" />
      <h1 className="mb-4 text-xl font-semibold">Nova compra</h1>
      <NewPurchaseForm
        cards={cards.map((c) => ({
          id: c.id,
          name: c.name,
          currency: c.currency,
        }))}
        defaultCardId={user?.lastUsedCardId ?? undefined}
        otherUserName={otherUser?.name}
      />
    </main>
  );
}
