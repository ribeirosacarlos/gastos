import { notFound } from "next/navigation";
import { requireUser, getOtherUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { BackLink } from "@/components/back-link";
import { EditFixedExpenseForm } from "./edit-fixed-expense-form";

export default async function EditFixedExpensePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser();

  const fixedExpense = await db.fixedExpense.findUnique({
    where: { id },
    include: { installments: true },
  });

  const visible =
    fixedExpense &&
    (fixedExpense.isShared || fixedExpense.ownerUserId === user.userId);

  if (!fixedExpense || !visible) {
    notFound();
  }

  const [otherUser, categories] = await Promise.all([
    getOtherUser(user.userId),
    db.category.findMany({
      where: { OR: [{ isActive: true }, { id: fixedExpense.category }] },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);
  const hasPaidInstallment = fixedExpense.installments.some((i) => i.paid);

  return (
    <main className="mx-auto max-w-sm p-4">
      <BackLink
        href={`/fixed-expenses/${fixedExpense.id}`}
        label="Voltar para o gasto fixo"
      />
      <h1 className="mb-4 text-xl font-semibold">Editar gasto fixo</h1>
      <EditFixedExpenseForm
        fixedExpenseId={fixedExpense.id}
        categories={categories}
        hasPaidInstallment={hasPaidInstallment}
        otherUserName={otherUser?.name}
        defaultValues={{
          description: fixedExpense.description,
          valueCents: fixedExpense.valueCents,
          currency: fixedExpense.currency,
          startYear: fixedExpense.startYear,
          startMonth: fixedExpense.startMonth,
          totalInstallments: fixedExpense.totalInstallments,
          isShared: fixedExpense.isShared,
          category: fixedExpense.category,
        }}
      />
    </main>
  );
}
