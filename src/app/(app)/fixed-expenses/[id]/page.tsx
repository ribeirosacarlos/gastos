import { notFound } from "next/navigation";
import Link from "next/link";
import { requireUser, getOtherUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { centsToDisplay } from "@/lib/money";
import { InstallmentPreviewTable } from "@/components/installment-preview-table";
import { DeactivateFixedExpenseButton } from "@/components/deactivate-fixed-expense-button";
import { BackLink } from "@/components/back-link";
import { buttonVariants } from "@/components/ui/button";
import { toggleFixedExpenseInstallmentPaid } from "@/lib/actions/fixed-expense-actions";

export default async function FixedExpenseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser();

  const [fixedExpense, otherUser] = await Promise.all([
    db.fixedExpense.findUnique({
      where: { id },
      include: {
        installments: {
          orderBy: [{ referenceYear: "asc" }, { referenceMonth: "asc" }],
        },
      },
    }),
    getOtherUser(user.userId),
  ]);

  const visible =
    fixedExpense &&
    (fixedExpense.isShared || fixedExpense.ownerUserId === user.userId);

  if (!fixedExpense || !visible) {
    notFound();
  }

  return (
    <main className="mx-auto max-w-sm p-4">
      <BackLink href="/fixed-expenses" label="Voltar para gastos fixos" />
      <h1 className="mb-1 text-xl font-semibold">
        {fixedExpense.description}
      </h1>
      <p className="mb-4 text-sm text-muted-foreground">
        {centsToDisplay(fixedExpense.valueCents, fixedExpense.currency)} ·{" "}
        {fixedExpense.totalInstallments
          ? `${fixedExpense.totalInstallments}x`
          : "Indefinido"}
        {fixedExpense.isShared &&
          ` · Compartilhado${otherUser ? ` com ${otherUser.name}` : ""}`}
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
        <div className="mt-6 flex items-center gap-2">
          <Link
            href={`/fixed-expenses/${fixedExpense.id}/edit`}
            className={buttonVariants({ variant: "outline" })}
          >
            Editar
          </Link>
          <DeactivateFixedExpenseButton
            fixedExpenseId={fixedExpense.id}
            redirectTo="/fixed-expenses"
          />
        </div>
      )}
    </main>
  );
}
