import { requireUser, getOtherUser } from "@/lib/auth";
import { BackLink } from "@/components/back-link";
import { NewFixedExpenseForm } from "./fixed-expense-form";

export default async function NewFixedExpensePage() {
  const session = await requireUser();
  const otherUser = await getOtherUser(session.userId);

  return (
    <main className="mx-auto max-w-sm p-4">
      <BackLink href="/fixed-expenses" label="Voltar para gastos fixos" />
      <h1 className="mb-4 text-xl font-semibold">Novo gasto fixo</h1>
      <NewFixedExpenseForm otherUserName={otherUser?.name} />
    </main>
  );
}
