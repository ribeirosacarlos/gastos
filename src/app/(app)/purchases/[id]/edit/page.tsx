import { notFound } from "next/navigation";
import { requireUser, getOtherUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { BackLink } from "@/components/back-link";
import { EditPurchaseForm } from "./edit-purchase-form";

export default async function EditPurchasePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser();

  const purchase = await db.purchase.findUnique({
    where: { id },
    include: { installments: true },
  });

  const visible =
    purchase && (purchase.isShared || purchase.ownerUserId === user.userId);

  if (!purchase || !visible) {
    notFound();
  }

  // Inclui o cartao/categoria atual da compra mesmo se ja tiver sido
  // excluido, senao o combobox ficaria sem a opcao selecionada (ver
  // defaultCardId em purchase-form.tsx, mesma logica).
  const [cards, categories, otherUser] = await Promise.all([
    db.card.findMany({
      where: {
        ownerUserId: user.userId,
        OR: [{ isActive: true }, { id: purchase.cardId }],
      },
      orderBy: { createdAt: "desc" },
    }),
    db.category.findMany({
      where: { OR: [{ isActive: true }, { id: purchase.category }] },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    getOtherUser(user.userId),
  ]);

  const hasPaidInstallment = purchase.installments.some((i) => i.paid);

  return (
    <main className="mx-auto max-w-sm p-4">
      <BackLink href={`/purchases/${purchase.id}`} label="Voltar para a compra" />
      <h1 className="mb-4 text-xl font-semibold">Editar compra</h1>
      <EditPurchaseForm
        purchaseId={purchase.id}
        cards={cards.map((c) => ({
          id: c.id,
          name: c.name,
          currency: c.currency,
          color: c.color,
        }))}
        categories={categories}
        hasPaidInstallment={hasPaidInstallment}
        otherUserName={otherUser?.name}
        defaultValues={{
          cardId: purchase.cardId,
          description: purchase.description,
          totalCents: purchase.totalCents,
          purchaseDate: purchase.purchaseDate,
          installmentsCount: purchase.installmentsCount,
          isShared: purchase.isShared,
          category: purchase.category,
        }}
      />
    </main>
  );
}
