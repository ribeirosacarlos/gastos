import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { BackLink } from "@/components/back-link";
import { EditCardForm } from "./edit-card-form";

export default async function EditCardPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser();

  const card = await db.card.findUnique({ where: { id } });

  if (!card || card.ownerUserId !== user.userId) {
    notFound();
  }

  return (
    <main className="mx-auto max-w-sm p-4">
      <BackLink href="/cards" label="Voltar para cartões" />
      <h1 className="mb-4 text-xl font-semibold">Editar cartão</h1>
      <EditCardForm
        cardId={card.id}
        currency={card.currency}
        defaultValues={{
          name: card.name,
          bank: card.bank,
          limitCents: card.limitCents,
          closingDay: card.closingDay,
          dueDay: card.dueDay,
          color: card.color,
        }}
      />
    </main>
  );
}
