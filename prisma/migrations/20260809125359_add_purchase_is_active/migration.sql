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
    "isShared" BOOLEAN NOT NULL DEFAULT false,
    "ownerUserId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Purchase_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "Card" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Purchase_ownerUserId_fkey" FOREIGN KEY ("ownerUserId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Purchase" ("cardId", "category", "createdAt", "description", "id", "installmentsCount", "isShared", "ownerUserId", "purchaseDate", "totalCents") SELECT "cardId", "category", "createdAt", "description", "id", "installmentsCount", "isShared", "ownerUserId", "purchaseDate", "totalCents" FROM "Purchase";
DROP TABLE "Purchase";
ALTER TABLE "new_Purchase" RENAME TO "Purchase";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
