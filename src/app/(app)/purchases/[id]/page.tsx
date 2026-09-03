import { notFound } from "next/navigation";
import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { centsToDisplay, splitPurchaseShare } from "@/lib/money";
import { InstallmentPreviewTable } from "@/components/installment-preview-table";
import { BackLink } from "@/components/back-link";
import { buttonVariants } from "@/components/ui/button";
import { DeletePurchaseButton } from "@/components/delete-purchase-button";
import { toggleInstallmentPaid } from "@/lib/actions/purchase-actions";

export default async function PurchaseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser();

  const purchase = await db.purchase.findUnique({
    where: { id },
    include: {
      card: true,
      installments: { orderBy: { installmentNumber: "asc" } },
      participants: { include: { user: { select: { id: true, name: true } } } },
    },
  });

  const visible =
    purchase && purchase.participants.some((p) => p.userId === user.userId);

  if (!purchase || !visible) {
    notFound();
  }

  const otherParticipantNames = purchase.participants
    .filter((p) => p.userId !== purchase.ownerUserId)
    .map((p) => p.user.name);
  const chargedParticipantName = purchase.chargedUserId
    ? purchase.participants.find((p) => p.userId === purchase.chargedUserId)?.user
        .name ?? null
    : null;
  const isSharedPurchase = purchase.participants.some(
    (p) => p.userId !== purchase.ownerUserId
  );
  const participantIds = [
    purchase.ownerUserId,
    ...purchase.participants
      .filter((p) => p.userId !== purchase.ownerUserId)
      .map((p) => p.userId),
  ];
  const myShareCents =
    splitPurchaseShare(
      purchase.totalCents,
      participantIds,
      purchase.chargedUserId
    )[user.userId] ?? 0;

  return (
    <main className="mx-auto max-w-sm p-4">
      <BackLink href="/purchases" label="Voltar para compras" />
      <h1 className="mb-1 text-xl font-semibold">{purchase.description}</h1>
      <p className="mb-4 text-sm text-muted-foreground">
        {purchase.card.name} ·{" "}
        {centsToDisplay(purchase.totalCents, purchase.card.currency)} em{" "}
        {purchase.installmentsCount}x
        {chargedParticipantName
          ? ` · 100% por ${chargedParticipantName}`
          : otherParticipantNames.length > 0
            ? ` · Dividida com ${otherParticipantNames.join(", ")}`
            : ""}
      </p>
      {isSharedPurchase && (
        <p className="mb-4 rounded-md border bg-muted/40 p-3 text-sm text-muted-foreground">
          Minha parte nesta compra:{" "}
          <span className="font-medium text-foreground">
            {centsToDisplay(myShareCents, purchase.card.currency)}
          </span>
          {chargedParticipantName && myShareCents === 0
            ? ` · Valor inteiro direcionado para ${chargedParticipantName}.`
            : ""}
        </p>
      )}

      <InstallmentPreviewTable
        installments={purchase.installments.map((i) => ({
          id: i.id,
          installmentNumber: i.installmentNumber,
          referenceYear: i.referenceYear,
          referenceMonth: i.referenceMonth,
          valueCents: i.valueCents,
          paid: i.paid,
        }))}
        currency={purchase.card.currency}
        onTogglePaid={toggleInstallmentPaid}
      />

      <div className="mt-6 flex items-center gap-2">
        <Link
          href={`/purchases/${purchase.id}/edit`}
          className={buttonVariants({ variant: "outline" })}
        >
          Editar
        </Link>
        <DeletePurchaseButton purchaseId={purchase.id} redirectTo="/purchases" />
      </div>
    </main>
  );
}
