import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { centsToDisplay } from "@/lib/money";
import { InstallmentPreviewTable } from "@/components/installment-preview-table";
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
    },
  });

  const visible =
    purchase && (purchase.isShared || purchase.ownerUserId === user.userId);

  if (!purchase || !visible) {
    notFound();
  }

  return (
    <main className="mx-auto max-w-sm p-4">
      <h1 className="mb-1 text-xl font-semibold">{purchase.description}</h1>
      <p className="mb-4 text-sm text-muted-foreground">
        {purchase.card.name} ·{" "}
        {centsToDisplay(purchase.totalCents, purchase.card.currency)} em{" "}
        {purchase.installmentsCount}x
        {purchase.isShared && " · Compartilhada"}
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
    </main>
  );
}
