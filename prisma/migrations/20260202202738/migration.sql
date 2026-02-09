-- CreateTable
CREATE TABLE "ResourceSubmission" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "submitterName" TEXT NOT NULL,
    "submitterEmail" TEXT,
    "submitterDiscord" TEXT,
    "assetTitle" TEXT NOT NULL,
    "creatorName" TEXT NOT NULL,
    "assetUrl" TEXT NOT NULL,
    "description" TEXT,
    "previewImageUrl" TEXT,
    "price" REAL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE INDEX "ResourceSubmission_status_createdAt_idx" ON "ResourceSubmission"("status", "createdAt");

-- CreateIndex
CREATE INDEX "ResourceSubmission_featured_idx" ON "ResourceSubmission"("featured");
