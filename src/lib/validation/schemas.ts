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
});

export type CardInput = z.infer<typeof cardSchema>;
