import { z } from "zod";
import { SUPPORTED_CURRENCIES } from "@/lib/money";

export const loginSchema = z.object({
  username: z.string().min(1, "Informe o usuário"),
  password: z.string().min(1, "Informe a senha"),
});

export type LoginInput = z.infer<typeof loginSchema>;

const supportedCurrencyCodes = SUPPORTED_CURRENCIES.map((c) => c.code) as [
  string,
  ...string[],
];

export const categorySchema = z.object({
  name: z.string().trim().min(1, "Informe o nome da categoria"),
});

export type CategoryInput = z.infer<typeof categorySchema>;

export const createParticipantSchema = z.object({
  name: z.string().trim().min(1, "Informe o nome do participante"),
});

export type CreateParticipantInput = z.infer<typeof createParticipantSchema>;

export const cardSchema = z.object({
  name: z.string().min(1, "Informe o nome do cartão"),
  bank: z.string().min(1, "Informe o banco"),
  limitCents: z.coerce
    .number()
    .int("Limite deve ser um valor inteiro (em centavos)")
    .positive("Limite deve ser maior que zero"),
  currency: z.enum(supportedCurrencyCodes, {
    message: "Moeda não suportada",
  }),
  closingDay: z.coerce
    .number()
    .int()
    .min(1, "Dia de fechamento deve estar entre 1 e 31")
    .max(31, "Dia de fechamento deve estar entre 1 e 31"),
  dueDay: z.coerce
    .number()
    .int()
    .min(1, "Dia de vencimento deve estar entre 1 e 31")
    .max(31, "Dia de vencimento deve estar entre 1 e 31"),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Cor inválida"),
});

// Sem currency: mudar a moeda de um cartao com compras ja registradas
// relabelaria o historico inteiro sem converter valores (Purchase nao tem
// currency propria, herda de card.currency) - ver Dev Notes da Story 1.12.
export const updateCardSchema = cardSchema.omit({ currency: true });

export type UpdateCardInput = z.infer<typeof updateCardSchema>;

export type CardInput = z.infer<typeof cardSchema>;

export const purchaseSchema = z.object({
  cardId: z.string().min(1, "Selecione um cartão"),
  description: z.string(),
  totalCents: z.coerce
    .number()
    .int("Valor deve ser um valor inteiro (em centavos)")
    .positive("Valor deve ser maior que zero"),
  purchaseDate: z.coerce.date({ message: "Data inválida" }),
  installmentsCount: z.coerce
    .number()
    .int("Número de parcelas deve ser inteiro")
    .min(1, "Mínimo de 1 parcela"),
  // IDs de usuarios que dividem a compra alem do dono (que e sempre
  // implicito - nunca aparece nesta lista). Vazio = compra nao dividida.
  additionalParticipantUserIds: z.array(z.string().min(1)).default([]),
  // null = divide igualmente entre os participantes; preenchido = 100% vai
  // para esse participante adicional.
  chargedUserId: z.preprocess(
    (value) => (value === "" || value === undefined ? null : value),
    z.string().min(1).nullable()
  ),
  // Validado contra a tabela Category na action (mesmo padrao de cardId),
  // nao da pra usar z.enum aqui porque a lista e dinamica.
  category: z.string().min(1, "Selecione uma categoria"),
});

export type PurchaseInput = z.infer<typeof purchaseSchema>;

export const updatePurchaseSchema = purchaseSchema.extend({
  description: z.string().trim().min(1, "Informe a descrição"),
});

export type UpdatePurchaseInput = z.infer<typeof updatePurchaseSchema>;

export const fixedExpenseSchema = z.object({
  description: z.string().min(1, "Informe a descrição"),
  valueCents: z.coerce
    .number()
    .int("Valor deve ser um valor inteiro (em centavos)")
    .positive("Valor deve ser maior que zero"),
  currency: z.enum(supportedCurrencyCodes, {
    message: "Moeda não suportada",
  }),
  startYear: z.coerce.number().int("Ano inválido"),
  startMonth: z.coerce
    .number()
    .int()
    .min(1, "Mês deve estar entre 1 e 12")
    .max(12, "Mês deve estar entre 1 e 12"),
  totalInstallments: z.coerce
    .number()
    .int("Número de parcelas deve ser inteiro")
    .min(1, "Mínimo de 1 parcela")
    .optional()
    .nullable(),
  isShared: z.coerce.boolean(),
  category: z.string().min(1, "Selecione uma categoria"),
});

export type FixedExpenseInput = z.infer<typeof fixedExpenseSchema>;

// Mesmos campos de fixedExpenseSchema - mesma logica de updatePurchaseSchema:
// a guarda de parcela paga fica na action, nao no shape validado.
export const updateFixedExpenseSchema = fixedExpenseSchema;

export type UpdateFixedExpenseInput = z.infer<typeof updateFixedExpenseSchema>;

const nonBrlCurrencyCodes = SUPPORTED_CURRENCIES.filter(
  (c) => c.code !== "BRL"
).map((c) => c.code) as [string, ...string[]];

export const exchangeRateSchema = z.object({
  currency: z.enum(nonBrlCurrencyCodes, {
    message: "Moeda não suportada",
  }),
  rateToBRL: z.coerce
    .number()
    .positive("Taxa deve ser um número positivo"),
});

export type ExchangeRateInput = z.infer<typeof exchangeRateSchema>;
