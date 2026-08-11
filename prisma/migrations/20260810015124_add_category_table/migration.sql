-- CreateTable
CREATE TABLE "Category" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Seed das categorias fixas da Story 1.13 (lib/categories.ts, removido nesta
-- story). Ids explicitos = codigos antigos, pra Purchase.category /
-- FixedExpense.category (strings ja gravadas no banco) continuarem
-- resolvendo sem precisar de migracao de dados.
INSERT INTO "Category" ("id", "name") VALUES
    ('food', 'Alimentação'),
    ('transport', 'Transporte'),
    ('housing', 'Moradia'),
    ('leisure', 'Lazer'),
    ('health', 'Saúde'),
    ('education', 'Educação'),
    ('shopping', 'Compras'),
    ('bills', 'Contas/Serviços'),
    ('other', 'Outros');
