-- AlterTable
ALTER TABLE "ResourceSubmission" ADD COLUMN "assetType" TEXT;

-- CreateTable
CREATE TABLE "ResourceTag" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "label" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "_ResourceSubmissionToResourceTag" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,
    CONSTRAINT "_ResourceSubmissionToResourceTag_A_fkey" FOREIGN KEY ("A") REFERENCES "ResourceSubmission" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "_ResourceSubmissionToResourceTag_B_fkey" FOREIGN KEY ("B") REFERENCES "ResourceTag" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "ResourceTag_slug_key" ON "ResourceTag"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "_ResourceSubmissionToResourceTag_AB_unique" ON "_ResourceSubmissionToResourceTag"("A", "B");

-- CreateIndex
CREATE INDEX "_ResourceSubmissionToResourceTag_B_index" ON "_ResourceSubmissionToResourceTag"("B");
