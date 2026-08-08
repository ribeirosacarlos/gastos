import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { centsToDisplay } from "@/lib/money";
import { ArchiveCardButton } from "@/components/archive-card-button";

export default async function CardDetailPage({
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
      <h1 className="mb-4 flex items-center gap-2 text-xl font-semibold">
        <span
          className="inline-block h-4 w-4 shrink-0 rounded-full"
          style={{ backgroundColor: card.color }}
        />
        {card.name}
      </h1>

      <dl className="space-y-2 text-sm">
        <div className="flex justify-between">
          <dt className="text-muted-foreground">Banco</dt>
          <dd>{card.bank}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-muted-foreground">Moeda</dt>
          <dd>{card.currency}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-muted-foreground">Limite</dt>
          <dd>{centsToDisplay(card.limitCents, card.currency)}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-muted-foreground">Dia de fechamento</dt>
          <dd>{card.closingDay}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-muted-foreground">Dia de vencimento</dt>
          <dd>{card.dueDay}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-muted-foreground">Status</dt>
          <dd>{card.isActive ? "Ativo" : "Arquivado"}</dd>
        </div>
      </dl>

      {card.isActive && (
        <div className="mt-6">
          <ArchiveCardButton cardId={card.id} />
        </div>
      )}
    </main>
  );
}
