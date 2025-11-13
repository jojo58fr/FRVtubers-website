-- CreateEnum not needed for SQLite (handled by Prisma as TEXT)
ALTER TABLE "User" ADD COLUMN "adminRole" TEXT NOT NULL DEFAULT 'MEMBER';

