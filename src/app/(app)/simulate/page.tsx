import { requireUser, getOtherUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { listCategories } from "@/lib/actions/category-actions";
import { SimulateForm } from "./simulate-form";

export default async function SimulatePage() {
  const session = await requireUser();

  const [cards, user, otherUser, categories] = await Promise.all([
    db.card.findMany({
      where: { ownerUserId: session.userId, isActive: true },
      orderBy: { createdAt: "desc" },
    }),
    db.user.findUnique({ where: { id: session.userId } }),
    getOtherUser(session.userId),
    listCategories(),
  ]);

  return (
    <main className="mx-auto max-w-sm p-4">
      <h1 className="mb-4 text-xl font-semibold">Simular compra</h1>
      <SimulateForm
        cards={cards.map((c) => ({
          id: c.id,
          name: c.name,
          currency: c.currency,
          color: c.color,
        }))}
        categories={categories}
        defaultCardId={user?.lastUsedCardId ?? undefined}
        otherUserName={otherUser?.name}
      />
    </main>
  );
}
