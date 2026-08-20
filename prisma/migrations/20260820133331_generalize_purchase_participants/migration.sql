-- Backfill: recupera o dono real de compras compartilhadas antigas
-- (ownerUserId ficava NULL quando isShared=true - so o titular do cartao
-- era o dono de fato, nunca gravado na propria compra).
UPDATE "Purchase"
SET "ownerUserId" = (SELECT "ownerUserId" FROM "Card" WHERE "Card"."id" = "Purchase"."cardId")
WHERE "ownerUserId" IS NULL;

-- CreateTable
CREATE TABLE "PurchaseParticipant" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "purchaseId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    CONSTRAINT "PurchaseParticipant_purchaseId_fkey" FOREIGN KEY ("purchaseId") REFERENCES "Purchase" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PurchaseParticipant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "PurchaseParticipant_purchaseId_userId_key" ON "PurchaseParticipant"("purchaseId", "userId");

-- Backfill: todo dono vira participante da propria compra.
INSERT INTO "PurchaseParticipant" ("id", "purchaseId", "userId")
SELECT lower(hex(randomblob(16))), "id", "ownerUserId" FROM "Purchase";

-- Backfill: compras que eram isShared=true ganham 1 linha de participante
-- pra cada outro usuario existente (reproduz o "compartilhada = todo mundo
-- ve" de hoje, ja que so havia 2 usuarios fixos ate aqui).
INSERT INTO "PurchaseParticipant" ("id", "purchaseId", "userId")
SELECT lower(hex(randomblob(16))), "Purchase"."id", "User"."id"
FROM "Purchase"
CROSS JOIN "User"
WHERE "Purchase"."isShared" = true
  AND "User"."id" != "Purchase"."ownerUserId";

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Purchase" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "cardId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "totalCents" INTEGER NOT NULL,
    "purchaseDate" DATETIME NOT NULL,
    "installmentsCount" INTEGER NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'other',
    "ownerUserId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Purchase_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "Card" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Purchase_ownerUserId_fkey" FOREIGN KEY ("ownerUserId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Purchase" ("cardId", "category", "createdAt", "description", "id", "installmentsCount", "ownerUserId", "purchaseDate", "totalCents") SELECT "cardId", "category", "createdAt", "description", "id", "installmentsCount", "ownerUserId", "purchaseDate", "totalCents" FROM "Purchase";
DROP TABLE "Purchase";
ALTER TABLE "new_Purchase" RENAME TO "Purchase";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
