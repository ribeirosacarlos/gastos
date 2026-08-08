-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "lastUsedCardId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "User_lastUsedCardId_fkey" FOREIGN KEY ("lastUsedCardId") REFERENCES "Card" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Card" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "bank" TEXT NOT NULL,
    "limitCents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'BRL',
    "closingDay" INTEGER NOT NULL,
    "dueDay" INTEGER NOT NULL,
    "ownerUserId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Card_ownerUserId_fkey" FOREIGN KEY ("ownerUserId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Purchase" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "cardId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "totalCents" INTEGER NOT NULL,
    "purchaseDate" DATETIME NOT NULL,
    "installmentsCount" INTEGER NOT NULL,
    "isShared" BOOLEAN NOT NULL DEFAULT false,
    "ownerUserId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Purchase_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "Card" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Purchase_ownerUserId_fkey" FOREIGN KEY ("ownerUserId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PurchaseInstallment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "purchaseId" TEXT NOT NULL,
    "installmentNumber" INTEGER NOT NULL,
    "referenceYear" INTEGER NOT NULL,
    "referenceMonth" INTEGER NOT NULL,
    "valueCents" INTEGER NOT NULL,
    "paid" BOOLEAN NOT NULL DEFAULT false,
    "paidAt" DATETIME,
    CONSTRAINT "PurchaseInstallment_purchaseId_fkey" FOREIGN KEY ("purchaseId") REFERENCES "Purchase" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "FixedExpense" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "description" TEXT NOT NULL,
    "valueCents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'BRL',
    "startYear" INTEGER NOT NULL,
    "startMonth" INTEGER NOT NULL,
    "totalInstallments" INTEGER,
    "isShared" BOOLEAN NOT NULL DEFAULT false,
    "ownerUserId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "FixedExpense_ownerUserId_fkey" FOREIGN KEY ("ownerUserId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "FixedExpenseInstallment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "fixedExpenseId" TEXT NOT NULL,
    "installmentNumber" INTEGER NOT NULL,
    "referenceYear" INTEGER NOT NULL,
    "referenceMonth" INTEGER NOT NULL,
    "valueCents" INTEGER NOT NULL,
    "paid" BOOLEAN NOT NULL DEFAULT false,
    "paidAt" DATETIME,
    CONSTRAINT "FixedExpenseInstallment_fixedExpenseId_fkey" FOREIGN KEY ("fixedExpenseId") REFERENCES "FixedExpense" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ExchangeRate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "currency" TEXT NOT NULL,
    "rateToBRL" REAL NOT NULL,
    "source" TEXT NOT NULL,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE INDEX "PurchaseInstallment_referenceYear_referenceMonth_idx" ON "PurchaseInstallment"("referenceYear", "referenceMonth");

-- CreateIndex
CREATE UNIQUE INDEX "PurchaseInstallment_purchaseId_installmentNumber_key" ON "PurchaseInstallment"("purchaseId", "installmentNumber");

-- CreateIndex
CREATE UNIQUE INDEX "FixedExpenseInstallment_fixedExpenseId_referenceYear_referenceMonth_key" ON "FixedExpenseInstallment"("fixedExpenseId", "referenceYear", "referenceMonth");

-- CreateIndex
CREATE UNIQUE INDEX "ExchangeRate_currency_key" ON "ExchangeRate"("currency");
