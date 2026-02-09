-- CreateTable
CREATE TABLE "ResourceClick" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "resourceId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ResourceClick_resourceId_fkey" FOREIGN KEY ("resourceId") REFERENCES "ResourceSubmission" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "ResourceClick_resourceId_createdAt_idx" ON "ResourceClick"("resourceId", "createdAt");
