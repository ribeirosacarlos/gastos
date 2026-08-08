import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { centsToDisplay } from "@/lib/money";
import { InstallmentPreviewTable } from "@/components/installment-preview-table";
import { DeactivateFixedExpenseButton } from "@/components/deactivate-fixed-expense-button";
import { toggleFixedExpenseInstallmentPaid } from "@/lib/actions/fixed-expense-actions";

export default async function FixedExpenseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser();

  const fixedExpense = await db.fixedExpense.findUnique({
    where: { id },
    include: {
      installments: {
        orderBy: [{ referenceYear: "asc" }, { referenceMonth: "asc" }],
      },
    },
  });

  const visible =
    fixedExpense &&
    (fixedExpense.isShared || fixedExpense.ownerUserId === user.userId);

  if (!fixedExpense || !visible) {
    notFound();
  }

  return (
    <main className="mx-auto max-w-sm p-4">
      <h1 className="mb-1 text-xl font-semibold">
        {fixedExpense.description}
      </h1>
      <p className="mb-4 text-sm text-muted-foreground">
        {centsToDisplay(fixedExpense.valueCents, fixedExpense.currency)} ·{" "}
        {fixedExpense.totalInstallments
          ? `${fixedExpense.totalInstallments}x`
          : "Indefinido"}
        {fixedExpense.isShared && " · Compartilhado"}
        {!fixedExpense.isActive && " · Inativo"}
      </p>

      <InstallmentPreviewTable
        installments={fixedExpense.installments.map((i) => ({
          id: i.id,
          installmentNumber: i.installmentNumber,
          referenceYear: i.referenceYear,
          referenceMonth: i.referenceMonth,
          valueCents: i.valueCents,
          paid: i.paid,
        }))}
        currency={fixedExpense.currency}
        onTogglePaid={toggleFixedExpenseInstallmentPaid}
      />

      {fixedExpense.isActive && (
        <div className="mt-6">
          <DeactivateFixedExpenseButton fixedExpenseId={fixedExpense.id} />
        </div>
      )}
    </main>
  );
}
