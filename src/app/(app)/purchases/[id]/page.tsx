import { notFound } from "next/navigation";
import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { centsToDisplay } from "@/lib/money";
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

  return (
    <main className="mx-auto max-w-sm p-4">
      <BackLink href="/purchases" label="Voltar para compras" />
      <h1 className="mb-1 text-xl font-semibold">{purchase.description}</h1>
      <p className="mb-4 text-sm text-muted-foreground">
        {purchase.card.name} ·{" "}
        {centsToDisplay(purchase.totalCents, purchase.card.currency)} em{" "}
        {purchase.installmentsCount}x
        {otherParticipantNames.length > 0 &&
          ` · Dividida com ${otherParticipantNames.join(", ")}`}
      </p>

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
