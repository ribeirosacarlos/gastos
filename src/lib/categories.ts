export interface CategoryConfig {
  code: string;
  label: string;
}

// Lista fixa de categorias. String livre no banco (nao enum do Prisma),
// mesmo padrao de SUPPORTED_CURRENCIES em lib/money.ts - adicionar uma
// categoria nova = so incluir uma entrada aqui, sem migration.
export const SUPPORTED_CATEGORIES: CategoryConfig[] = [
  { code: "food", label: "Alimentação" },
  { code: "transport", label: "Transporte" },
  { code: "housing", label: "Moradia" },
  { code: "leisure", label: "Lazer" },
  { code: "health", label: "Saúde" },
  { code: "education", label: "Educação" },
  { code: "shopping", label: "Compras" },
  { code: "bills", label: "Contas/Serviços" },
  { code: "other", label: "Outros" },
];

export const DEFAULT_CATEGORY = "other";

export function categoryLabel(code: string): string {
  return SUPPORTED_CATEGORIES.find((c) => c.code === code)?.label ?? code;
}
