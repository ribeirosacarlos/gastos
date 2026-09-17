import Link from "next/link";
import { requireUser, listParticipantCandidates } from "@/lib/auth";
import { db } from "@/lib/db";
import { buttonVariants } from "@/components/ui/button";
import { CategoryFilter } from "@/components/category-filter";
import { CardFilter } from "@/components/card-filter";
import { InstallmentsFilter } from "@/components/installments-filter";
import { MonthFilter } from "@/components/month-filter";
import { PurchasesListing, type PurchaseRow } from "@/components/purchases-listing";

// "2026-08" -> { year: 2026, month: 8 } para filtrar a fatura das parcelas
// (referenceYear/referenceMonth), nao a data original da compra.
function invoiceMonth(month: string): { year: number; month: number } | null {
  const match = /^(\d{4})-(\d{2})$/.exec(month);
  if (!match) return null;
  const year = Number(match[1]);
  const monthIndex = Number(match[2]) - 1;
  if (monthIndex < 0 || monthIndex > 11) return null;
  return { year, month: monthIndex + 1 };
}

const MONTH_LABEL_FORMATTER = new Intl.DateTimeFormat("pt-BR", {
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

export default async function PurchasesPage({
  searchParams,
}: {
  searchParams: Promise<{
    cardId?: string;
    category?: string;
    month?: string;
    installments?: string;
  }>;
}) {
  const user = await requireUser();
  const {
    cardId,
    category: rawCategory,
    month: rawMonth,
    installments: rawInstallments,
  } = await searchParams;

  const [allCategories, ownedCards] = await Promise.all([
    db.category.findMany({ select: { id: true, name: true, isActive: true } }),
    // Traz cartoes inativos tambem (nao so os do filtro) - a listagem
    // precisa deles pro select de edicao inline/modal quando a compra
    // aponta pra um cartao ja desativado, senao a opcao selecionada some.
    db.card.findMany({
      where: { ownerUserId: user.userId },
      select: { id: true, name: true, color: true, currency: true, isActive: true },
      orderBy: { name: "asc" },
    }),
  ]);
  const categoryMap = new Map(allCategories.map((c) => [c.id, c.name]));
  const activeCategories = allCategories.filter((c) => c.isActive);
  const allCards = ownedCards.filter((c) => c.isActive);
  // Categoria invalida na URL (editada a mao, ou excluida) e ignorada, nao
  // filtra pra lista vazia.
  const category = categoryMap.has(rawCategory ?? "") ? rawCategory : undefined;
  // Mesma logica pro mes/fatura: formato invalido na URL e ignorado.
  const invoiceMonthFilter = rawMonth ? invoiceMonth(rawMonth) : null;
  const month = invoiceMonthFilter ? rawMonth : undefined;
  const installments = rawInstallments === "multi" ? "multi" : undefined;

  const [purchases, participantCandidates, filterCard] = await Promise.all([
    db.purchase.findMany({
      where: {
        participants: { some: { userId: user.userId } },
        isActive: true,
        ...(cardId ? { cardId } : {}),
        ...(category ? { category } : {}),
        ...(installments ? { installmentsCount: { gt: 1 } } : {}),
        ...(invoiceMonthFilter
          ? {
              installments: {
                some: {
                  referenceYear: invoiceMonthFilter.year,
                  referenceMonth: invoiceMonthFilter.month,
                },
              },
            }
          : {}),
      },
      include: {
        card: true,
        installments: { select: { paid: true } },
        participants: { include: { user: { select: { id: true, name: true } } } },
      },
      orderBy: { createdAt: "desc" },
    }),
    listParticipantCandidates(user.userId),
    cardId ? db.card.findUnique({ where: { id: cardId } }) : null,
  ]);

  return (
    <main className="p-4">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold">Compras</h1>
        <Link
          href={cardId ? `/purchases/new?cardId=${cardId}` : "/purchases/new"}
          className={buttonVariants()}
        >
          Nova compra
        </Link>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <CardFilter cards={allCards} />
        <CategoryFilter categories={activeCategories} />
        <InstallmentsFilter />
        <MonthFilter />
      </div>

      {(filterCard || category || month || installments) && (
        <p className="mb-4 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          Filtrando por{" "}
          {filterCard && (
            <span className="flex items-center gap-1.5 font-medium text-foreground">
              <span
                className="inline-block h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: filterCard.color }}
              />
              {filterCard.name}
            </span>
          )}
          {category && (
            <span className="font-medium text-foreground">
              {categoryMap.get(category) ?? category}
            </span>
          )}
          {installments && (
            <span className="font-medium text-foreground">parceladas</span>
          )}
          {month && (
            <span className="font-medium text-foreground">
              fatura de{" "}
              {MONTH_LABEL_FORMATTER.format(new Date(`${month}-01T00:00:00.000Z`))}
            </span>
          )}
          <Link href="/purchases" className="underline">
            limpar
          </Link>
        </p>
      )}

      {purchases.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {filterCard || category || month || installments
            ? "Nenhuma compra encontrada nessa fatura/filtro ainda."
            : "Nenhuma compra registrada ainda."}
        </p>
      ) : (
        <PurchasesListing
          purchases={purchases.map(
            (purchase): PurchaseRow => ({
              id: purchase.id,
              cardId: purchase.cardId,
              cardName: purchase.card.name,
              cardColor: purchase.card.color,
              cardCurrency: purchase.card.currency,
              description: purchase.description,
              purchaseDateISO: purchase.purchaseDate.toISOString(),
              category: purchase.category,
              totalCents: purchase.totalCents,
              installmentsCount: purchase.installmentsCount,
              ownerUserId: purchase.ownerUserId,
              ownerName:
                purchase.participants.find((p) => p.userId === purchase.ownerUserId)?.user
                  .name ?? "—",
              chargedUserId: purchase.chargedUserId,
              participants: purchase.participants.map((p) => p.user),
              hasPaidInstallment: purchase.installments.some((i) => i.paid),
            }),
          )}
          cards={ownedCards}
          categories={allCategories}
          participantCandidates={participantCandidates}
          currentUserId={user.userId}
        />
      )}
    </main>
  );
}
