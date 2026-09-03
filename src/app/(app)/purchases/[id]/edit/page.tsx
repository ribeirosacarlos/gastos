import { notFound } from "next/navigation";
import { requireUser, listParticipantCandidates } from "@/lib/auth";
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
    include: { installments: true, participants: true },
  });

  const visible =
    purchase && purchase.participants.some((p) => p.userId === user.userId);

  if (!purchase || !visible) {
    notFound();
  }

  // Inclui o cartao/categoria atual da compra mesmo se ja tiver sido
  // excluido, senao o combobox ficaria sem a opcao selecionada (ver
  // defaultCardId em purchase-form.tsx, mesma logica).
  const [cards, categories, participantCandidates] = await Promise.all([
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
    listParticipantCandidates(user.userId),
  ]);

  const hasPaidInstallment = purchase.installments.some((i) => i.paid);
  const additionalParticipantUserIds = purchase.participants
    .map((p) => p.userId)
    .filter((userId) => userId !== purchase.ownerUserId);

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
        participantCandidates={participantCandidates}
        defaultValues={{
          cardId: purchase.cardId,
          description: purchase.description,
          totalCents: purchase.totalCents,
          purchaseDate: purchase.purchaseDate,
          installmentsCount: purchase.installmentsCount,
          additionalParticipantUserIds,
          chargedUserId: purchase.chargedUserId,
          category: purchase.category,
        }}
      />
    </main>
  );
}
